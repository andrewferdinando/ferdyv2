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
  connected_by_user_id: string
  created_at: string
  connected_by?: {
    full_name: string | null
  } | null
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

        const { data, error } = await supabase
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
            connected_by:profiles!social_accounts_connected_by_user_id_fkey(full_name)
          `,
        )
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        const normalized = (data || []).map((account: any) => ({
          ...account,
          connected_by: Array.isArray(account.connected_by)
            ? account.connected_by[0] ?? null
            : account.connected_by ?? null,
        }))

        setAccounts(normalized as SocialAccountSummary[])
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
        const response = await fetch(`/api/integrations/${provider}/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
