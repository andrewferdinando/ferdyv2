import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { couponCode, brandCount = 1 } = body

    // Get base price from Stripe price object
    const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!.trim())
    const baseUnitPrice = price.unit_amount || STRIPE_CONFIG.pricePerBrand
    const currency = price.currency || STRIPE_CONFIG.currency

    // Calculate base total
    const baseTotal = baseUnitPrice * brandCount

    // If no coupon provided, return base pricing
    if (!couponCode) {
      return NextResponse.json({
        valid: true,
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

    // Try to find the coupon - first try as a promotion code, then as a coupon ID
    let coupon: Stripe.Coupon | null = null
    let promoCode: Stripe.PromotionCode | null = null
    const trimmedCode = couponCode.trim()

    // First, try to find as a promotion code (customer-facing codes)
    try {
      const promoCodes = await stripe.promotionCodes.list({
        code: trimmedCode,
        active: true,
        limit: 1,
        expand: ['data.coupon'],
      })

      if (promoCodes.data.length > 0) {
        promoCode = promoCodes.data[0]
        // The coupon is expanded on the promotion code
        coupon = (promoCode as any).coupon as Stripe.Coupon
        console.log('Found promotion code:', promoCode.code, 'with coupon:', coupon.id)
      }
    } catch (promoError) {
      console.log('Not a promotion code, trying as coupon ID...')
    }

    // If not found as promotion code, try as a direct coupon ID
    if (!coupon) {
      try {
        coupon = await stripe.coupons.retrieve(trimmedCode)
        console.log('Found coupon directly:', coupon.id)
      } catch (couponError) {
        console.log('Coupon not found:', trimmedCode)
        return NextResponse.json({
          valid: false,
          error: 'Invalid coupon code',
        })
      }
    }

    // Check if coupon is valid
    if (!coupon.valid) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon is no longer valid',
      })
    }

    // Calculate discount
    let discountAmount = 0
    let discountPercent = 0
    let discountedTotal = baseTotal

    console.log('Coupon details:', {
      id: coupon.id,
      percent_off: coupon.percent_off,
      amount_off: coupon.amount_off,
      duration: coupon.duration,
    })

    if (coupon.percent_off) {
      discountPercent = coupon.percent_off
      discountAmount = Math.round(baseTotal * (coupon.percent_off / 100))
      discountedTotal = baseTotal - discountAmount
    } else if (coupon.amount_off) {
      // amount_off is in cents and applies once to the invoice
      discountAmount = coupon.amount_off
      discountedTotal = Math.max(0, baseTotal - discountAmount)
      discountPercent = Math.round((discountAmount / baseTotal) * 100)
    }

    const discountedUnitPrice = Math.round(discountedTotal / brandCount)

    console.log('Calculated pricing:', {
      baseUnitPrice,
      discountAmount,
      discountPercent,
      discountedUnitPrice,
    })

    return NextResponse.json({
      valid: true,
      baseUnitPrice,
      baseTotal,
      discountedUnitPrice,
      discountedTotal,
      discountAmount,
      discountPercent,
      currency,
      couponName: coupon.name || promoCode?.code || trimmedCode,
      couponDuration: coupon.duration,
      couponDurationMonths: coupon.duration_in_months,
    })
  } catch (error: any) {
    console.error('Error validating coupon:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
