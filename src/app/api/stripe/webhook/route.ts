import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { sendInvoicePaidEmail, sendPaymentFailedEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!.trim()

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const groupId = subscription.metadata.group_id

  if (!groupId) {
    console.error('No group_id in subscription metadata')
    return
  }

  // Update group with subscription status
  const { error } = await supabase
    .from('groups')
    .update({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId)

  if (error) {
    console.error('Error updating group:', error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const groupId = subscription.metadata.group_id

  if (!groupId) {
    console.error('No group_id in subscription metadata')
    return
  }

  // Mark subscription as cancelled (but don't delete the group)
  const { error } = await supabase
    .from('groups')
    .update({
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId)

  if (error) {
    console.error('Error updating group:', error)
  }

  // TODO: Send email notification about subscription cancellation
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Get group by customer ID
  const { data: group } = await supabase
    .from('groups')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!group) {
    console.error('Group not found for customer:', customerId)
    return
  }

  // Send email receipt
  console.log(`Invoice paid for group ${group.name}:`, invoice.id)
  
  try {
    const customer = await stripe.customers.retrieve(customerId)
    const email = (customer as Stripe.Customer).email
    
    if (email) {
      await sendInvoicePaidEmail(
        email,
        group.name,
        invoice.amount_paid,
        invoice.hosted_invoice_url || ''
      )
    }
  } catch (emailError) {
    console.error('Failed to send invoice paid email:', emailError)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Get group by customer ID
  const { data: group } = await supabase
    .from('groups')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!group) {
    console.error('Group not found for customer:', customerId)
    return
  }

  // Send email notification about payment failure
  console.log(`Payment failed for group ${group.name}:`, invoice.id)
  
  try {
    const customer = await stripe.customers.retrieve(customerId)
    const email = (customer as Stripe.Customer).email
    
    if (email) {
      await sendPaymentFailedEmail(
        email,
        group.name,
        invoice.amount_due
      )
    }
  } catch (emailError) {
    console.error('Failed to send payment failed email:', emailError)
  }
}
