/**
 * Script to create Stripe webhook endpoint
 * Run with: npx tsx scripts/setup-stripe-webhook.ts
 */

import { stripe } from '../src/lib/stripe'

async function setupWebhook() {
  console.log('🚀 Setting up Stripe webhook...\n')

  const webhookUrl = process.env.WEBHOOK_URL || 'https://www.ferdy.io/api/stripe/webhook'

  console.log(`Webhook URL: ${webhookUrl}\n`)

  try {
    // Check if webhook already exists
    const existingWebhooks = await stripe.webhookEndpoints.list()
    const existing = existingWebhooks.data.find((wh) => wh.url === webhookUrl)

    if (existing) {
      console.log(`✅ Webhook already exists: ${existing.id}`)
      console.log(`   URL: ${existing.url}`)
      console.log(`   Status: ${existing.status}`)
      console.log(`\n⚠️  Webhook secret is not shown for existing webhooks`)
      console.log(`   If you need the secret, delete the webhook and run this script again`)
      return
    }

    // Create webhook
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.paid',
        'invoice.payment_failed',
      ],
    })

    console.log(`✅ Created webhook: ${webhook.id}`)
    console.log(`   URL: ${webhook.url}`)
    console.log(`   Status: ${webhook.status}`)
    console.log(`\n📋 Add this to your .env.local file:`)
    console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`)

    console.log('\n✨ Webhook setup complete!')
  } catch (error: any) {
    console.error('❌ Error setting up webhook:', error.message)
    throw error
  }
}

setupWebhook()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
