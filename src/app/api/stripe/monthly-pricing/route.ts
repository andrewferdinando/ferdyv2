import { NextRequest, NextResponse } from 'next/server'
import { calculateMonthlyPricing } from '@/lib/stripe-helpers'

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get('groupId')
    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 })
    }

    const pricing = await calculateMonthlyPricing(groupId)
    return NextResponse.json(pricing)
  } catch (error: any) {
    console.error('Error in monthly-pricing API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
