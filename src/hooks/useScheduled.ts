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
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('drafts')
          .select(`
            *,
            post_jobs!inner(
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
          .eq('brand_id', brandId)
          .eq('approved', true)
          .in('post_jobs.status', ['ready', 'publishing'])
          .order('post_jobs.scheduled_at', { ascending: true });

        if (error) throw error;

        setScheduled(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch scheduled posts');
      } finally {
        setLoading(false);
      }
    };

    fetchScheduled();
  }, [brandId]);

  return {
    scheduled,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      setScheduled([]);
    }
  };
}
