import { NextRequest, NextResponse } from 'next/server'
import { createBillingPortalSession } from '@/lib/stripe-helpers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { groupId, returnUrl } = body

    if (!groupId || !returnUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await createBillingPortalSession(groupId, returnUrl)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in billing-portal API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
