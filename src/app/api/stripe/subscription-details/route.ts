import { NextRequest, NextResponse } from 'next/server'
import { getSubscriptionDetails } from '@/lib/stripe-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json(
        { error: 'Missing groupId parameter' },
        { status: 400 }
      )
    }

    const details = await getSubscriptionDetails(groupId)

    return NextResponse.json(details)
  } catch (error: any) {
    console.error('Error in subscription-details API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
