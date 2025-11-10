'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import { supabase } from '@/lib/supabase-browser';

interface SubscriptionInfo {
  id: string;
  status: string;
  plan: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export default function BillingPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const checkUserRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's role for the current brand (from URL)
      console.log('Fetching role for brand:', brandId);
      const { data: membershipData, error: membershipError } = await supabase
        .from('brand_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('brand_id', brandId)
        .single();

      let role = 'editor'; // default
      if (membershipError) {
        console.error('Error fetching membership data:', membershipError);
      } else if (membershipData) {
        role = membershipData.role;
        console.log('Found role:', role);
      }

      setUserRole(role);
    } catch (membershipError) {
      console.error('Error checking user role:', membershipError);
      setError('Failed to verify permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    try {
      // Mock subscription data - replace with actual Stripe integration
      const mockSubscription: SubscriptionInfo = {
        id: 'sub_1234567890',
        status: 'active',
        plan: 'Pro Plan',
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
        cancel_at_period_end: false
      };

      setSubscription(mockSubscription);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setError('Failed to load subscription information');
    }
  }, []);

  useEffect(() => {
    checkUserRole();
  }, [checkUserRole]);

  useEffect(() => {
    if (userRole && (userRole === 'admin' || userRole === 'super_admin')) {
      fetchSubscription();
    }
  }, [userRole, fetchSubscription]);

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.')) {
      return;
    }

    setCancelling(true);
    setError('');

    try {
      // Mock cancellation - replace with actual Stripe integration
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      setSubscription(prev => prev ? { ...prev, cancel_at_period_end: true } : null);
      setSuccess('Subscription cancelled successfully. You will retain access until the end of your billing period.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setError('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#6366F1]"></div>
          </div>
        </AppLayout>
      </RequireAuth>
    );
  }

  // Check if user has permission to view this page
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">You need admin or super admin permissions to access billing information.</p>
            </div>
          </div>
        </AppLayout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-10">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Billing</h1>
              </div>

              {/* Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md mb-6">
                  {success}
                </div>
              )}

              {/* Subscription Information */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Current Subscription</h3>
                  {subscription && subscription.status === 'active' && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      subscription.cancel_at_period_end 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {subscription.cancel_at_period_end ? 'Cancelling' : 'Active'}
                    </span>
                  )}
                </div>

                {subscription ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                        <p className="text-gray-900">{subscription.plan}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <p className="text-gray-900 capitalize">{subscription.status}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Period</label>
                        <p className="text-gray-900">
                          {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Next Billing Date</label>
                        <p className="text-gray-900">
                          {subscription.cancel_at_period_end ? 'N/A (Cancelled)' : formatDate(subscription.current_period_end)}
                        </p>
                      </div>
                    </div>

                    {subscription.cancel_at_period_end && (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
                        <p className="text-sm">
                          Your subscription will be cancelled at the end of your current billing period. 
                          You will retain access to all features until {formatDate(subscription.current_period_end)}.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <p className="text-gray-600">No active subscription found.</p>
                  </div>
                )}
              </div>

              {/* Billing Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Actions</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Update Payment Method</h4>
                      <p className="text-sm text-gray-600">Manage your payment information and billing details</p>
                    </div>
                    <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                      Update
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Download Invoices</h4>
                      <p className="text-sm text-gray-600">Access your billing history and download receipts</p>
                    </div>
                    <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                      Download
                    </button>
                  </div>

                  {subscription && subscription.status === 'active' && !subscription.cancel_at_period_end && (
                    <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                      <div>
                        <h4 className="font-medium text-red-900">Cancel Subscription</h4>
                        <p className="text-sm text-red-600">Cancel your subscription. You&apos;ll retain access until the end of your billing period.</p>
                      </div>
                      <button 
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelling ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Coming Soon Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Stripe Integration Coming Soon</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This billing page is currently using mock data. Full Stripe integration for payment processing, 
                      subscription management, and invoice generation will be implemented soon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
