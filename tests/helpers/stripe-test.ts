/**
 * Stripe test helpers — create/cleanup Stripe test objects for E2E tests.
 * Uses the STRIPE_SECRET_KEY from .env.test (test mode only).
 */
import Stripe from 'stripe'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') })

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!
if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_test_')) {
  throw new Error('STRIPE_SECRET_KEY must be a test mode key (sk_test_...)')
}

export const stripeTest = new Stripe(stripeSecretKey)

// Cache for the test price ID (created once per test run)
let testPriceId: string | null = null
let testProductId: string | null = null

/**
 * Get or create a test mode product + price.
 * Reuses existing test product if found, otherwise creates one.
 */
export async function getOrCreateTestPrice(): Promise<string> {
  if (testPriceId) return testPriceId

  // Check for existing test product
  const products = await stripeTest.products.list({ limit: 10 })
  let product = products.data.find(p => p.metadata?.pw_test === 'true' && p.active)

  if (!product) {
    product = await stripeTest.products.create({
      name: 'PW Test - Ferdy Monthly (per brand)',
      metadata: { pw_test: 'true' },
    })
  }
  testProductId = product.id

  // Check for existing price on this product
  const prices = await stripeTest.prices.list({ product: product.id, active: true, limit: 5 })
  let price = prices.data.find(p => p.unit_amount === 14700 && p.currency === 'nzd')

  if (!price) {
    price = await stripeTest.prices.create({
      product: product.id,
      unit_amount: 14700, // $147.00 NZD
      currency: 'nzd',
      recurring: { interval: 'month' },
    })
  }
  testPriceId = price.id
  return testPriceId
}

/**
 * Create a Stripe coupon for testing.
 */
export async function createTestCoupon(percentOff: number, name?: string): Promise<Stripe.Coupon> {
  return stripeTest.coupons.create({
    percent_off: percentOff,
    duration: 'forever',
    name: name || `PW Test ${percentOff}% Off`,
  })
}

/**
 * Create a Stripe customer + subscription with optional coupon.
 * Uses a test payment method to create an active subscription.
 */
export async function createTestSubscription(opts: {
  email: string
  name: string
  brandCount: number
  couponId?: string
  countryCode?: string
}): Promise<{
  customer: Stripe.Customer
  subscription: Stripe.Subscription
}> {
  const priceId = await getOrCreateTestPrice()

  // Create customer
  const customer = await stripeTest.customers.create({
    email: opts.email,
    name: opts.name,
    ...(opts.countryCode ? { address: { country: opts.countryCode } } : {}),
    metadata: { pw_test: 'true' },
  })

  // Attach a test payment method (Stripe's test token for Visa 4242)
  const paymentMethod = await stripeTest.paymentMethods.create({
    type: 'card',
    card: { token: 'tok_visa' },
  })
  await stripeTest.paymentMethods.attach(paymentMethod.id, { customer: customer.id })
  await stripeTest.customers.update(customer.id, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  })

  // Create subscription params
  const subParams: Stripe.SubscriptionCreateParams = {
    customer: customer.id,
    items: [{ price: priceId, quantity: opts.brandCount }],
    default_payment_method: paymentMethod.id,
    metadata: { pw_test: 'true' },
  }

  // Apply coupon
  if (opts.couponId) {
    subParams.discounts = [{ coupon: opts.couponId }]
  }

  const subscription = await stripeTest.subscriptions.create(subParams)

  return { customer, subscription }
}

/**
 * Clean up Stripe test objects.
 */
export async function cleanupStripeTest(opts: {
  subscriptionId?: string
  customerId?: string
  couponId?: string
}) {
  if (opts.subscriptionId) {
    try {
      await stripeTest.subscriptions.cancel(opts.subscriptionId)
    } catch (e) {
      console.warn('Failed to cancel test subscription:', (e as Error).message)
    }
  }
  if (opts.customerId) {
    try {
      await stripeTest.customers.del(opts.customerId)
    } catch (e) {
      console.warn('Failed to delete test customer:', (e as Error).message)
    }
  }
  if (opts.couponId) {
    try {
      await stripeTest.coupons.del(opts.couponId)
    } catch (e) {
      console.warn('Failed to delete test coupon:', (e as Error).message)
    }
  }
}
