/**
 * Script to create Stripe product and pricing for Ferdy
 * Run with: npx tsx scripts/setup-stripe-product.ts
 */

import { stripe, STRIPE_CONFIG } from '../src/lib/stripe'

async function setupStripeProduct() {
  console.log('🚀 Setting up Stripe product and pricing...\n')
  console.log(`Mode: ${STRIPE_CONFIG.mode}`)
  console.log(`Product: ${STRIPE_CONFIG.productName}`)
  console.log(`Price: $${STRIPE_CONFIG.pricePerBrand / 100} USD per brand per month\n`)

  try {
    // Check if product already exists
    const existingProducts = await stripe.products.search({
      query: `name:'${STRIPE_CONFIG.productName}'`,
    })

    let product: any

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0]
      console.log(`✅ Product already exists: ${product.id}`)
      console.log(`   Name: ${product.name}`)
    } else {
      // Create product
      product = await stripe.products.create({
        name: STRIPE_CONFIG.productName,
        description: STRIPE_CONFIG.productDescription,
        metadata: {
          type: 'per_brand_subscription',
        },
      })
      console.log(`✅ Created product: ${product.id}`)
      console.log(`   Name: ${product.name}`)
    }

    // Check if price already exists for this product
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    })

    let price: any

    if (existingPrices.data.length > 0) {
      price = existingPrices.data[0]
      console.log(`\n✅ Price already exists: ${price.id}`)
      console.log(`   Amount: $${price.unit_amount! / 100} ${price.currency.toUpperCase()}`)
      console.log(`   Recurring: ${price.recurring?.interval}`)
    } else {
      // Create price
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: STRIPE_CONFIG.pricePerBrand,
        currency: STRIPE_CONFIG.currency,
        recurring: {
          interval: 'month',
        },
        metadata: {
          type: 'per_brand',
        },
      })
      console.log(`\n✅ Created price: ${price.id}`)
      console.log(`   Amount: $${price.unit_amount! / 100} ${price.currency.toUpperCase()}`)
      console.log(`   Recurring: ${price.recurring?.interval}`)
    }

    console.log('\n📋 Add these to your .env.local file:')
    console.log(`STRIPE_PRODUCT_ID=${product.id}`)
    console.log(`STRIPE_PRICE_ID=${price.id}`)

    console.log('\n✨ Stripe setup complete!')

    return { product, price }
  } catch (error) {
    console.error('❌ Error setting up Stripe:', error)
    throw error
  }
}

// Run the setup
setupStripeProduct()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
