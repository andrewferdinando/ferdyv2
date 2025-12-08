'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface OnboardingData {
  groupName: string
  brandName: string
  email: string
  countryCode: string
}

export function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
    groupName: '',
    brandName: '',
    email: '',
    countryCode: 'US',
  })
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = useSupabase()

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: data.groupName,
          country_code: data.countryCode,
        })
        .select()
        .single()

      if (groupError) throw groupError

      // Add user as owner
      const { error: memberError } = await supabase
        .from('group_memberships')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'owner',
        })

      if (memberError) throw memberError

      // Create first brand
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .insert({
          name: data.brandName,
          group_id: group.id,
        })
        .select()
        .single()

      if (brandError) throw brandError

      // Add user to brand
      const { error: brandMemberError } = await supabase
        .from('brand_memberships')
        .insert({
          brand_id: brand.id,
          user_id: user.id,
          role: 'owner',
        })

      if (brandMemberError) throw brandMemberError

      // Create Stripe subscription
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: group.id,
          groupName: data.groupName,
          email: data.email || user.email,
          countryCode: data.countryCode,
          brandCount: 1,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create subscription')
      }

      const { clientSecret: secret } = await response.json()

      setClientSecret(secret)
      setStep(2)
    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipPayment = async () => {
    // Only allow super admin to skip
    // TODO: Add super admin check
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
              Let's set up your account
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleStep1Submit}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="groupName" className="block text-sm font-medium text-gray-700">
                  Company/Agency Name
                </label>
                <input
                  id="groupName"
                  name="groupName"
                  type="text"
                  required
                  value={data.groupName}
                  onChange={(e) => setData({ ...data, groupName: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Acme Marketing"
                />
              </div>

              <div>
                <label htmlFor="brandName" className="block text-sm font-medium text-gray-700">
                  First Brand Name
                </label>
                <input
                  id="brandName"
                  name="brandName"
                  type="text"
                  required
                  value={data.brandName}
                  onChange={(e) => setData({ ...data, brandName: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="My Brand"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Billing Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="billing@company.com"
                />
              </div>

              <div>
                <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <select
                  id="countryCode"
                  name="countryCode"
                  value={data.countryCode}
                  onChange={(e) => setData({ ...data, countryCode: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="US">United States</option>
                  <option value="NZ">New Zealand</option>
                  <option value="AU">Australia</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Continue to Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (step === 2 && clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Payment Details
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              US$86/month per brand
            </p>
          </div>

          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm onSuccess={() => router.push('/brands')} />
          </Elements>

          {/* Super admin skip option */}
          <button
            onClick={handleSkipPayment}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
          >
            Skip payment (admin only)
          </button>
        </div>
      </div>
    )
  }

  return null
}

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/brands`,
      },
      redirect: 'if_required',
    })

    if (submitError) {
      setError(submitError.message || 'Payment failed')
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Complete Setup'}
      </button>
    </form>
  )
}
