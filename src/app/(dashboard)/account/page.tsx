'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import RequireAuth from '@/components/auth/RequireAuth'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/lib/supabase-browser'

type ViewState = 'loading' | 'ready' | 'unauthorized'

export default function AccountOverviewPage() {
  const [viewState, setViewState] = useState<ViewState>('loading')
  const [isAccountAdmin, setIsAccountAdmin] = useState(false)

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          setViewState('unauthorized')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        if (profileError || !profile) {
          console.error('AccountOverviewPage: failed to load profile', profileError)
          setViewState('unauthorized')
          return
        }

        const canManageAccount = ['admin', 'super_admin'].includes(profile.role)
        setIsAccountAdmin(canManageAccount)
        setViewState('ready')
      } catch (error) {
        console.error('AccountOverviewPage: unexpected error', error)
        setViewState('unauthorized')
      }
    }

    fetchRole()
  }, [])

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="px-4 py-10 sm:px-6 lg:px-10">
            {viewState === 'loading' && (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center space-y-3">
                  <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
                  <p className="text-sm text-gray-600">Loading account tools…</p>
                </div>
              </div>
            )}

            {viewState === 'unauthorized' && (
              <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-4">
                <h1 className="text-2xl font-semibold text-gray-900">Account tools unavailable</h1>
                <p className="text-sm text-gray-600">
                  Only Account Admins can access these settings. Please contact your administrator if you need access.
                </p>
                <Link
                  href="/brands"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Go to Brands
                </Link>
              </div>
            )}

            {viewState === 'ready' && (
              <div className="max-w-4xl mx-auto space-y-10">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-gray-950">Account</h1>
                  <p className="text-gray-600">
                    Manage your Ferdy account, invite collaborators, and create new brands.
                  </p>
                </div>

                {isAccountAdmin ? (
                  <div className="grid gap-6 md:grid-cols-1">
                    <Link
                      href="/account/billing"
                      className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1] transition-colors group-hover:bg-[#6366F1] group-hover:text-white">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
                            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                              Manage your subscription, view invoices, and update payment methods.
                            </p>
                          </div>
                        </div>
                        <svg className="h-5 w-5 text-gray-400 transition-colors group-hover:text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                    <Link
                      href="/account/add-brand"
                      className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1] transition-colors group-hover:bg-[#6366F1] group-hover:text-white">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">Add Brand</h2>
                            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                              Create a new brand workspace to manage content, data, and automations.
                            </p>
                          </div>
                        </div>
                        <svg className="h-5 w-5 text-gray-400 transition-colors group-hover:text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Account tools unavailable</h2>
                    <p className="mt-2 text-sm text-gray-600">
                      You&apos;re signed in but don&apos;t have Account Admin permissions. Reach out to your administrator if you need to create new brands or manage account-level settings.
                    </p>
                    <div className="mt-6">
                      <Link
                        href="/brands"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        View Brands
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}


