'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';

interface Draft {
  id: string;
  brand_id: string;
  post_job_id: string;
  channel: string;
  copy: string;
  hashtags: string[];
  asset_ids: string[];
  tone: string;
  generated_by: 'ai' | 'human' | 'ai+human';
  created_by: string;
  created_at: string;
  approved: boolean;
  post_jobs: {
    id: string;
    scheduled_at: string;
    scheduled_local: string;
    scheduled_tz: string;
    status: string;
    target_month: string;
  };
  assets?: {
    id: string;
    title: string;
    storage_path: string;
    aspect_ratio: string;
  }[];
}

export function useDrafts(brandId: string, statusFilter?: string) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) {
      console.log('useDrafts: No brandId provided');
      return;
    }

    console.log('useDrafts: Fetching drafts for brandId:', brandId, 'statusFilter:', statusFilter);

    const fetchDrafts = async () => {
      if (!supabase) {
        console.log('useDrafts: Supabase client not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('drafts')
          .select(`
            *,
            post_jobs(
              id,
              scheduled_at,
              scheduled_local,
              scheduled_tz,
              status,
              target_month
            ),
            assets(
              id,
              title,
              storage_path,
              aspect_ratio
            )
          `)
          .eq('brand_id', brandId);

        // Apply status filter if provided
        if (statusFilter) {
          // Temporarily disable status filter to debug
          console.log('useDrafts: Status filter disabled for debugging:', statusFilter);
          // query = query.not('post_jobs', 'is', null).in('post_jobs.status', statusFilter.split(','));
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        console.log('useDrafts: Query result:', { data, error });
        console.log('useDrafts: Raw data length:', data?.length || 0);
        if (data && data.length > 0) {
          console.log('useDrafts: First draft:', data[0]);
        }

        if (error) {
          console.error('useDrafts: Query error:', error);
          throw error;
        }

        setDrafts(data || []);
        console.log('useDrafts: Set drafts:', data?.length || 0, 'items');
      } catch (err) {
        console.error('useDrafts: Error fetching drafts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch drafts');
      } finally {
        setLoading(false);
      }
    };

    fetchDrafts();
  }, [brandId, statusFilter]);

  const updateDraft = async (
    draftId: string,
    updates: {
      copy?: string;
      hashtags?: string[];
      asset_ids?: string[];
      channel?: string;
      scheduled_at?: string;
    }
  ) => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { data, error } = await supabase.rpc('rpc_update_draft', {
        p_draft_id: draftId,
        p_copy: updates.copy,
        p_hashtags: updates.hashtags,
        p_asset_ids: updates.asset_ids,
        p_channel: updates.channel,
        p_scheduled_at: updates.scheduled_at
      });

      if (error) throw error;

      // Update local state
      setDrafts(prev => prev.map(draft => 
        draft.id === draftId ? { ...draft, ...updates } : draft
      ));

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update draft');
      throw err;
    }
  };

  const approveDraft = async (draftId: string) => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { data, error } = await supabase.rpc('rpc_approve_draft', {
        p_draft_id: draftId
      });

      if (error) throw error;

      // Update local state
      setDrafts(prev => prev.map(draft => 
        draft.id === draftId ? { ...draft, approved: true } : draft
      ));

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve draft');
      throw err;
    }
  };

  const deleteDraft = async (draftId: string) => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { error } = await supabase.rpc('rpc_delete_draft', {
        p_draft_id: draftId
      });

      if (error) throw error;

      // Remove from local state
      setDrafts(prev => prev.filter(draft => draft.id !== draftId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete draft');
      throw err;
    }
  };

  const refetch = async () => {
    if (!supabase) {
      console.log('useDrafts: Supabase client not available for refetch');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('drafts')
        .select(`
          *,
          post_jobs(
            id,
            scheduled_at,
            scheduled_local,
            scheduled_tz,
            status,
            target_month
          ),
          assets(
            id,
            title,
            storage_path,
            aspect_ratio
          )
        `)
        .eq('brand_id', brandId);

      // Apply status filter if provided
      if (statusFilter) {
        // Temporarily disable status filter to debug
        console.log('useDrafts: Status filter disabled for debugging in refetch:', statusFilter);
        // query = query.not('post_jobs', 'is', null).in('post_jobs.status', statusFilter.split(','));
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setDrafts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch drafts');
    } finally {
      setLoading(false);
    }
  };

  return {
    drafts,
    loading,
    error,
    updateDraft,
    approveDraft,
    deleteDraft,
    refetch
  };
}
