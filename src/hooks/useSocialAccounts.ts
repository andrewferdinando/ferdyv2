'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SocialAccount {
  id: string;
  brand_id: string;
  provider: 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'x';
  account_id: string;
  handle: string;
  token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  status: 'connected' | 'expired' | 'revoked' | 'error';
  connected_by_user_id: string;
  last_refreshed_at: string;
  created_at: string;
  connected_by: {
    full_name: string;
  };
}

export function useSocialAccounts(brandId: string) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) return;

    const fetchAccounts = async () => {
      if (!supabase) {
        console.log('useSocialAccounts: Supabase client not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('social_accounts')
          .select(`
            *,
            connected_by:profiles!social_accounts_connected_by_user_id_fkey(full_name)
          `)
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setAccounts(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch social accounts');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [brandId]);

  const disconnectAccount = async (accountId: string) => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      // TODO: Implement server action to revoke tokens and clear account
      const { error } = await supabase
        .from('social_accounts')
        .update({
          status: 'revoked',
          token_encrypted: null,
          refresh_token_encrypted: null
        })
        .eq('id', accountId);

      if (error) throw error;

      // Update local state
      setAccounts(prev => prev.map(account => 
        account.id === accountId 
          ? { ...account, status: 'revoked' as const }
          : account
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect account');
      throw err;
    }
  };

  const refreshAccount = async (accountId: string) => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      // TODO: Implement token refresh logic
      const { error } = await supabase
        .from('social_accounts')
        .update({
          last_refreshed_at: new Date().toISOString(),
          status: 'connected'
        })
        .eq('id', accountId);

      if (error) throw error;

      // Update local state
      setAccounts(prev => prev.map(account => 
        account.id === accountId 
          ? { ...account, status: 'connected' as const, last_refreshed_at: new Date().toISOString() }
          : account
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh account');
      throw err;
    }
  };

  return {
    accounts,
    loading,
    error,
    disconnectAccount,
    refreshAccount,
    refetch: () => {
      setLoading(true);
      setAccounts([]);
    }
  };
}
