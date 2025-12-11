import { NextRequest, NextResponse } from 'next/server'
import { createStripeSubscription } from '@/lib/stripe-helpers'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { groupId, groupName, email, countryCode, brandCount } = body

    if (!groupId || !groupName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get group to check if subscription already exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, stripe_customer_id, stripe_subscription_id, subscription_status')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // If subscription already exists and is incomplete, retrieve the existing PaymentIntent
    if (group.stripe_subscription_id && group.subscription_status === 'incomplete') {
      console.log('Subscription already exists, retrieving existing PaymentIntent...')
      
      try {
        // Get the subscription
        const subscription = await stripe.subscriptions.retrieve(group.stripe_subscription_id)
        
        // Get the latest invoice
        const invoiceId = typeof subscription.latest_invoice === 'string'
          ? subscription.latest_invoice
          : (subscription.latest_invoice as any)?.id

        if (!invoiceId) {
          throw new Error('No invoice found on subscription')
        }

        // Retrieve the invoice
        const invoice = await stripe.invoices.retrieve(invoiceId)
        
        // Get the payment intent
        const paymentIntentId = typeof (invoice as any).payment_intent === 'string'
          ? (invoice as any).payment_intent
          : (invoice as any).payment_intent?.id

        if (!paymentIntentId) {
          throw new Error('No payment intent found on invoice')
        }

        // Retrieve the payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
        
        if (!paymentIntent.client_secret) {
          throw new Error('No client_secret found on PaymentIntent')
        }

        console.log('Successfully retrieved existing PaymentIntent')
        return NextResponse.json({
          customerId: group.stripe_customer_id,
          subscriptionId: group.stripe_subscription_id,
          clientSecret: paymentIntent.client_secret,
        })
      } catch (retrieveError: any) {
        console.error('Error retrieving existing subscription:', retrieveError)
        // If we can't retrieve the existing subscription, fall through to create a new one
        console.log('Falling back to creating new subscription...')
      }
    }

    // Create new Stripe subscription
    console.log('Creating new Stripe subscription...')
    const result = await createStripeSubscription({
      groupId,
      groupName,
      email,
      countryCode,
      brandCount: brandCount || 1,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in get-or-create-payment-setup API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
