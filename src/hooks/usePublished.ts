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
      if (!supabase) {
        console.log('usePublished: Supabase client not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Published posts should have actual publish records, not just approved drafts
        // For now, return empty array since we don't have a publishes table yet
        // This will be implemented when we add the actual publishing functionality
        setPublished([]);
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
