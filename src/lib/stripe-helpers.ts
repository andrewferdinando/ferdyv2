import { stripe, STRIPE_CONFIG, GST_COUNTRY_CODE, getGstTaxRateId } from './stripe'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Resolve the coupon from a Stripe subscription, handling both the newer
 * `discounts` (plural) array and the legacy `discount` (singular) field.
 * The subscription should be retrieved with expand: ['discounts.coupon', 'discount.coupon'].
 * If the coupon is an unexpanded string ID, fetches it from Stripe directly.
 */
export async function resolveSubscriptionCoupon(subscription: Stripe.Subscription): Promise<{
  percentOff: number | null
  amountOff: number | null
  name: string | null
}> {
  let coupon: any = null

  // Try subscription.discounts (plural, newer Stripe API)
  const discountsArray = subscription.discounts
  if (discountsArray && discountsArray.length > 0) {
    const first = discountsArray[0] as any
    if (typeof first !== 'string') {
      // Expanded discount object — coupon may be at .coupon or .source.coupon
      coupon = first.coupon ?? first.source?.coupon ?? null
    }
  }

  // Fall back to subscription.discount (singular, legacy API)
  if (!coupon) {
    const legacyDiscount = (subscription as any).discount
    if (legacyDiscount && typeof legacyDiscount !== 'string') {
      coupon = legacyDiscount.coupon ?? legacyDiscount.source?.coupon ?? null
    }
  }

  // If coupon is a string ID (not expanded), fetch it from Stripe
  if (typeof coupon === 'string') {
    try {
      coupon = await stripe.coupons.retrieve(coupon)
    } catch {
      coupon = null
    }
  }

  if (!coupon || typeof coupon === 'string') {
    return { percentOff: null, amountOff: null, name: null }
  }

  return {
    percentOff: coupon.percent_off ?? null,
    amountOff: coupon.amount_off ?? null,
    name: coupon.name || coupon.id || null,
  }
}

/**
 * Canonical monthly pricing calculation. Every surface that displays recurring
 * pricing (billing page, add-brand modal, email notifications) must use this
 * function so numbers are always consistent.
 *
 * All monetary values are returned in **cents** (integers).
 */
export interface MonthlyPricing {
  unitPriceCents: number
  brandCount: number
  subtotalCents: number
  discountPercent: number
  discountAmountCents: number
  couponName: string | null
  discountedSubtotalCents: number
  isNz: boolean
  gstAmountCents: number
  totalWithGstCents: number
  currency: string
  subscriptionStatus: string
  currentPeriodEnd: number
}

export async function calculateMonthlyPricing(groupId: string): Promise<MonthlyPricing> {
  // 1. Get group data (subscription ID + country for GST)
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('stripe_subscription_id, country_code')
    .eq('id', groupId)
    .single()

  if (groupError || !group?.stripe_subscription_id) {
    throw new Error('Group or subscription not found')
  }

  // 2. Fetch canonical unit price from Stripe
  const stripePrice = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!.trim())
  const unitPriceCents = stripePrice.unit_amount || STRIPE_CONFIG.pricePerBrand
  const currency = stripePrice.currency || STRIPE_CONFIG.currency

  // 3. Fetch subscription with coupon expansion
  const subscription = await stripe.subscriptions.retrieve(group.stripe_subscription_id, {
    expand: ['discounts.coupon', 'discount.coupon'],
  })

  // 4. Brand count from subscription quantity
  const brandCount = subscription.items.data[0]?.quantity || 1

  // 5. Calculate subtotal
  const subtotalCents = unitPriceCents * brandCount

  // 6. Resolve coupon
  const resolved = await resolveSubscriptionCoupon(subscription)

  let discountPercent = 0
  let discountAmountCents = 0
  let couponName: string | null = resolved.name

  if (resolved.percentOff) {
    discountPercent = resolved.percentOff
    discountAmountCents = Math.round(subtotalCents * (resolved.percentOff / 100))
  } else if (resolved.amountOff) {
    discountAmountCents = resolved.amountOff
    discountPercent = subtotalCents > 0 ? Math.round((resolved.amountOff / subtotalCents) * 100) : 0
  }

  // 7. Apply discount
  const discountedSubtotalCents = subtotalCents - discountAmountCents

  // 8. GST for NZ groups
  const isNz = group.country_code?.toUpperCase() === 'NZ' || currency.toLowerCase() === 'nzd'
  const gstAmountCents = isNz ? Math.round(discountedSubtotalCents * 0.15) : 0
  const totalWithGstCents = discountedSubtotalCents + gstAmountCents

  return {
    unitPriceCents,
    brandCount,
    subtotalCents,
    discountPercent,
    discountAmountCents,
    couponName,
    discountedSubtotalCents,
    isNz,
    gstAmountCents,
    totalWithGstCents,
    currency,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: (subscription as any).current_period_end || 0,
  }
}

export interface CreateSubscriptionParams {
  groupId: string
  groupName: string
  email: string
  countryCode?: string
  brandCount?: number
  couponCode?: string
}

export interface UpdateSubscriptionQuantityParams {
  groupId: string
  newBrandCount: number
}

/**
 * Create a Stripe customer and subscription for a new group
 */
export async function createStripeSubscription(params: CreateSubscriptionParams) {
  const { groupId, groupName, email, countryCode, brandCount = 1, couponCode } = params

  try {
    // Create Stripe customer (include country for tax purposes)
    const customer = await stripe.customers.create({
      email,
      name: groupName,
      ...(countryCode ? { address: { country: countryCode } } : {}),
      metadata: {
        group_id: groupId,
      },
    })

    // Build subscription params
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [
        {
          price: process.env.STRIPE_PRICE_ID!.trim(),
          quantity: brandCount,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      metadata: {
        group_id: groupId,
      },
    }

    // Apply NZ GST tax rate if customer is in New Zealand
    const gstTaxRateId = getGstTaxRateId()
    if (countryCode?.toUpperCase() === GST_COUNTRY_CODE && gstTaxRateId) {
      subscriptionParams.default_tax_rates = [gstTaxRateId]
    }

    // Add coupon if provided (using discounts array for newer Stripe API)
    if (couponCode) {
      const trimmedCode = couponCode.trim()

      // First, try to find as a promotion code (customer-facing codes)
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: trimmedCode,
          active: true,
          limit: 1,
        })

        if (promoCodes.data.length > 0) {
          // Use the promotion code ID
          subscriptionParams.discounts = [{ promotion_code: promoCodes.data[0].id }]
          console.log('Applied promotion code:', promoCodes.data[0].code)
        } else {
          // Try as a direct coupon ID
          subscriptionParams.discounts = [{ coupon: trimmedCode }]
          console.log('Applied coupon ID:', trimmedCode)
        }
      } catch (promoError) {
        // If promotion code lookup fails, try as coupon ID
        console.log('Promotion code lookup failed, trying as coupon ID:', trimmedCode)
        subscriptionParams.discounts = [{ coupon: trimmedCode }]
      }
    }

    // Create subscription with payment_behavior: 'default_incomplete'
    // This creates the subscription with status=incomplete and automatically creates a PaymentIntent
    // The confirmation_secret is returned directly (no expand needed)
    const subscription = await stripe.subscriptions.create(subscriptionParams)

    console.log('Subscription created:', {
      id: subscription.id,
      status: subscription.status,
      latest_invoice: subscription.latest_invoice
    })

    // Get the invoice ID
    const invoiceId = typeof subscription.latest_invoice === 'string'
      ? subscription.latest_invoice
      : (subscription.latest_invoice as any)?.id

    if (!invoiceId) {
      throw new Error('No invoice found on subscription')
    }

    // Retrieve the invoice to get the payment_intent ID
    const invoice = await stripe.invoices.retrieve(invoiceId)
    console.log('Invoice retrieved:', {
      id: invoice.id,
      status: invoice.status,
      payment_intent: (invoice as any).payment_intent
    })

    // Check if invoice has a payment_intent
    let paymentIntent
    const existingPaymentIntentId = typeof (invoice as any).payment_intent === 'string'
      ? (invoice as any).payment_intent
      : (invoice as any).payment_intent?.id

    if (existingPaymentIntentId) {
      // PaymentIntent exists, retrieve it
      paymentIntent = await stripe.paymentIntents.retrieve(existingPaymentIntentId)
      console.log('PaymentIntent retrieved:', {
        id: paymentIntent.id,
        status: paymentIntent.status
      })
    } else {
      // No PaymentIntent exists, create one for the invoice
      console.log('No PaymentIntent on invoice, creating one...')
      paymentIntent = await stripe.paymentIntents.create({
        amount: invoice.amount_due,
        currency: invoice.currency,
        customer: invoice.customer as string,
        metadata: {
          invoice_id: invoice.id,
          group_id: groupId
        },
        automatic_payment_methods: {
          enabled: true,
        },
      })
      console.log('PaymentIntent created:', {
        id: paymentIntent.id,
        status: paymentIntent.status
      })

      // Attach the PaymentIntent to the invoice
      // This ensures that when the payment succeeds, the invoice is marked as paid
      // and the subscription becomes active
      await stripe.invoices.attachPayment(invoice.id, {
        payment_intent: paymentIntent.id
      })
      console.log('PaymentIntent attached to invoice')
    }

    const clientSecret = paymentIntent.client_secret

    if (!clientSecret) {
      throw new Error('No client_secret found on PaymentIntent')
    }

    // Update group with Stripe IDs
    const { error: updateError } = await supabase
      .from('groups')
      .update({
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: process.env.STRIPE_PRICE_ID!.trim(),
      })
      .eq('id', groupId)

    if (updateError) {
      throw new Error(`Failed to update group: ${updateError.message}`)
    }

    if (!clientSecret) {
      console.error('Missing client secret!')
      throw new Error('Failed to get client secret from Stripe')
    }

    console.log('Subscription setup complete:', {
      subscriptionId: subscription.id,
      clientSecret: 'PRESENT'
    })

    return {
      customerId: customer.id,
      subscriptionId: subscription.id,
      clientSecret,
    }
  } catch (error: any) {
    console.error('Error creating Stripe subscription:', error)
    throw error
  }
}

/**
 * Update subscription quantity when brands are added or removed
 */
export async function updateSubscriptionQuantity(params: UpdateSubscriptionQuantityParams) {
  const { groupId, newBrandCount } = params

  try {
    // Get group's subscription ID
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('stripe_subscription_id')
      .eq('id', groupId)
      .single()

    if (groupError || !group?.stripe_subscription_id) {
      throw new Error('Group or subscription not found')
    }

    // Get subscription
    const subscription = await stripe.subscriptions.retrieve(group.stripe_subscription_id)

    // Update quantity (Stripe will prorate automatically)
    await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscription.items.data[0].id,
          quantity: newBrandCount,
        },
      ],
      proration_behavior: 'create_prorations',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error updating subscription quantity:', error)
    throw error
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(groupId: string) {
  try {
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('stripe_subscription_id')
      .eq('id', groupId)
      .single()

    if (groupError || !group?.stripe_subscription_id) {
      throw new Error('Group or subscription not found')
    }

    await stripe.subscriptions.cancel(group.stripe_subscription_id)

    return { success: true }
  } catch (error: any) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

/**
 * Get subscription details
 */
export async function getSubscriptionDetails(groupId: string) {
  try {
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', groupId)
      .single()

    if (groupError || !group?.stripe_subscription_id) {
      throw new Error('Group or subscription not found')
    }

    const subscription = await stripe.subscriptions.retrieve(group.stripe_subscription_id, {
      expand: ['latest_invoice', 'default_payment_method', 'discount.coupon', 'discounts.coupon'],
    })

    const customer = await stripe.customers.retrieve(group.stripe_customer_id!)

    return {
      subscription,
      customer,
    }
  } catch (error: any) {
    console.error('Error getting subscription details:', error)
    throw error
  }
}

/**
 * Create a billing portal session for customer self-service
 */
export async function createBillingPortalSession(groupId: string, returnUrl: string) {
  try {
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('stripe_customer_id')
      .eq('id', groupId)
      .single()

    if (groupError || !group?.stripe_customer_id) {
      throw new Error('Group or customer not found')
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: group.stripe_customer_id,
      return_url: returnUrl,
    })

    return { url: session.url }
  } catch (error: any) {
    console.error('Error creating billing portal session:', error)
    throw error
  }
}
