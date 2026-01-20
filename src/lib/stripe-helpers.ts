import { stripe, STRIPE_CONFIG } from './stripe'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: groupName,
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
        payment_method_types: ['card']
      },
      metadata: {
        group_id: groupId,
      },
    }

    // Add coupon if provided
    if (couponCode) {
      subscriptionParams.coupon = couponCode.trim()
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
      .select('stripe_subscription_id, stripe_customer_id, price_per_brand_cents, currency')
      .eq('id', groupId)
      .single()

    if (groupError || !group?.stripe_subscription_id) {
      throw new Error('Group or subscription not found')
    }

    const subscription = await stripe.subscriptions.retrieve(group.stripe_subscription_id, {
      expand: ['latest_invoice', 'default_payment_method'],
    })

    const customer = await stripe.customers.retrieve(group.stripe_customer_id!)

    return {
      subscription,
      customer,
      pricePerBrand: group.price_per_brand_cents,
      currency: group.currency,
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
