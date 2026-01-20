'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { useUserGroup } from '@/hooks/useUserGroup'
import { supabase } from '@/lib/supabase-browser'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/ToastProvider'

interface SubscriptionDetails {
  status: string
  current_period_end: number
  cancel_at_period_end: boolean
  default_payment_method: any
  latest_invoice?: {
    subtotal: number
    total: number
    currency: string
    total_discount_amounts?: Array<{
      amount: number
      discount: string
    }>
  }
  items?: {
    data: Array<{
      price: {
        unit_amount: number
        currency: string
      }
      quantity: number
    }>
  }
  discounts?: string[]
}

interface Brand {
  id: string
  name: string
}

export default function BillingPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const { group, membership, loading: groupLoading, canManageBilling, refetch } = useUserGroup()
  
  const [brandCount, setBrandCount] = useState(0)
  const [brands, setBrands] = useState<Brand[]>([])
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [brandToRemove, setBrandToRemove] = useState<Brand | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // Refetch group data when component mounts (e.g., after returning from payment setup)
  useEffect(() => {
    if (refetch && !groupLoading) {
      refetch()
    }
  }, [])

  useEffect(() => {
    async function loadBillingData() {
      if (!group) {
        setLoading(false)
        return
      }

      try {
        // Get brands (only active ones)
        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('id, name')
          .eq('group_id', group.id)
          .eq('status', 'active')
          .order('name')

        if (brandsError) throw brandsError
        setBrands(brandsData || [])
        setBrandCount(brandsData?.length || 0)

        // Get subscription details if exists
        if (group.stripe_subscription_id) {
          const response = await fetch(`/api/stripe/subscription-details?groupId=${group.id}`)
          if (response.ok) {
            const data = await response.json()
            setSubscription(data.subscription)
          }
        }

        setLoading(false)
      } catch (err: any) {
        console.error('Error loading billing data:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    if (!groupLoading) {
      loadBillingData()
    }
  }, [group, groupLoading, supabase])

  const handleRemoveBrand = (brand: Brand) => {
    setBrandToRemove(brand)
    setShowRemoveDialog(true)
  }

  const handleConfirmRemove = async () => {
    if (!brandToRemove || !group) return

    setIsRemoving(true)
    try {
      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/brands/remove', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          brandId: brandToRemove.id,
          groupId: group.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove brand')
      }

      // Update UI immediately
      setBrands(prev => prev.filter(b => b.id !== brandToRemove.id))
      setBrandCount(prev => prev - 1)
      
      showToast({ 
        title: 'Brand removed successfully', 
        message: 'Billing will stop at the end of the current period.',
        type: 'success' 
      })
      setShowRemoveDialog(false)
      setBrandToRemove(null)
    } catch (err: any) {
      console.error('Error removing brand:', err)
      showToast({ 
        title: 'Error', 
        message: err.message || 'Failed to remove brand',
        type: 'error' 
      })
    } finally {
      setIsRemoving(false)
    }
  }

  const handleManageBilling = async () => {
    if (!group) return

    // Check if Stripe customer exists
    if (!group.stripe_customer_id) {
      setError('No billing account found. Please contact support to set up billing.')
      return
    }

    try {
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: group.id,
          returnUrl: window.location.href,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create billing portal session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (groupLoading || loading) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading billing information...</p>
            </div>
          </div>
        </AppLayout>
      </RequireAuth>
    )
  }

  if (!group) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-yellow-900">No Group Found</h3>
              <p className="mt-2 text-sm text-yellow-700">
                You need to complete onboarding first.
              </p>
              <button
                onClick={() => router.push('/onboarding/start')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-900 bg-yellow-100 hover:bg-yellow-200"
              >
                Start Onboarding
              </button>
            </div>
          </div>
        </AppLayout>
      </RequireAuth>
    )
  }

  // Use Stripe subscription/invoice data if available, otherwise fall back to database
  const stripePrice = subscription?.items?.data?.[0]?.price
  const latestInvoice = subscription?.latest_invoice
  const stripeCurrency = latestInvoice?.currency || stripePrice?.currency || group.currency

  // Get price per brand from Stripe or database
  const pricePerBrand = stripePrice
    ? stripePrice.unit_amount / 100
    : group.price_per_brand_cents / 100

  // Calculate discount from invoice data (most accurate)
  const hasDiscount = (subscription?.discounts?.length ?? 0) > 0
  const discountAmount = latestInvoice?.total_discount_amounts?.[0]?.amount
    ? latestInvoice.total_discount_amounts[0].amount / 100
    : 0

  // Calculate totals - use invoice total if available (includes discount)
  const subtotal = brandCount * pricePerBrand
  const totalMonthly = latestInvoice
    ? latestInvoice.total / 100
    : subtotal

  return (
    <RequireAuth>
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your subscription and billing information · <a href="#how-billing-works" className="text-blue-600 hover:text-blue-800 underline">How billing works</a>
            </p>
          </div>

          {/* Payment Setup Required - Only show if subscription is incomplete */}
          {group.subscription_status === 'incomplete' && canManageBilling && (
            <div className="mb-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-yellow-900">Payment Setup Required</h3>
                  <p className="mt-2 text-sm text-yellow-800">
                    Complete your payment setup to activate your subscription and start using all features.
                  </p>
                  <button
                    onClick={() => router.push('/onboarding/payment-setup')}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    Complete Payment Setup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">You can only see billing for brands where you're an admin.</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Subscription Overview */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Subscription Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Account</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{group.name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Active Brands</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{brandCount}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Monthly Total</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  ${totalMonthly.toFixed(2)} <span className="text-sm text-gray-500">{stripeCurrency.toUpperCase()}</span>
                </p>
                {hasDiscount && discountAmount > 0 && (
                  <p className="mt-1 text-sm text-green-600">
                    ${discountAmount.toFixed(2)} discount applied
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Price per brand</p>
                  <p className="text-sm text-gray-500">
                    ${pricePerBrand.toFixed(2)} / month × {brandCount} {brandCount === 1 ? 'brand' : 'brands'}
                    {hasDiscount && discountAmount > 0 && (
                      <span className="text-green-600"> - ${discountAmount.toFixed(2)} discount</span>
                    )}
                  </p>
                </div>
                
                {subscription && (
                  <div className="text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      subscription.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : subscription.status === 'past_due'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {subscription.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Brands List */}
          {brands.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Active Brands</h2>
              <ul className="divide-y divide-gray-200">
                {brands.map((brand) => (
                  <li key={brand.id} className="py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-900">{brand.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">${pricePerBrand.toFixed(2)}/month</span>
                      {canManageBilling && brands.length > 1 && (
                        <button
                          onClick={() => handleRemoveBrand(brand)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove brand"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Subscription Details */}
          {subscription && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Subscription Details</h2>
              
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{subscription.status}</dd>
                </div>
                
                {subscription.current_period_end && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      {subscription.cancel_at_period_end ? 'Cancels on' : 'Next billing date'}
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                
                {subscription.default_payment_method && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {subscription.default_payment_method.card?.brand.toUpperCase()} •••• {subscription.default_payment_method.card?.last4}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Actions */}
          {canManageBilling && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Manage Billing</h2>
              
              <p className="text-sm text-gray-600 mb-4">
                Update your payment method, view invoices, or cancel your subscription.
              </p>
              
              <button
                onClick={handleManageBilling}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Manage Billing
              </button>
            </div>
          )}

          {!canManageBilling && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <p className="text-sm text-gray-600">
                You don't have permission to manage billing. Contact your account owner.
              </p>
            </div>
          )}

          {/* Billing Explanation */}
          <div id="how-billing-works" className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
            <h2 className="text-lg font-medium text-blue-900 mb-3">How Billing Works</h2>
            <div className="space-y-4 text-sm text-blue-800">
              <div>
                <p className="font-semibold mb-1">1. Your First Brand</p>
                <p>When you sign up, you're charged upfront for your first brand for the full month.</p>
                <p className="mt-1 italic">Example: $147 NZD covers your first brand for the next 30 days.</p>
              </div>
              
              <div>
                <p className="font-semibold mb-1">2. Adding More Brands Mid-Month</p>
                <p>If you add more brands part way through your billing month, you're not charged immediately. Instead, everything is rolled into your next invoice, which will include:</p>
                <ul className="list-none pl-4 space-y-1 mt-2">
                  <li>✅ A partial charge for the new brands for the rest of the current month</li>
                  <li>✅ A small credit if any time from your original setup overlaps</li>
                  <li>✅ The full monthly charge in advance for all brands for the next month</li>
                </ul>
              </div>
              
              <div>
                <p className="font-semibold mb-1">3. Simple Example</p>
                <p>If you add 2 extra brands halfway through the month, your next invoice might look like this:</p>
                <ul className="list-none pl-4 space-y-1 mt-2">
                  <li>Remaining time this month for 3 brands: ~$129</li>
                  <li>Credit for unused time on your original setup: ~–$43</li>
                  <li>Next full month for 3 brands: $258</li>
                  <li className="font-semibold">Total next invoice: ~$344</li>
                </ul>
              </div>
              
              <p className="pt-3 border-t border-blue-200 font-medium">
                Current Price: ${pricePerBrand.toFixed(2)} {stripeCurrency.toUpperCase()} per brand per month
                {hasDiscount && discountAmount > 0 && (
                  <span className="text-green-700"> (${discountAmount.toFixed(2)} discount applied)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Remove Brand Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showRemoveDialog}
          onClose={() => {
            setShowRemoveDialog(false)
            setBrandToRemove(null)
          }}
          onConfirm={handleConfirmRemove}
          title="Remove Brand"
          message="Removing this brand will stop billing for it at the end of the current billing period. Are you sure?"
          confirmText="Confirm Remove"
          cancelText="Cancel"
          isDestructive={true}
          isLoading={isRemoving}
        />
      </AppLayout>
    </RequireAuth>
  )
}
