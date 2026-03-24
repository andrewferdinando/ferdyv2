import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function handleRequest(groupId: string) {
  // Get group's subscription ID
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('stripe_subscription_id')
    .eq('id', groupId)
    .single()

  if (groupError || !group?.stripe_subscription_id) {
    return NextResponse.json({
      hasDiscount: false,
      subscriptionStatus: null,
      error: 'No subscription found',
    })
  }

  // Retrieve the subscription with discount + invoice data (same expand as billing page)
  const subscription = await stripe.subscriptions.retrieve(
    group.stripe_subscription_id,
    {
      expand: ['discount.coupon', 'discounts.coupon', 'latest_invoice'],
    }
  )

  // Get base price from Stripe
  const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!.trim())
  const baseUnitPrice = price.unit_amount || STRIPE_CONFIG.pricePerBrand
  const currency = price.currency || STRIPE_CONFIG.currency

  // Get brand count from subscription quantity
  const brandCount = subscription.items.data[0]?.quantity || 1
  const baseTotal = baseUnitPrice * brandCount

  // --- Resolve coupon from subscription discount fields ---
  let coupon: any = null

  // Try subscription.discounts (plural, newer API)
  const discountsArray = subscription.discounts
  if (discountsArray && discountsArray.length > 0) {
    const first = discountsArray[0]
    coupon = typeof first === 'string' ? null : (first as any).coupon
    // If coupon is a string ID (unexpanded), fetch it
    if (typeof coupon === 'string') {
      coupon = await stripe.coupons.retrieve(coupon)
    }
  }

  // Try subscription.discount (singular, legacy)
  if (!coupon) {
    const legacyDiscount = (subscription as any).discount
    if (legacyDiscount && typeof legacyDiscount !== 'string') {
      coupon = legacyDiscount.coupon
      if (typeof coupon === 'string') {
        coupon = await stripe.coupons.retrieve(coupon)
      }
    }
  }

  // --- Fallback: check invoice for discount amounts (most reliable source) ---
  const latestInvoice = subscription.latest_invoice as any
  const invoiceDiscountAmount = latestInvoice?.total_discount_amounts?.[0]?.amount || 0

  if (!coupon && invoiceDiscountAmount <= 0) {
    return NextResponse.json({
      hasDiscount: false,
      subscriptionStatus: subscription.status,
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

  // Calculate discount — prefer coupon data, fall back to invoice amounts
  let discountAmount = 0
  let discountPercent = 0
  let discountedTotal = baseTotal
  let couponName: string | null = null
  let couponDuration: string | null = null
  let couponDurationMonths: number | null = null

  if (coupon?.percent_off) {
    discountPercent = coupon.percent_off
    discountAmount = Math.round(baseTotal * (coupon.percent_off / 100))
    discountedTotal = baseTotal - discountAmount
    couponName = coupon.name || coupon.id
    couponDuration = coupon.duration
    couponDurationMonths = coupon.duration_in_months
  } else if (coupon?.amount_off) {
    discountAmount = coupon.amount_off
    discountedTotal = Math.max(0, baseTotal - discountAmount)
    discountPercent = Math.round((discountAmount / baseTotal) * 100)
    couponName = coupon.name || coupon.id
    couponDuration = coupon.duration
    couponDurationMonths = coupon.duration_in_months
  } else if (invoiceDiscountAmount > 0) {
    // No coupon object but invoice shows a discount — back-calculate
    discountAmount = invoiceDiscountAmount
    discountedTotal = Math.max(0, baseTotal - discountAmount)
    discountPercent = Math.round((discountAmount / baseTotal) * 100)
    // Try to get coupon name from invoice discount metadata
    const invoiceDiscount = latestInvoice?.discounts?.[0]
    if (invoiceDiscount && typeof invoiceDiscount !== 'string') {
      couponName = (invoiceDiscount as any).coupon?.name || (invoiceDiscount as any).coupon?.id || null
    }
  }

  const discountedUnitPrice = Math.round(discountedTotal / brandCount)

  return NextResponse.json({
    hasDiscount: true,
    subscriptionStatus: subscription.status,
    baseUnitPrice,
    baseTotal,
    discountedUnitPrice,
    discountedTotal,
    discountAmount,
    discountPercent,
    currency,
    couponName,
    couponDuration,
    couponDurationMonths,
  })
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

    // Try to parse body, fall back to query params
    try {
      const body = await request.json()
      groupId = body?.groupId
    } catch {
      // Body parsing failed — check query params as fallback
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
