import { NextRequest, NextResponse } from 'next/server'
import { calculateMonthlyPricing } from '@/lib/stripe-helpers'

async function handleRequest(groupId: string) {
  try {
    const pricing = await calculateMonthlyPricing(groupId)

    const discountedUnitPrice = pricing.brandCount > 0
      ? Math.round(pricing.discountedSubtotalCents / pricing.brandCount)
      : pricing.unitPriceCents

    return NextResponse.json({
      hasDiscount: pricing.discountAmountCents > 0,
      subscriptionStatus: pricing.subscriptionStatus,
      baseUnitPrice: pricing.unitPriceCents,
      baseTotal: pricing.subtotalCents,
      discountedUnitPrice,
      discountedTotal: pricing.discountedSubtotalCents,
      discountAmount: pricing.discountAmountCents,
      discountPercent: pricing.discountPercent,
      currency: pricing.currency,
      couponName: pricing.couponName,
    })
  } catch {
    return NextResponse.json({
      hasDiscount: false,
      subscriptionStatus: null,
      error: 'No subscription found',
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get('groupId')
    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 })
    }
    return handleRequest(groupId)
  } catch (error: any) {
    console.error('Error getting subscription discount:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    let groupId: string | null = null

    try {
      const body = await request.json()
      groupId = body?.groupId
    } catch {
      groupId = request.nextUrl.searchParams.get('groupId')
    }

    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 })
    }

    return handleRequest(groupId)
  } catch (error: any) {
    console.error('Error getting subscription discount:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
