'use client';

import React, { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { useSocialAccounts } from '@/hooks/useSocialAccounts'
import { useUserRole } from '@/hooks/useUserRole'
import { supabase } from '@/lib/supabase-browser'

// Icons
const LinkIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const UnlinkIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
  </svg>
);

// Social Media Platform Icons
const FacebookIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);


const LinkedInIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const TikTokIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

interface SocialProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const socialProviders: SocialProvider[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    description: 'Connect a Facebook Page to publish posts.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    description: 'Connect the Instagram Business Account linked to your Facebook Page.',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2',
    description: 'Connect your LinkedIn Company Page.',
  },
]

// Social Icon Component with image fallback to SVG
const SocialIcon = ({ iconName, className = "w-6 h-6" }: { iconName: string; className?: string }) => {
  const [useImage, setUseImage] = React.useState(true);
  const iconClass = `${className} object-contain`;
  const iconPath = `/social-icons/${iconName}.png`;
  
  // Render SVG component based on icon name
  const renderSVG = () => {
    // TikTok should be visible on white background (no white color), others use white for colored backgrounds
    if (iconName === 'tiktok') {
      return <TikTokIcon className={iconClass} />;
    }
    // For Facebook, Instagram, LinkedIn - use white for colored backgrounds (but we removed backgrounds, so they should be visible)
    // Since we removed colored backgrounds, use default color instead of white
    return (
      <>
        {iconName === 'facebook' && <FacebookIcon className={iconClass} />}
        {iconName === 'instagram' && <InstagramIcon className={iconClass} />}
        {iconName === 'linkedin' && <LinkedInIcon className={iconClass} />}
      </>
    );
  };

  // Try to use image file first for all platforms, fallback to white SVG if image fails
  if (useImage) {
    return (
      <img 
        src={iconPath} 
        alt={iconName}
        className={iconClass}
        onError={() => setUseImage(false)}
      />
    );
  }
  
  // Fallback to white SVG if image fails to load
  return renderSVG();
};

// Function to render the appropriate icon
const renderSocialIcon = (iconName: string, className: string = "w-6 h-6") => {
  return <SocialIcon iconName={iconName} className={className} />;
};

export default function IntegrationsPage() {
  const params = useParams()
  const brandId = params.brandId as string
  const { accounts, loading, disconnectAccount, refetch } = useSocialAccounts(brandId)
  const { isAdmin, loading: roleLoading } = useUserRole(brandId)
  const [actionProvider, setActionProvider] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const accountsByProvider = useMemo(() => {
    const map = new Map<string, typeof accounts[number]>()
    accounts.forEach((account) => {
      map.set(account.provider.toLowerCase(), account)
    })
    return map
  }, [accounts])

  const handleConnect = async (providerId: string) => {
    if (!isAdmin) return
    setErrorMessage(null)
    setActionProvider(providerId)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        throw new Error('Unauthorized')
      }

      const response = await fetch(`/api/integrations/${providerId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ brandId }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to start connection flow.')
      }

      const data = await response.json()
      if (!data?.url) {
        throw new Error('Provider did not return an authorization URL.')
      }

      window.location.href = data.url as string
    } catch (error) {
      console.error('connect error', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start connection flow.')
      setActionProvider(null)
    }
  }

  const handleDisconnect = async (providerId: string) => {
    if (!isAdmin) return
    setErrorMessage(null)
    setActionProvider(providerId)
    try {
      await disconnectAccount(providerId)
      await refetch()
    } catch (error) {
      console.error('disconnect error', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to disconnect account.')
    } finally {
      setActionProvider(null)
    }
  }

  if (loading || roleLoading) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="p-4 sm:p-6 lg:p-10">
              <div className="mx-auto flex h-64 max-w-4xl items-center justify-center text-gray-500">
                Loading integrations…
              </div>
            </div>
          </div>
        </AppLayout>
      </RequireAuth>
    )
  }

  const connectedAccounts = accounts.filter((account) => account.status === 'connected')

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-10">
            <div className="mx-auto max-w-4xl space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Connect your brand’s social accounts to schedule and publish directly from Ferdy.
                </p>
              </div>

              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              {connectedAccounts.length > 0 && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-4">
                  <h3 className="text-sm font-medium text-indigo-900">Connected accounts</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {connectedAccounts.map((account) => (
                      <span
                        key={account.id}
                        className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800"
                      >
                        {account.provider} · {account.handle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {socialProviders.map((provider) => {
                  const connectedAccount = accountsByProvider.get(provider.id)
                  const isConnected = connectedAccount?.status === 'connected'
                  const isProcessing = actionProvider === provider.id
                  const disabledReason = !isAdmin
                    ? 'Only brand owners or admins can manage integrations.'
                    : isProcessing
                      ? 'Processing…'
                      : null

                  const connectLabel =
                    provider.id === 'instagram' ? 'Connect via Facebook' : isConnected ? 'Change connection' : 'Connect'

                  const showChange = isConnected && isAdmin

                  return (
                    <div
                      key={provider.id}
                      className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        {renderSocialIcon(provider.icon, 'w-10 h-10')}
                        {isConnected && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Connected
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                      <p className="mt-2 text-sm text-gray-600">{provider.description}</p>

                      {isConnected && (
                        <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                          Connected as <span className="font-medium text-gray-900">{connectedAccount?.handle}</span>
                        </div>
                      )}

                      <div className="mt-6 space-y-3">
                        <button
                          type="button"
                          onClick={() => (isConnected ? handleConnect(provider.id) : handleConnect(provider.id))}
                          disabled={!!disabledReason}
                          className={`w-full inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
                            disabledReason
                              ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                              : 'border border-transparent bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                          }`}
                          title={disabledReason || connectLabel}
                        >
                          {isProcessing ? 'Please wait…' : connectLabel}
                        </button>

                        {isConnected && (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            {showChange && (
                              <button
                                type="button"
                                onClick={() => handleConnect(provider.id)}
                                disabled={!!disabledReason}
                                className="flex-1 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-gray-400"
                              >
                                Change
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDisconnect(provider.id)}
                              disabled={!!disabledReason}
                              className="flex-1 inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-gray-400"
                            >
                              <UnlinkIcon className="mr-2 h-4 w-4" />
                              Disconnect
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-xl font-semibold text-gray-950">Connection requirements</h3>
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="text-base font-semibold text-gray-950">Facebook &amp; Instagram</h4>
                    <ul className="mt-3 space-y-2 text-sm text-gray-700">
                      <li>
                        <span className="font-semibold text-gray-900">Facebook:</span> You must be an admin of the
                        Facebook Page you want to connect.
                      </li>
                      <li>
                        <span className="font-semibold text-gray-900">Instagram:</span> Only Instagram Business or Creator
                        accounts linked to the connected Facebook Page can be used.
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-950">LinkedIn</h4>
                    <ul className="mt-3 space-y-2 text-sm text-gray-700">
                      <li>
                        <span className="font-semibold text-gray-900">LinkedIn:</span> Requires admin access to the company
                        page.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}
