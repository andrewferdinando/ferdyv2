'use client';

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type SocialAccountSummary = {
  id: string
  brand_id: string
  provider: 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'x'
  account_id: string
  handle: string
  status: 'connected' | 'expired' | 'revoked' | 'error'
  token_expires_at: string | null
  last_refreshed_at: string | null
  connected_by_user_id: string | null
  created_at: string
  metadata: Record<string, unknown> | null
  connected_by?: {
    full_name: string | null
  } | null
  // Computed fields for display
  daysUntilExpiry?: number | null
  isExpiringSoon?: boolean
}

export function useSocialAccounts(brandId: string) {
  const [accounts, setAccounts] = useState<SocialAccountSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    if (!brandId) {
      setAccounts([])
      setLoading(false)
      return
    }

    if (!supabase) {
      console.warn('useSocialAccounts: Supabase client not available')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: accountsError } = await supabase
        .from('social_accounts')
        .select(
          `
            id,
            brand_id,
            provider,
            account_id,
            handle,
            status,
            token_expires_at,
            last_refreshed_at,
            connected_by_user_id,
            created_at,
            metadata
          `,
        )
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })

      if (accountsError) {
        throw accountsError
      }

      const socialAccounts = (data ?? []) as Omit<SocialAccountSummary, 'connected_by'>[]
      const userIds = Array.from(
        new Set(
          socialAccounts
            .map((account: any) => account.connected_by_user_id)
            .filter((id: any): id is string => typeof id === 'string' && id.length > 0),
        ),
      )

      let userNameLookup: Record<string, { full_name: string | null }> = {}

      if (userIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds)

        if (profileError) {
          console.warn('useSocialAccounts: failed to load profile names', profileError)
        } else {
          userNameLookup = (profileData ?? []).reduce<Record<string, { full_name: string | null }>>(
            (acc, profile) => {
              acc[profile.user_id] = { full_name: profile.full_name ?? null }
              return acc
            },
            {},
          )
        }
      }

      const now = new Date()
      const normalized: SocialAccountSummary[] = socialAccounts.map((account: any) => {
        let daysUntilExpiry: number | null = null
        let isExpiringSoon = false

        if (account.token_expires_at) {
          const expiryDate = new Date(account.token_expires_at)
          const diffMs = expiryDate.getTime() - now.getTime()
          daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
          isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry > 0
        }

        return {
          ...account,
          connected_by: account.connected_by_user_id
            ? userNameLookup[account.connected_by_user_id] ?? null
            : null,
          daysUntilExpiry,
          isExpiringSoon,
        }
      })

      setAccounts(normalized)
    } catch (err) {
      console.error('useSocialAccounts: fetch error', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch social accounts')
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const disconnectAccount = useCallback(
    async (provider: string) => {
      try {
        const client = supabase
        if (!client) {
          throw new Error('Supabase client not available')
        }

        const { data: sessionData } = await client.auth.getSession()
        const accessToken = sessionData.session?.access_token

        if (!accessToken) {
          throw new Error('Unauthorized')
        }

        const response = await fetch(`/api/integrations/${provider}/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ brandId }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || 'Failed to disconnect account')
        }

        await fetchAccounts()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to disconnect account')
        throw err
      }
    },
    [brandId, fetchAccounts],
  )

  return {
    accounts,
    loading,
    error,
    disconnectAccount,
    refetch: fetchAccounts,
  }
}
