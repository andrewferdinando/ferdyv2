/**
 * Script to apply NZ GST tax rate to existing NZ-based Stripe subscriptions.
 *
 * Run the audit first: npx tsx scripts/setup-stripe-gst.ts
 * Then apply:          npx tsx scripts/apply-stripe-gst.ts <TAX_RATE_ID>
 *
 * This adds the GST tax rate as a default_tax_rate on each NZ subscription.
 * Changes take effect from the next billing cycle.
 */

import { stripe } from '../src/lib/stripe'
import Stripe from 'stripe'

const GST_COUNTRY = 'NZ'

async function applyGstToNzSubscriptions(taxRateId: string) {
  console.log('=== Apply GST to NZ Subscriptions ===\n')

  // Verify the tax rate exists and is valid
  const taxRate = await stripe.taxRates.retrieve(taxRateId)
  if (!taxRate.active) {
    throw new Error(`Tax rate ${taxRateId} is not active`)
  }
  console.log(`Using tax rate: ${taxRate.display_name} (${taxRate.percentage}%) [${taxRateId}]`)
  console.log(`  Country: ${taxRate.country}, Inclusive: ${taxRate.inclusive}\n`)

  let updated = 0
  let skipped = 0
  let errors = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params: Stripe.SubscriptionListParams = {
      status: 'active',
      limit: 100,
      expand: ['data.customer', 'data.default_tax_rates'],
    }
    if (startingAfter) {
      params.starting_after = startingAfter
    }

    const subscriptions = await stripe.subscriptions.list(params)

    for (const sub of subscriptions.data) {
      const customer = sub.customer as Stripe.Customer
      const country = customer.address?.country || null

      // Skip non-NZ customers
      if (country !== GST_COUNTRY) {
        startingAfter = sub.id
        continue
      }

      // Check if already has this tax rate
      const alreadyHas = (sub.default_tax_rates || []).some(
        (rate) => typeof rate !== 'string' && rate.id === taxRateId
      )

      if (alreadyHas) {
        console.log(`  SKIP ${sub.id} (${customer.name}) - already has GST`)
        skipped++
        startingAfter = sub.id
        continue
      }

      // Apply GST tax rate
      try {
        // Merge existing tax rate IDs with the new one
        const existingRateIds = (sub.default_tax_rates || [])
          .map((rate) => (typeof rate === 'string' ? rate : rate.id))
        const newRateIds = [...existingRateIds, taxRateId]

        await stripe.subscriptions.update(sub.id, {
          default_tax_rates: newRateIds,
        })

        const item = sub.items.data[0]
        const monthlyBase = ((item?.price?.unit_amount || 0) * (item?.quantity || 1)) / 100
        const gstAmount = monthlyBase * 0.15

        console.log(
          `  UPDATED ${sub.id} (${customer.name}) - GST applied. ` +
            `Base: $${monthlyBase.toFixed(2)}, GST: +$${gstAmount.toFixed(2)}, ` +
            `New total: $${(monthlyBase + gstAmount).toFixed(2)}/month`
        )
        updated++
      } catch (err: any) {
        console.error(`  ERROR ${sub.id} (${customer.name}): ${err.message}`)
        errors++
      }

      startingAfter = sub.id
    }

    hasMore = subscriptions.has_more
  }

  console.log('\n--- Results ---')
  console.log(`Updated: ${updated}`)
  console.log(`Skipped (already had GST): ${skipped}`)
  console.log(`Errors: ${errors}`)

  if (updated > 0) {
    console.log('\nGST will be applied from each subscription\'s next billing cycle.')
  }
}

// Parse args
const taxRateId = process.argv[2]

if (!taxRateId) {
  console.error('Usage: npx tsx scripts/apply-stripe-gst.ts <TAX_RATE_ID>')
  console.error('')
  console.error('Run "npx tsx scripts/setup-stripe-gst.ts" first to get the tax rate ID.')
  process.exit(1)
}

if (!taxRateId.startsWith('txr_')) {
  console.error(`Invalid tax rate ID: "${taxRateId}". Expected format: txr_...`)
  process.exit(1)
}

applyGstToNzSubscriptions(taxRateId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
