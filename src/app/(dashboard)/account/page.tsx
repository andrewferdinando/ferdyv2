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

        // Account-level admin check: profile role must be admin or super_admin
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

  const accountCards = [
    {
      id: 'profile',
      title: 'Profile',
      description: 'Manage your personal information.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      href: '/account/profile',
      requiresAdmin: false,
    },
    {
      id: 'team',
      title: 'Team',
      description: 'Invite team members and manage roles.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      href: '/account/team',
      requiresAdmin: true,
    },
    {
      id: 'brand-settings',
      title: 'Brand Settings',
      description: 'Manage your brand information.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      href: '/account/brand-settings',
      requiresAdmin: true,
    },
    {
      id: 'billing',
      title: 'Billing',
      description: 'Manage your subscription, invoices and payment method.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      href: '/account/billing',
      requiresAdmin: true,
    },
    {
      id: 'add-brand',
      title: 'Add Brand',
      description: 'Add a new brand.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      href: '/account/add-brand',
      requiresAdmin: true,
    },
  ]

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto">
          {viewState === 'loading' && (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center space-y-3">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
                <p className="text-sm text-gray-600">Loading account tools…</p>
              </div>
            </div>
          )}

          {viewState === 'unauthorized' && (
            <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-4 mt-10">
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
            <>
              {/* Header */}
              <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Account</h1>
                </div>
              </div>

              {/* Account Cards Grid */}
              <div className="p-4 sm:p-6 lg:p-10">
                <div className="max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accountCards.map((card) => {
                      const disabled = card.requiresAdmin && !isAccountAdmin
                      const cardClasses = [
                        'bg-white rounded-xl border p-6 transition-all duration-200 h-full',
                        disabled
                          ? 'border-gray-200 cursor-not-allowed opacity-70'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5',
                      ].join(' ')
                      const iconWrapperClasses = [
                        'w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-200',
                        disabled
                          ? 'bg-gray-200 text-gray-500'
                          : 'bg-[#EEF2FF] text-[#6366F1] group-hover:bg-[#6366F1] group-hover:text-white',
                      ].join(' ')
                      const titleClasses = [
                        'text-lg font-semibold transition-colors duration-200',
                        disabled ? 'text-gray-500' : 'text-gray-900 group-hover:text-[#6366F1]',
                      ].join(' ')
                      const descriptionClasses = disabled ? 'text-gray-500 text-sm mt-1 leading-relaxed' : 'text-gray-600 text-sm mt-1 leading-relaxed'

                      const cardContent = (
                        <div className={cardClasses}>
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className={iconWrapperClasses}>
                                {card.icon}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className={titleClasses}>{card.title}</h3>
                              <p className={descriptionClasses}>{card.description}</p>
                              {disabled && (
                                <span className="mt-3 inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200">
                                  Admin Only
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )

                      if (disabled) {
                        return (
                          <div key={card.id} className="group">
                            {cardContent}
                          </div>
                        )
                      }

                      return (
                        <Link
                          key={card.id}
                          href={card.href}
                          className="group"
                        >
                          {cardContent}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </AppLayout>
    </RequireAuth>
  )
}
