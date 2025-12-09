import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
    }
    
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY.trim(), {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    })
  }
  
  return stripeInstance
}

// For backwards compatibility
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    return getStripe()[prop as keyof Stripe]
  }
})

export const STRIPE_CONFIG = {
  mode: process.env.STRIPE_MODE || 'test',
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  pricePerBrand: 8600, // US$86.00 in cents
  currency: 'usd',
  productName: 'Ferdy Brand Automation',
  productDescription: 'Social media automation per brand',
}

export const GST_RATE_NZ = 0.15 // 15% GST for New Zealand businesses
