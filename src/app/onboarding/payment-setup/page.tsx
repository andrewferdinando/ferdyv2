'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function PaymentSetupPage() {
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [group, setGroup] = useState<any>(null)

  useEffect(() => {
    async function initializePayment() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('Please sign in to continue')
        }

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

        const brandCount = brands?.length || 1

        // Create Stripe subscription
        const response = await fetch('/api/stripe/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: userGroup.id,
            groupName: userGroup.name,
            email: user.email,
            countryCode: 'US',
            brandCount: brandCount,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create subscription')
        }

        const { clientSecret: secret } = await response.json()
        setClientSecret(secret)
        setLoading(false)
      } catch (err: any) {
        console.error('Payment setup error:', err)
        setError(err.message || 'Something went wrong. Please try again.')
        setLoading(false)
      }
    }

    initializePayment()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Setting up payment...</p>
        </div>
      </div>
    )
  }

  if (error) {
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

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete Payment Setup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {group && `US$${(group.price_per_brand_cents / 100).toFixed(2)}/month per brand`}
          </p>
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
