import { stripe, STRIPE_CONFIG } from './stripe'
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
}

export interface UpdateSubscriptionQuantityParams {
  groupId: string
  newBrandCount: number
}

/**
 * Create a Stripe customer and subscription for a new group
 */
export async function createStripeSubscription(params: CreateSubscriptionParams) {
  const { groupId, groupName, email, countryCode, brandCount = 1 } = params

  try {
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: groupName,
      metadata: {
        group_id: groupId,
      },
    })

    // Create subscription with quantity = brand count
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: process.env.STRIPE_PRICE_ID!.trim(),
          quantity: brandCount,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        group_id: groupId,
      },
    })

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

    // Extract client secret
    const latestInvoice = subscription.latest_invoice as any
    const paymentIntent = latestInvoice?.payment_intent
    const clientSecret = paymentIntent?.client_secret

    console.log('Stripe subscription created:', {
      subscriptionId: subscription.id,
      hasLatestInvoice: !!latestInvoice,
      hasPaymentIntent: !!paymentIntent,
      hasClientSecret: !!clientSecret,
      clientSecret: clientSecret || 'MISSING'
    })

    if (!clientSecret) {
      console.error('Missing client secret! Full subscription object:', JSON.stringify(subscription, null, 2))
      throw new Error('Failed to get client secret from Stripe subscription')
    }

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
