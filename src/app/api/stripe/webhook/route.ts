import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { sendInvoicePaid, sendPaymentFailed, sendSubscriptionCancelled } from '@/lib/emails/send'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  // Initialize webhook secret lazily (not at module load time)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || ''
  
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

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
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
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId)

  if (error) {
    console.error('Error updating group:', error)
  }

  console.log(`Updated group ${groupId} subscription status to: ${subscription.status}`)
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
      subscription_status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId)

  if (error) {
    console.error('Error updating group:', error)
  }

  console.log(`Subscription canceled for group ${groupId}`)

  // Send cancellation email
  try {
    const customerId = subscription.customer as string
    const customer = await stripe.customers.retrieve(customerId)
    const email = (customer as Stripe.Customer).email

    // Get group name
    const { data: groupData } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single()

    if (email && groupData) {
      await sendSubscriptionCancelled({
        to: email,
        groupName: groupData.name,
      })
    }
  } catch (emailError) {
    console.error('Failed to send subscription cancelled email:', emailError)
  }
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
    
    // Get brand count for the group
    const { data: brands } = await supabase
      .from('brands')
      .select('id')
      .eq('group_id', group.id)
      .eq('status', 'active')
    
    const brandCount = brands?.length || 1
    
    // Format billing period dates from line item (more accurate than invoice.period_start/end)
    const dateFormat: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
    let periodStart: string
    let periodEnd: string

    // Get the billing period from the first line item (subscription line items have the actual billing period)
    const firstLineItem = invoice.lines?.data?.[0]
    if (firstLineItem?.period) {
      periodStart = new Date(firstLineItem.period.start * 1000).toLocaleDateString('en-US', dateFormat)
      periodEnd = new Date(firstLineItem.period.end * 1000).toLocaleDateString('en-US', dateFormat)
    } else {
      // Fallback to invoice period (may be same date for non-subscription invoices)
      periodStart = invoice.period_start
        ? new Date(invoice.period_start * 1000).toLocaleDateString('en-US', dateFormat)
        : new Date().toLocaleDateString('en-US', dateFormat)
      periodEnd = invoice.period_end
        ? new Date(invoice.period_end * 1000).toLocaleDateString('en-US', dateFormat)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', dateFormat)
    }
    
    if (email) {
      await sendInvoicePaid({
        to: email,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        planName: 'Ferdy monthly subscription',
        brandCount,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        invoiceUrl: invoice.hosted_invoice_url || '',
      })
    }
  } catch (emailError) {
    console.error('Failed to send invoice paid email:', emailError)
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // This handles standalone PaymentIntents that aren't automatically linked to invoices
  // Check if this PaymentIntent has invoice/subscription metadata
  const invoiceId = paymentIntent.metadata.invoice_id
  const subscriptionId = paymentIntent.metadata.subscription_id
  const groupId = paymentIntent.metadata.group_id

  console.log('PaymentIntent succeeded:', {
    id: paymentIntent.id,
    invoice_id: invoiceId,
    subscription_id: subscriptionId,
    group_id: groupId
  })

  if (!invoiceId || !subscriptionId || !groupId) {
    console.log('PaymentIntent has no invoice/subscription metadata, skipping')
    return
  }

  try {
    // Mark the invoice as paid
    await stripe.invoices.pay(invoiceId, {
      paid_out_of_band: true
    })
    console.log(`Invoice ${invoiceId} marked as paid`)

    // Retrieve the subscription to check its status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    console.log(`Subscription ${subscriptionId} status: ${subscription.status}`)

    // Update group subscription status
    const { error } = await supabase
      .from('groups')
      .update({
        subscription_status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', groupId)

    if (error) {
      console.error('Error updating group subscription status:', error)
    } else {
      console.log(`Updated group ${groupId} subscription status to: ${subscription.status}`)
    }

    // Note: Don't send email here - the invoice.paid webhook will handle that
    // to avoid duplicate emails
  } catch (error: any) {
    console.error('Error processing PaymentIntent success:', error)
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
      await sendPaymentFailed({
        to: email,
        amount: invoice.amount_due,
        currency: invoice.currency,
        invoiceUrl: invoice.hosted_invoice_url || '',
      })
    }
  } catch (emailError) {
    console.error('Failed to send payment failed email:', emailError)
  }
}
