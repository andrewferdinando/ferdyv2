/**
 * One-time script to remove payment_method_types restriction from existing subscriptions.
 * This fixes the "payment method not supported by this subscription" error in the billing portal.
 *
 * Usage: npx tsx scripts/fix-subscription-payment-types.ts
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover' as any,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixSubscriptions() {
  // Get all groups with active Stripe subscriptions
  const { data: groups, error } = await supabase
    .from('groups')
    .select('id, name, stripe_subscription_id')
    .not('stripe_subscription_id', 'is', null)

  if (error) {
    console.error('Failed to fetch groups:', error)
    process.exit(1)
  }

  if (!groups || groups.length === 0) {
    console.log('No groups with subscriptions found.')
    return
  }

  console.log(`Found ${groups.length} subscription(s) to fix.\n`)

  for (const group of groups) {
    try {
      const subscription = await stripe.subscriptions.retrieve(group.stripe_subscription_id!)

      const currentTypes = (subscription as any).payment_settings?.payment_method_types
      console.log(`[${group.name}] Subscription ${subscription.id} (status: ${subscription.status})`)
      console.log(`  Current payment_method_types: ${JSON.stringify(currentTypes)}`)

      if (currentTypes && currentTypes.length > 0) {
        // Clear the restriction by setting payment_method_types to empty (automatic)
        await stripe.subscriptions.update(subscription.id, {
          payment_settings: {
            payment_method_types: null as any, // null removes the restriction
          },
        })
        console.log(`  ✓ Cleared payment_method_types restriction`)
      } else {
        console.log(`  Already using automatic payment methods, no change needed`)
      }
    } catch (err: any) {
      console.error(`  ✗ Error fixing ${group.name}: ${err.message}`)
    }
    console.log()
  }

  console.log('Done!')
}

fixSubscriptions()
