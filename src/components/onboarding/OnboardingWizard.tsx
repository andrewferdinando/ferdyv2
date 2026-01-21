'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { countries } from '@/lib/utils/countries'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface OnboardingData {
  name: string
  email: string
  password: string
  isMultipleBrands: boolean | null
  groupName: string
  brandName: string
  websiteUrl: string
  countryCode: string
  couponCode: string
}

interface PricingInfo {
  baseUnitPrice: number
  discountedUnitPrice: number
  discountAmount: number
  discountPercent: number
  currency: string
  couponName: string | null
  couponDuration?: string
  couponDurationMonths?: number
}

export function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
    name: '',
    email: '',
    password: '',
    isMultipleBrands: null,
    groupName: '',
    brandName: '',
    websiteUrl: 'https://',
    countryCode: 'US',
    couponCode: '',
  })
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pricing, setPricing] = useState<PricingInfo | null>(null)

  const router = useRouter()

  const fetchPricing = async (couponCode?: string) => {
    try {
      const response = await fetch('/api/stripe/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponCode || undefined,
          brandCount: 1,
        }),
      })

      const pricingData = await response.json()
      console.log('Pricing response:', pricingData)

      if (pricingData.valid) {
        setPricing(pricingData)
        return pricingData
      }
      return null
    } catch (err) {
      console.error('Error fetching pricing:', err)
      return null
    }
  }

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate required fields
      if (!data.name || !data.email || !data.password || !data.brandName) {
        throw new Error('Please fill in all required fields')
      }

      if (data.isMultipleBrands && !data.groupName) {
        throw new Error('Please enter your company/agency name')
      }

      // Call server-side API to create account
      const signupResponse = await fetch('/api/onboarding/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          isMultipleBrands: data.isMultipleBrands,
          groupName: data.groupName,
          brandName: data.brandName,
          websiteUrl: data.websiteUrl,
          countryCode: data.countryCode,
        }),
      })

      if (!signupResponse.ok) {
        const errorData = await signupResponse.json()
        throw new Error(errorData.error || 'Failed to create account')
      }

      const { groupId: createdGroupId, groupName: createdGroupName } = await signupResponse.json()
      
      // Store group ID for payment step
      setGroupId(createdGroupId)

      // Log in the user to create a session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (signInError) {
        console.error('Sign in error:', signInError)
        throw new Error('Account created but failed to log in. Please try logging in manually.')
      }

      // Auto-generate group name if single brand
      const finalGroupName = data.isMultipleBrands 
        ? data.groupName 
        : `${data.brandName}'s Account`

      // Create Stripe subscription
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: createdGroupId,
          groupName: createdGroupName,
          email: data.email,
          countryCode: data.countryCode,
          brandCount: 1,
          couponCode: data.couponCode || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create subscription')
      }

      const { clientSecret: secret } = await response.json()
      console.log('Got clientSecret:', secret ? 'YES' : 'NO')
      setClientSecret(secret)

      // Fetch pricing info (with coupon if provided)
      await fetchPricing(data.couponCode || undefined)

      console.log('Setting step to 2')
      setStep(2)
    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipPayment = async () => {
    // For super admin testing only
    router.push('/brands')
  }

  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Welcome to Ferdy
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Let's get your account set up
            </p>
          </div>

          <form onSubmit={handleStep1Submit} className="mt-8 space-y-6">
            <div className="space-y-4">
              {/* Multiple brands question */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Will you be managing multiple brands (e.g., agencies, group businesses)?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="isMultipleBrands"
                      checked={data.isMultipleBrands === true}
                      onChange={() => setData({ ...data, isMultipleBrands: true })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Yes, I manage multiple brands</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="isMultipleBrands"
                      checked={data.isMultipleBrands === false}
                      onChange={() => setData({ ...data, isMultipleBrands: false })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">No, just one brand</span>
                  </label>
                </div>
              </div>

              {/* Show form only after brand type is selected */}
              {data.isMultipleBrands !== null && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={data.name}
                      onChange={(e) => setData({ ...data, name: e.target.value })}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={data.email}
                      onChange={(e) => setData({ ...data, email: e.target.value })}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="john@company.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      value={data.password}
                      onChange={(e) => setData({ ...data, password: e.target.value })}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="At least 8 characters"
                    />
                  </div>

                  {data.isMultipleBrands && (
                    <div>
                      <label htmlFor="groupName" className="block text-sm font-medium text-gray-700">
                        Company/Agency Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="groupName"
                        name="groupName"
                        type="text"
                        required={data.isMultipleBrands}
                        value={data.groupName}
                        onChange={(e) => setData({ ...data, groupName: e.target.value })}
                        className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                        placeholder="Acme Marketing Agency"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="brandName" className="block text-sm font-medium text-gray-700">
                      {data.isMultipleBrands ? 'First Brand Name' : 'Brand Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="brandName"
                      name="brandName"
                      type="text"
                      required
                      value={data.brandName}
                      onChange={(e) => setData({ ...data, brandName: e.target.value })}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder={data.isMultipleBrands ? "Client Brand A" : "My Business"}
                    />
                  </div>

                  <div>
                    <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">
                      Brand Website (Optional)
                    </label>
                    <input
                      id="websiteUrl"
                      name="websiteUrl"
                      type="url"
                      value={data.websiteUrl}
                      onChange={(e) => setData({ ...data, websiteUrl: e.target.value })}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="https://www.example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="countryCode"
                      name="countryCode"
                      value={data.countryCode}
                      onChange={(e) => setData({ ...data, countryCode: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    >
                      <option value="">Select a country</option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="couponCode" className="block text-sm font-medium text-gray-700">
                      Coupon Code (Optional)
                    </label>
                    <input
                      id="couponCode"
                      name="couponCode"
                      type="text"
                      value={data.couponCode}
                      onChange={(e) => setData({ ...data, couponCode: e.target.value })}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Enter coupon code"
                    />
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {data.isMultipleBrands !== null && (
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Setting up your account...' : 'Continue to Payment'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    )
  }

  // Helper to format price
  const formatPrice = (cents: number, currency: string) => {
    return `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }

  if (step === 2 && clientSecret) {
    const hasDiscount = pricing && pricing.discountAmount > 0

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Payment Details
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
          </div>

          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm onSuccess={() => window.location.href = '/brands'} />
          </Elements>

          {/* Skip payment option */}
          <div className="text-center">
            <button
              onClick={handleSkipPayment}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Set up payment later
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Fallback for unexpected state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <p className="text-gray-600">Loading... (Step: {step}, ClientSecret: {clientSecret ? 'Yes' : 'No'})</p>
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
