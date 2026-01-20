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
    const { groupId, groupName, email, countryCode, brandCount, couponCode } = body

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
        
        // Get or create the payment intent
        let paymentIntent
        const paymentIntentId = typeof (invoice as any).payment_intent === 'string'
          ? (invoice as any).payment_intent
          : (invoice as any).payment_intent?.id

        if (!paymentIntentId) {
          // No PaymentIntent exists on invoice
          // Finalize the invoice if it's not already finalized - this creates a PaymentIntent
          console.log('No PaymentIntent on invoice, finalizing invoice...')
          
          if (invoice.status === 'draft') {
            const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoiceId)
            const finalizedPaymentIntentId = typeof (finalizedInvoice as any).payment_intent === 'string'
              ? (finalizedInvoice as any).payment_intent
              : (finalizedInvoice as any).payment_intent?.id
            
            if (!finalizedPaymentIntentId) {
              throw new Error('Failed to create PaymentIntent via invoice finalization')
            }
            
            paymentIntent = await stripe.paymentIntents.retrieve(finalizedPaymentIntentId)
            console.log('Invoice finalized, PaymentIntent created:', {
              id: paymentIntent.id,
              status: paymentIntent.status
            })
          } else {
            // Invoice is already finalized but has no payment_intent
            // This shouldn't happen, but create a standalone PaymentIntent as fallback
            console.log('Invoice already finalized but no PaymentIntent, creating standalone...')
            paymentIntent = await stripe.paymentIntents.create({
              amount: invoice.amount_due,
              currency: invoice.currency,
              customer: invoice.customer as string,
              metadata: {
                invoice_id: invoice.id,
                subscription_id: subscription.id,
                group_id: groupId
              },
              automatic_payment_methods: {
                enabled: true,
              },
            })
            console.log('Standalone PaymentIntent created:', {
              id: paymentIntent.id,
              status: paymentIntent.status
            })
          }
        } else {
          // Retrieve the existing payment intent
          paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
          console.log('Retrieved existing PaymentIntent:', {
            id: paymentIntent.id,
            status: paymentIntent.status
          })
        }
        
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
      couponCode,
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
