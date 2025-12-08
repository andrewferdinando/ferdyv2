import { NextRequest, NextResponse } from 'next/server'
import { updateSubscriptionQuantity } from '@/lib/stripe-helpers'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { groupId, brandCount } = body

    if (!groupId || typeof brandCount !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify group exists and has a subscription
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, stripe_subscription_id')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    if (!group.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Group does not have an active subscription' },
        { status: 400 }
      )
    }

    // Update subscription quantity
    const result = await updateSubscriptionQuantity({
      groupId,
      newBrandCount: brandCount,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in update-quantity API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
