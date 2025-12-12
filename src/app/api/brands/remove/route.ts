import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import { sendBrandDeleted } from '@/lib/emails/send'

function extractToken(request: Request) {
  const header = request.headers.get('Authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe lazily (not at module load time)
    const stripe = getStripe()
    
    const { brandId, groupId } = await request.json()

    if (!brandId || !groupId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('[remove-brand] Starting removal process:', { brandId, groupId })

    // 1. Get the current user for audit logging
    const token = extractToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      console.error('[remove-brand] Auth error:', userError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = userData.user

    // 2. Verify the brand belongs to the group
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('id, name, group_id, status')
      .eq('id', brandId)
      .eq('group_id', groupId)
      .single()

    if (brandError || !brand) {
      console.error('[remove-brand] Brand not found:', brandError)
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }

    if (brand.status === 'inactive') {
      return NextResponse.json(
        { error: 'Brand is already inactive' },
        { status: 400 }
      )
    }

    // 3. Get group's Stripe subscription details
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      console.error('[remove-brand] Group not found:', groupError)
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    if (!group.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    // 4. Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(group.stripe_subscription_id)
    
    if (!subscription || subscription.items.data.length === 0) {
      console.error('[remove-brand] No subscription items found')
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // 5. Get the subscription item (should be the first/only item)
    const subscriptionItem = subscription.items.data[0]
    const currentQuantity = subscriptionItem.quantity || 1

    if (currentQuantity <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last brand. Please cancel your subscription instead.' },
        { status: 400 }
      )
    }

    // 6. Soft-delete the brand in Supabase FIRST
    const { error: updateError } = await supabaseAdmin
      .from('brands')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', brandId)

    if (updateError) {
      console.error('[remove-brand] Failed to update brand status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update brand status' },
        { status: 500 }
      )
    }

    // 7. Count ACTUAL active brands in Supabase
    const { count: activeBrandCount, error: countError } = await supabaseAdmin
      .from('brands')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('status', 'active')

    if (countError) {
      console.error('[remove-brand] Failed to count active brands:', countError)
      return NextResponse.json(
        { error: 'Failed to count active brands' },
        { status: 500 }
      )
    }

    const newQuantity = activeBrandCount || 1
    console.log('[remove-brand] Updating Stripe subscription:', {
      subscriptionItemId: subscriptionItem.id,
      currentStripeQuantity: currentQuantity,
      actualActiveBrands: activeBrandCount,
      newQuantity
    })

    // 8. Update Stripe to match actual active brand count
    await stripe.subscriptionItems.update(subscriptionItem.id, {
      quantity: newQuantity,
      proration_behavior: 'create_prorations',
    })

    console.log('[remove-brand] Stripe subscription updated successfully')

    // 8. Deactivate brand memberships
    const { error: membershipError } = await supabaseAdmin
      .from('brand_memberships')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)

    if (membershipError) {
      console.error('[remove-brand] Failed to update brand memberships:', membershipError)
    }

    // 9. Log the action in audit table (if it exists)
    try {
      await supabaseAdmin
        .from('brand_audit_log')
        .insert({
          brand_id: brandId,
          user_id: user.id,
          action: 'removed',
          timestamp: new Date().toISOString(),
          metadata: {
            brand_name: brand.name,
            group_id: groupId,
            stripe_subscription_id: group.stripe_subscription_id,
            old_quantity: currentQuantity,
            new_quantity: newQuantity
          }
        })
    } catch (auditError) {
      // Audit logging is optional, don't fail if table doesn't exist
      console.log('[remove-brand] Audit logging skipped (table may not exist)')
    }

    console.log('[remove-brand] Brand removed successfully')

    // 10. Send email notification
    try {
      const subscription = await stripe.subscriptions.retrieve(group.stripe_subscription_id) as any
      const periodEnd = subscription?.current_period_end
        ? new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

      const { data: groupData } = await supabaseAdmin
        .from('groups')
        .select('name, price_per_brand_cents, currency')
        .eq('id', groupId)
        .single()

      if (groupData) {
        await sendBrandDeleted({
          to: user.email!,
          brandName: brand.name,
          remainingBrandCount: newQuantity,
          newMonthlyTotal: newQuantity * groupData.price_per_brand_cents,
          currency: groupData.currency || 'usd',
          billingPeriodEnd: periodEnd,
        })
      }
    } catch (emailError) {
      console.error('[remove-brand] Failed to send email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Brand removed successfully',
      newQuantity
    })

  } catch (error: any) {
    console.error('[remove-brand] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove brand' },
      { status: 500 }
    )
  }
}
