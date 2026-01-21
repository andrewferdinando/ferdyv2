'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PricingInfo {
  baseUnitPrice: number
  baseTotal: number
  discountedUnitPrice: number
  discountedTotal: number
  discountAmount: number
  discountPercent: number
  currency: string
  couponName: string | null
  couponDuration?: string
  couponDurationMonths?: number
}

export default function PaymentSetupPage() {
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupLoading, setSetupLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [group, setGroup] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [brandCount, setBrandCount] = useState(1)
  const [couponCode, setCouponCode] = useState('')
  const [hasExistingSubscription, setHasExistingSubscription] = useState(false)
  const [pricing, setPricing] = useState<PricingInfo | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponApplied, setCouponApplied] = useState(false)

  useEffect(() => {
    async function initializePayment() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('Please sign in to continue')
        }
        setUser(user)

        // Get user's group
        const { data: membership, error: membershipError } = await supabase
          .from('group_memberships')
          .select('group_id, groups(*)')
          .eq('user_id', user.id)
          .single()

        if (membershipError || !membership) {
          throw new Error('No group found for your account')
        }

        const userGroup = (membership as any).groups
        setGroup(userGroup)

        // Check if payment is already set up
        if (userGroup.subscription_status === 'active') {
          router.push('/account/billing')
          return
        }

        // Get brand count
        const { data: brands, error: brandsError } = await supabase
          .from('brands')
          .select('id')
          .eq('group_id', userGroup.id)
          .eq('status', 'active')

        if (brandsError) throw brandsError

        const count = brands?.length || 1
        setBrandCount(count)

        // Fetch initial pricing
        await fetchPricing(count)

        // Check if there's already an incomplete subscription
        if (userGroup.stripe_subscription_id && userGroup.subscription_status === 'incomplete') {
          setHasExistingSubscription(true)
          // For existing subscriptions, automatically fetch the payment setup
          await fetchPaymentSetup(userGroup, user.email, count)
        }

        setLoading(false)
      } catch (err: any) {
        console.error('Payment setup error:', err)
        setError(err.message || 'Something went wrong. Please try again.')
        setLoading(false)
      }
    }

    initializePayment()
  }, [router])

  const fetchPricing = async (count: number, coupon?: string) => {
    try {
      const response = await fetch('/api/stripe/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: coupon || undefined,
          brandCount: count,
        }),
      })

      const data = await response.json()
      console.log('Initial pricing response:', data)

      if (data.valid) {
        setPricing(data)
        return data
      } else {
        return null
      }
    } catch (err) {
      console.error('Error fetching pricing:', err)
      return null
    }
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code')
      return
    }

    setCouponLoading(true)
    setCouponError(null)

    try {
      const response = await fetch('/api/stripe/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponCode.trim(),
          brandCount,
        }),
      })

      const data = await response.json()
      console.log('Coupon validation response:', data)

      if (data.valid) {
        console.log('Setting pricing with discount:', {
          baseUnitPrice: data.baseUnitPrice,
          discountedUnitPrice: data.discountedUnitPrice,
          discountAmount: data.discountAmount,
          discountPercent: data.discountPercent,
        })
        setPricing(data)
        setCouponApplied(true)
        setCouponError(null)
      } else {
        setCouponError(data.error || 'Invalid coupon code')
        setCouponApplied(false)
      }
    } catch (err: any) {
      setCouponError('Failed to validate coupon')
      setCouponApplied(false)
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = async () => {
    setCouponCode('')
    setCouponApplied(false)
    setCouponError(null)
    await fetchPricing(brandCount)
  }

  const fetchPaymentSetup = async (userGroup: any, email: string, count: number, coupon?: string) => {
    setSetupLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/get-or-create-payment-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: userGroup.id,
          groupName: userGroup.name,
          email: email,
          countryCode: 'US',
          brandCount: count,
          couponCode: coupon || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create subscription')
      }

      const { clientSecret: secret } = await response.json()
      setClientSecret(secret)
    } catch (err: any) {
      console.error('Payment setup error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSetupLoading(false)
    }
  }

  const handleContinueToPayment = async () => {
    if (!group || !user) return
    await fetchPaymentSetup(group, user.email, brandCount, couponCode)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error && !clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-900 mb-2">Error</h3>
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => router.push('/account/billing')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-900 bg-red-100 hover:bg-red-200"
            >
              Back to Billing
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Helper to format price
  const formatPrice = (cents: number, currency: string) => {
    return `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }

  // Show coupon input if no subscription exists yet
  if (!clientSecret && !hasExistingSubscription) {
    const hasDiscount = pricing && pricing.discountAmount > 0

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Complete Payment Setup
            </h2>
            {pricing ? (
              <div className="mt-2 text-center">
                {hasDiscount ? (
                  <>
                    <p className="text-sm text-gray-500 line-through">
                      {formatPrice(pricing.baseUnitPrice, pricing.currency)}/month per brand
                    </p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatPrice(pricing.discountedUnitPrice, pricing.currency)}/month per brand
                    </p>
                    <p className="text-sm text-green-600">
                      {pricing.discountPercent}% off
                      {pricing.couponDuration === 'forever' && ' forever'}
                      {pricing.couponDuration === 'once' && ' (first month)'}
                      {pricing.couponDuration === 'repeating' && pricing.couponDurationMonths && ` for ${pricing.couponDurationMonths} months`}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">
                    {formatPrice(pricing.baseUnitPrice, pricing.currency)}/month per brand
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-center text-sm text-gray-600">
                Loading pricing...
              </p>
            )}
            <p className="mt-1 text-center text-sm text-gray-500">
              {brandCount} {brandCount === 1 ? 'brand' : 'brands'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <div>
              <label htmlFor="couponCode" className="block text-sm font-medium text-gray-700">
                Coupon Code (Optional)
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="couponCode"
                  name="couponCode"
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value)
                    if (couponApplied) {
                      setCouponApplied(false)
                    }
                  }}
                  disabled={couponApplied}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100"
                  placeholder="Enter coupon code"
                />
                {couponApplied ? (
                  <button
                    onClick={handleRemoveCoupon}
                    type="button"
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    type="button"
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                )}
              </div>
              {couponApplied && pricing?.couponName && (
                <p className="mt-2 text-sm text-green-600">
                  Coupon "{pricing.couponName}" applied!
                </p>
              )}
              {couponError && (
                <p className="mt-2 text-sm text-red-600">{couponError}</p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              onClick={handleContinueToPayment}
              disabled={setupLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {setupLoading ? 'Setting up...' : 'Continue to Payment'}
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => router.push('/account/billing')}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Back to Billing
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show loading while fetching payment setup for existing subscription
  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Setting up payment...</p>
        </div>
      </div>
    )
  }

  const hasDiscount = pricing && pricing.discountAmount > 0

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete Payment Setup
          </h2>
          {pricing ? (
            <div className="mt-2 text-center">
              {hasDiscount ? (
                <>
                  <p className="text-sm text-gray-500 line-through">
                    {formatPrice(pricing.baseUnitPrice, pricing.currency)}/month per brand
                  </p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatPrice(pricing.discountedUnitPrice, pricing.currency)}/month per brand
                  </p>
                  <p className="text-sm text-green-600">
                    {pricing.discountPercent}% off
                    {pricing.couponDuration === 'forever' && ' forever'}
                    {pricing.couponDuration === 'once' && ' (first month)'}
                    {pricing.couponDuration === 'repeating' && pricing.couponDurationMonths && ` for ${pricing.couponDurationMonths} months`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  {formatPrice(pricing.baseUnitPrice, pricing.currency)}/month per brand
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-center text-sm text-gray-600">
              {group && `$${(group.price_per_brand_cents / 100).toFixed(2)} NZD/month per brand`}
            </p>
          )}
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm onSuccess={() => router.push('/brands')} />
        </Elements>

        <div className="text-center">
          <button
            onClick={() => router.push('/account/billing')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Back to Billing
          </button>
        </div>
      </div>
    </div>
  )
}

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/brands`,
        },
        redirect: 'if_required',
      })

      if (submitError) {
        setError(submitError.message || 'Payment failed')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded, redirect to dashboard
        onSuccess()
      } else {
        // Payment is processing or requires action
        setError('Payment is being processed. Please wait...')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <PaymentElement />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Complete Payment'}
      </button>
    </form>
  )
}
