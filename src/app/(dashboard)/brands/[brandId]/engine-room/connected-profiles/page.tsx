'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { useSocialAccounts } from '@/hooks/useSocialAccounts'
import { supabase } from '@/lib/supabase-browser'

/* ------------------------------------------------------------------ */
/*  Inline icon components (no external icon library)                  */
/* ------------------------------------------------------------------ */

const ArrowLeftIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
)

const ExternalLinkIcon = ({ className = 'h-3 w-3' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
)

const RefreshIcon = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
  </svg>
)

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProfileData {
  // Shared
  profilePictureUrl?: string | null
  accountType?: string | null
  website?: string | null
  profileLastFetchedAt?: string | null

  // Instagram
  igUserId?: string | null
  username?: string | null
  name?: string | null
  biography?: string | null
  followersCount?: number | null
  followsCount?: number | null
  mediaCount?: number | null

  // Facebook
  pageId?: string | null
  pageName?: string | null
  category?: string | null
  about?: string | null
  fanCount?: number | null
  pageLink?: string | null
  singleLineAddress?: string | null
  phone?: string | null

  [key: string]: unknown
}

type ProviderState = {
  loading: boolean
  error: string | null
  profile: ProfileData | null
  refreshing: boolean
}

/* ------------------------------------------------------------------ */
/*  Icons (inline SVGs matching integrations page)                     */
/* ------------------------------------------------------------------ */

const FacebookIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

const InstagramIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
)

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}

function DetailRow({
  label,
  value,
  isLink,
  secondary,
}: {
  label: string
  value: string | null | undefined
  isLink?: boolean
  secondary?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {isLink ? (
        <a
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
        >
          {value}
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
      ) : (
        <span className={`text-sm ${secondary ? 'text-gray-400' : 'text-gray-900'}`}>
          {value}
        </span>
      )}
    </div>
  )
}

function RefreshButton({
  refreshing,
  onClick,
}: {
  refreshing: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={refreshing}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
    >
      <RefreshIcon className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
      {refreshing ? 'Refreshing…' : 'Refresh'}
    </button>
  )
}

function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="h-32 bg-gray-200" />
      <div className="space-y-3 p-6">
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
        <div className="flex gap-6 pt-2">
          <div className="h-10 w-16 rounded bg-gray-200" />
          <div className="h-10 w-16 rounded bg-gray-200" />
          <div className="h-10 w-16 rounded bg-gray-200" />
        </div>
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-3/4 rounded bg-gray-200" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Instagram Profile Card                                             */
/* ------------------------------------------------------------------ */

function InstagramProfileCard({
  state,
  onRefresh,
}: {
  state: ProviderState
  onRefresh: () => void
}) {
  const p = state.profile

  if (state.error === 'token_expired') {
    return (
      <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#833AB4] via-[#C13584] to-[#F77737] px-6 py-5">
          <div className="flex items-center gap-3">
            <InstagramIcon className="h-8 w-8 text-white" />
            <h2 className="text-lg font-bold text-white">Instagram</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Your Instagram connection has expired. Please reconnect from the{' '}
            <Link href=".." className="font-medium underline">
              Integrations page
            </Link>
            .
          </div>
        </div>
      </div>
    )
  }

  if (state.loading || !p) return <CardSkeleton />

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#833AB4] via-[#C13584] to-[#F77737] px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <InstagramIcon className="h-8 w-8 text-white" />
            <h2 className="text-lg font-bold text-white">Instagram</h2>
          </div>
          <RefreshButton refreshing={state.refreshing} onClick={onRefresh} />
        </div>
      </div>

      <div className="p-6">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          {p.profilePictureUrl ? (
            <img
              src={p.profilePictureUrl}
              alt={p.name ?? 'Instagram profile'}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <InstagramIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-gray-900">{p.name ?? 'Instagram Account'}</h3>
            {p.username && (
              <p className="text-sm text-gray-500">@{p.username}</p>
            )}
            {p.accountType && (
              <span className="mt-1 inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                {p.accountType}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 flex justify-around rounded-lg bg-gray-50 py-3">
          <StatItem label="Posts" value={formatNumber(p.mediaCount)} />
          <StatItem label="Followers" value={formatNumber(p.followersCount)} />
          <StatItem label="Following" value={formatNumber(p.followsCount)} />
        </div>

        {/* Details */}
        <div className="mt-4 divide-y divide-gray-100">
          <DetailRow label="Biography" value={p.biography as string | null} />
          <DetailRow label="Website" value={p.website as string | null} isLink />
          <DetailRow label="Account ID" value={p.igUserId as string | null} secondary />
        </div>

        {/* Footer */}
        <div className="mt-4 text-xs text-gray-400">
          Last fetched: {timeAgo(p.profileLastFetchedAt)}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Facebook Page Profile Card                                         */
/* ------------------------------------------------------------------ */

function FacebookProfileCard({
  state,
  onRefresh,
}: {
  state: ProviderState
  onRefresh: () => void
}) {
  const p = state.profile

  if (state.error === 'token_expired') {
    return (
      <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
        <div className="bg-[#1877F2] px-6 py-5">
          <div className="flex items-center gap-3">
            <FacebookIcon className="h-8 w-8 text-white" />
            <h2 className="text-lg font-bold text-white">Facebook Page</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Your Facebook connection has expired. Please reconnect from the{' '}
            <Link href=".." className="font-medium underline">
              Integrations page
            </Link>
            .
          </div>
        </div>
      </div>
    )
  }

  if (state.loading || !p) return <CardSkeleton />

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="bg-[#1877F2] px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FacebookIcon className="h-8 w-8 text-white" />
            <h2 className="text-lg font-bold text-white">Facebook Page</h2>
          </div>
          <RefreshButton refreshing={state.refreshing} onClick={onRefresh} />
        </div>
      </div>

      <div className="p-6">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          {p.profilePictureUrl ? (
            <img
              src={p.profilePictureUrl}
              alt={p.pageName ?? 'Facebook page'}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <FacebookIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-gray-900">{p.pageName ?? 'Facebook Page'}</h3>
            {p.category && (
              <p className="text-sm text-gray-500">{p.category}</p>
            )}
            {p.accountType && (
              <span className="mt-1 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {p.accountType}
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="mt-4 divide-y divide-gray-100">
          <DetailRow label="About" value={p.about as string | null} />
          <DetailRow label="Website" value={p.website as string | null} isLink />
          <DetailRow label="Facebook URL" value={p.pageLink as string | null} isLink />
          <DetailRow label="Address" value={p.singleLineAddress as string | null} />
          <DetailRow label="Phone" value={p.phone as string | null} />
          <DetailRow label="Page ID" value={p.pageId as string | null} secondary />
        </div>

        {/* Footer */}
        <div className="mt-4 text-xs text-gray-400">
          Last fetched: {timeAgo(p.profileLastFetchedAt)}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ConnectedProfilesPage() {
  const params = useParams()
  const brandId = params.brandId as string
  const { accounts, loading: accountsLoading } = useSocialAccounts(brandId)

  const [ig, setIg] = useState<ProviderState>({
    loading: true,
    error: null,
    profile: null,
    refreshing: false,
  })
  const [fb, setFb] = useState<ProviderState>({
    loading: true,
    error: null,
    profile: null,
    refreshing: false,
  })

  const igConnected = accounts.some(a => a.provider === 'instagram' && a.status === 'connected')
  const fbConnected = accounts.some(a => a.provider === 'facebook' && a.status === 'connected')

  const fetchProfile = useCallback(
    async (provider: 'instagram' | 'facebook', forceRefresh = false) => {
      const setter = provider === 'instagram' ? setIg : setFb

      if (forceRefresh) {
        setter(prev => ({ ...prev, refreshing: true }))
      } else {
        setter(prev => ({ ...prev, loading: true }))
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) {
          setter({ loading: false, error: 'Not authenticated', profile: null, refreshing: false })
          return
        }

        const url = `/api/integrations/${provider}/full-profile?brandId=${brandId}${forceRefresh ? '&force_refresh=true' : ''}`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (res.status === 401) {
          const body = await res.json().catch(() => ({}))
          if (body.error === 'token_expired') {
            setter({ loading: false, error: 'token_expired', profile: null, refreshing: false })
            return
          }
        }

        if (!res.ok) {
          setter({ loading: false, error: 'Failed to load profile', profile: null, refreshing: false })
          return
        }

        const data = await res.json()
        setter({ loading: false, error: null, profile: data.profile, refreshing: false })
      } catch {
        setter({ loading: false, error: 'Network error', profile: null, refreshing: false })
      }
    },
    [brandId],
  )

  // Fetch profiles once accounts are loaded
  useEffect(() => {
    if (accountsLoading) return
    if (igConnected) fetchProfile('instagram')
    else setIg({ loading: false, error: null, profile: null, refreshing: false })
    if (fbConnected) fetchProfile('facebook')
    else setFb({ loading: false, error: null, profile: null, refreshing: false })
  }, [accountsLoading, igConnected, fbConnected, fetchProfile])

  const noneConnected = !accountsLoading && !igConnected && !fbConnected

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Header */}
            <div>
              <Link
                href={`/brands/${brandId}/engine-room/integrations`}
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to Integrations
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Connected Profiles</h1>
              <p className="mt-2 text-sm text-gray-600">
                Full profile information retrieved from your connected social accounts.
              </p>
            </div>

            {/* Empty state */}
            {noneConnected && (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                <p className="text-gray-500">No social accounts are connected yet.</p>
                <Link
                  href={`/brands/${brandId}/engine-room/integrations`}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Go to Integrations
                </Link>
              </div>
            )}

            {/* Profile cards */}
            {!noneConnected && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {igConnected && (
                  <InstagramProfileCard
                    state={ig}
                    onRefresh={() => fetchProfile('instagram', true)}
                  />
                )}
                {fbConnected && (
                  <FacebookProfileCard
                    state={fb}
                    onRefresh={() => fetchProfile('facebook', true)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
