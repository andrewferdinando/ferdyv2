import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
  typescript: true,
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
