'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Asset } from '@/hooks/assets/useAssets';

type DraftStatus = 'draft' | 'scheduled' | 'partially_published' | 'published';

interface PublishedPost {
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
  status: DraftStatus;
  post_jobs: {
    id: string;
    scheduled_at: string;
    scheduled_local: string;
    scheduled_tz: string;
    status: string;
    target_month: string;
  };
  publishes: {
    id: string;
    published_at: string;
    external_post_id: string;
    external_url: string;
    status: string;
    error: string;
  };
  assets?: Asset[];
}

export function usePublished(brandId: string) {
  const [published, setPublished] = useState<PublishedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPublished = async () => {
    if (!brandId) {
      setPublished([]);
      setLoading(false);
      return;
    }

    if (!supabase) {
      console.log('usePublished: Supabase client not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('drafts_with_labels')
        .select('*')
        .eq('brand_id', brandId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalized = (data || []).map((draft) => ({
        ...draft,
        assets: [] as Asset[],
      })) as PublishedPost[];

      setPublished(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch published posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublished();
  }, [brandId]);

  return {
    published,
    loading,
    error,
    refetch: fetchPublished,
  };
}
