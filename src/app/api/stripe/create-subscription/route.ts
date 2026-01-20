import { NextRequest, NextResponse } from 'next/server'
import { createStripeSubscription } from '@/lib/stripe-helpers'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { groupId, groupName, email, countryCode, brandCount, couponCode } = body

    if (!groupId || !groupName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify group exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Create Stripe subscription
    const result = await createStripeSubscription({
      groupId,
      groupName,
      email,
      countryCode,
      brandCount: brandCount || 1,
      couponCode,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in create-subscription API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
