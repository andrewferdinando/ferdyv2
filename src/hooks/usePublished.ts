'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
  assets?: {
    id: string;
    title: string;
    storage_path: string;
    aspect_ratio: string;
  }[];
}

export function usePublished(brandId: string) {
  const [published, setPublished] = useState<PublishedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) return;

    const fetchPublished = async () => {
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
            publishes!inner(
              id,
              published_at,
              external_post_id,
              external_url,
              status,
              error
            ),
            assets(
              id,
              title,
              storage_path,
              aspect_ratio
            )
          `)
          .eq('brand_id', brandId)
          .eq('post_jobs.status', 'published')
          .order('publishes.published_at', { ascending: false });

        if (error) throw error;

        setPublished(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch published posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPublished();
  }, [brandId]);

  return {
    published,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      setPublished([]);
    }
  };
}
