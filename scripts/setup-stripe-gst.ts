/**
 * Script to create NZ GST tax rate in Stripe and audit existing subscriptions.
 *
 * Step 1: Creates a 15% exclusive GST tax rate (or finds existing one).
 * Step 2: Lists all active subscriptions and checks customer countries.
 * Step 3: Reports which subscriptions need GST applied.
 *
 * Run with: npx tsx scripts/setup-stripe-gst.ts
 */

import { stripe } from '../src/lib/stripe'
import Stripe from 'stripe'

const GST_DISPLAY_NAME = 'GST'
const GST_PERCENTAGE = 15
const GST_COUNTRY = 'NZ'
const GST_JURISDICTION = 'New Zealand'

interface SubscriptionAuditResult {
  subscriptionId: string
  customerId: string
  customerEmail: string | null
  customerName: string | null
  country: string | null
  status: string
  hasGstTaxRate: boolean
  needsGst: boolean
  monthlyAmount: number
  quantity: number
  groupId: string | null
}

async function findOrCreateGstTaxRate(): Promise<Stripe.TaxRate> {
  console.log('--- Step 1: GST Tax Rate ---\n')

  // Check for existing GST tax rate
  const existingRates = await stripe.taxRates.list({ active: true, limit: 100 })
  const existingGst = existingRates.data.find(
    (rate) =>
      rate.display_name === GST_DISPLAY_NAME &&
      rate.percentage === GST_PERCENTAGE &&
      rate.country === GST_COUNTRY &&
      rate.inclusive === false
  )

  if (existingGst) {
    console.log(`Found existing GST tax rate: ${existingGst.id}`)
    console.log(`  Display name: ${existingGst.display_name}`)
    console.log(`  Percentage: ${existingGst.percentage}%`)
    console.log(`  Inclusive: ${existingGst.inclusive}`)
    console.log(`  Country: ${existingGst.country}`)
    console.log(`  Jurisdiction: ${existingGst.jurisdiction}`)
    return existingGst
  }

  // Create new GST tax rate
  console.log('Creating new GST tax rate...')
  const taxRate = await stripe.taxRates.create({
    display_name: GST_DISPLAY_NAME,
    percentage: GST_PERCENTAGE,
    inclusive: false,
    country: GST_COUNTRY,
    jurisdiction: GST_JURISDICTION,
    tax_type: 'gst',
    description: 'New Zealand Goods and Services Tax (15%)',
  })

  console.log(`Created GST tax rate: ${taxRate.id}`)
  console.log(`  Display name: ${taxRate.display_name}`)
  console.log(`  Percentage: ${taxRate.percentage}%`)
  console.log(`  Inclusive: ${taxRate.inclusive}`)
  console.log(`  Country: ${taxRate.country}`)
  console.log(`  Jurisdiction: ${taxRate.jurisdiction}`)
  console.log(`  Tax type: ${taxRate.tax_type}`)

  return taxRate
}

async function auditSubscriptions(gstTaxRateId: string): Promise<SubscriptionAuditResult[]> {
  console.log('\n--- Step 2: Subscription Audit ---\n')

  const results: SubscriptionAuditResult[] = []
  let hasMore = true
  let startingAfter: string | undefined

  // Paginate through all active subscriptions
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
      const hasGst = (sub.default_tax_rates || []).some(
        (rate) => typeof rate !== 'string' && rate.id === gstTaxRateId
      )

      const item = sub.items.data[0]
      const unitAmount = item?.price?.unit_amount || 0
      const quantity = item?.quantity || 1

      results.push({
        subscriptionId: sub.id,
        customerId: customer.id,
        customerEmail: customer.email,
        customerName: customer.name ?? null,
        country,
        status: sub.status,
        hasGstTaxRate: hasGst,
        needsGst: country === GST_COUNTRY && !hasGst,
        monthlyAmount: unitAmount * quantity,
        quantity,
        groupId: sub.metadata?.group_id || null,
      })

      startingAfter = sub.id
    }

    hasMore = subscriptions.has_more
  }

  return results
}

function printAuditReport(results: SubscriptionAuditResult[], gstTaxRateId: string) {
  console.log(`Total active subscriptions: ${results.length}\n`)

  // Group by country
  const byCountry = new Map<string, SubscriptionAuditResult[]>()
  for (const r of results) {
    const key = r.country || '(no country set)'
    if (!byCountry.has(key)) byCountry.set(key, [])
    byCountry.get(key)!.push(r)
  }

  console.log('Subscriptions by country:')
  for (const [country, subs] of [...byCountry.entries()].sort()) {
    console.log(`  ${country}: ${subs.length} subscription(s)`)
  }

  // NZ subscriptions needing GST
  const needsGst = results.filter((r) => r.needsGst)
  const alreadyHasGst = results.filter((r) => r.country === GST_COUNTRY && r.hasGstTaxRate)
  const nonNz = results.filter((r) => r.country !== GST_COUNTRY)

  console.log(`\n--- NZ Subscriptions ---`)
  console.log(`Already have GST: ${alreadyHasGst.length}`)
  console.log(`Need GST applied: ${needsGst.length}`)

  if (needsGst.length > 0) {
    console.log('\nSubscriptions that need GST:')
    console.log('-'.repeat(100))
    console.log(
      'Subscription ID'.padEnd(30) +
        'Customer'.padEnd(30) +
        'Email'.padEnd(30) +
        'Brands'.padEnd(8) +
        'Monthly (NZD)'
    )
    console.log('-'.repeat(100))
    for (const r of needsGst) {
      const monthly = `$${(r.monthlyAmount / 100).toFixed(2)}`
      const gstAmount = `+ $${((r.monthlyAmount * 0.15) / 100).toFixed(2)} GST`
      console.log(
        r.subscriptionId.padEnd(30) +
          (r.customerName || '-').padEnd(30) +
          (r.customerEmail || '-').padEnd(30) +
          String(r.quantity).padEnd(8) +
          `${monthly} ${gstAmount}`
      )
    }
  }

  console.log(`\n--- Non-NZ Subscriptions (no GST needed) ---`)
  console.log(`Count: ${nonNz.length}`)
  if (nonNz.length > 0) {
    for (const r of nonNz) {
      console.log(
        `  ${r.subscriptionId} | ${r.customerName || '-'} | ${r.country || '(none)'}`
      )
    }
  }

  // Summary
  console.log('\n--- Summary ---')
  console.log(`GST Tax Rate ID: ${gstTaxRateId}`)
  console.log(`Add this to your .env.local:`)
  console.log(`  STRIPE_GST_TAX_RATE_ID=${gstTaxRateId}`)
  console.log('')

  if (needsGst.length > 0) {
    console.log(
      `Next step: Run "npx tsx scripts/apply-stripe-gst.ts ${gstTaxRateId}" to apply GST to ${needsGst.length} NZ subscription(s).`
    )
  } else {
    console.log('All NZ subscriptions already have GST applied (or there are none).')
  }
}

async function main() {
  console.log('=== Ferdy GST Setup & Audit ===\n')

  // Step 1: Create or find GST tax rate
  const taxRate = await findOrCreateGstTaxRate()

  // Step 2: Audit subscriptions
  const results = await auditSubscriptions(taxRate.id)

  // Step 3: Print report
  printAuditReport(results, taxRate.id)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
