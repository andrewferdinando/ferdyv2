import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { groupId } = body

    if (!groupId) {
      return NextResponse.json(
        { error: 'Missing groupId' },
        { status: 400 }
      )
    }

    // Get group's subscription ID
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('stripe_subscription_id')
      .eq('id', groupId)
      .single()

    if (groupError || !group?.stripe_subscription_id) {
      return NextResponse.json({
        hasDiscount: false,
        error: 'No subscription found',
      })
    }

    // Retrieve the subscription with discount info
    const subscription = await stripe.subscriptions.retrieve(
      group.stripe_subscription_id,
      {
        expand: ['discounts.coupon'],
      }
    )

    // Get base price from Stripe
    const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!.trim())
    const baseUnitPrice = price.unit_amount || STRIPE_CONFIG.pricePerBrand
    const currency = price.currency || STRIPE_CONFIG.currency

    // Get brand count from subscription quantity
    const brandCount = subscription.items.data[0]?.quantity || 1
    const baseTotal = baseUnitPrice * brandCount

    // Check if subscription has discounts
    const discounts = subscription.discounts
    console.log('Subscription details:', {
      id: subscription.id,
      status: subscription.status,
      discounts: discounts,
      discountsLength: discounts?.length || 0,
    })

    if (!discounts || discounts.length === 0) {
      console.log('No discounts on subscription')
      return NextResponse.json({
        hasDiscount: false,
        baseUnitPrice,
        baseTotal,
        discountedUnitPrice: baseUnitPrice,
        discountedTotal: baseTotal,
        discountAmount: 0,
        discountPercent: 0,
        currency,
        couponName: null,
      })
    }

    // Get the first discount (typically there's only one)
    const discount = discounts[0]
    const coupon = typeof discount === 'string' ? null : (discount as any).coupon

    if (!coupon) {
      console.log('Discount has no coupon attached')
      return NextResponse.json({
        hasDiscount: false,
        baseUnitPrice,
        baseTotal,
        discountedUnitPrice: baseUnitPrice,
        discountedTotal: baseTotal,
        discountAmount: 0,
        discountPercent: 0,
        currency,
        couponName: null,
      })
    }
    console.log('Found discount on subscription:', {
      couponId: coupon.id,
      percent_off: coupon.percent_off,
      amount_off: coupon.amount_off,
      duration: coupon.duration,
    })

    // Calculate discount
    let discountAmount = 0
    let discountPercent = 0
    let discountedTotal = baseTotal

    if (coupon.percent_off) {
      discountPercent = coupon.percent_off
      discountAmount = Math.round(baseTotal * (coupon.percent_off / 100))
      discountedTotal = baseTotal - discountAmount
    } else if (coupon.amount_off) {
      discountAmount = coupon.amount_off
      discountedTotal = Math.max(0, baseTotal - discountAmount)
      discountPercent = Math.round((discountAmount / baseTotal) * 100)
    }

    const discountedUnitPrice = Math.round(discountedTotal / brandCount)

    return NextResponse.json({
      hasDiscount: true,
      baseUnitPrice,
      baseTotal,
      discountedUnitPrice,
      discountedTotal,
      discountAmount,
      discountPercent,
      currency,
      couponName: coupon.name || coupon.id,
      couponDuration: coupon.duration,
      couponDurationMonths: coupon.duration_in_months,
    })
  } catch (error: any) {
    console.error('Error getting subscription discount:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
