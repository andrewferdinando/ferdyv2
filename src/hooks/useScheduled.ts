'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ScheduledPost {
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
  scheduled_for?: string; // UTC timestamp
  scheduled_for_nzt?: string; // NZT timestamp
  schedule_source?: 'manual' | 'auto';
  scheduled_by?: string;
  publish_status?: string;
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

export function useScheduled(brandId: string) {
  const [scheduled, setScheduled] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) return;

    const fetchScheduled = async () => {
      if (!supabase) {
        console.log('useScheduled: Supabase client not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('drafts')
          .select('*')
          .eq('brand_id', brandId)
          .eq('approved', true)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Now fetch assets for each scheduled post that has asset_ids
        const scheduledWithAssets = await Promise.all((data || []).map(async (draft) => {
          if (draft.asset_ids && draft.asset_ids.length > 0 && supabase) {
            const { data: assetsData, error: assetsError } = await supabase
              .from('assets')
              .select('id, title, storage_path, aspect_ratio')
              .in('id', draft.asset_ids);
            
            if (assetsError) {
              console.error('Error fetching assets for scheduled post:', draft.id, assetsError);
              return { ...draft, assets: [] };
            }
            
            return { ...draft, assets: assetsData || [] };
          }
          return { ...draft, assets: [] };
        }));

        setScheduled(scheduledWithAssets);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch scheduled posts');
      } finally {
        setLoading(false);
      }
    };

    fetchScheduled();
  }, [brandId]);

  const refetch = async () => {
    if (!brandId) return;

    const fetchScheduled = async () => {
      if (!supabase) {
        console.log('useScheduled: Supabase client not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('drafts')
          .select('*')
          .eq('brand_id', brandId)
          .eq('approved', true)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Now fetch assets for each scheduled post that has asset_ids
        const scheduledWithAssets = await Promise.all((data || []).map(async (draft) => {
          if (draft.asset_ids && draft.asset_ids.length > 0 && supabase) {
            const { data: assetsData, error: assetsError } = await supabase
              .from('assets')
              .select('id, title, storage_path, aspect_ratio')
              .in('id', draft.asset_ids);
            
            if (assetsError) {
              console.error('Error fetching assets for scheduled post:', draft.id, assetsError);
              return { ...draft, assets: [] };
            }
            
            return { ...draft, assets: assetsData || [] };
          }
          return { ...draft, assets: [] };
        }));

        setScheduled(scheduledWithAssets);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch scheduled posts');
      } finally {
        setLoading(false);
      }
    };

    await fetchScheduled();
  };

  return {
    scheduled,
    loading,
    error,
    refetch
  };
}
