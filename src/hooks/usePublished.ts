'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Asset } from '@/hooks/assets/useAssets';
import { normalizeHashtags } from '@/lib/utils/hashtags';
import { getSignedUrl } from '@/lib/storage/getSignedUrl';

type DraftStatus = 'draft' | 'scheduled' | 'partially_published' | 'published';

type RawAsset = {
  id: string;
  brand_id: string;
  title: string;
  storage_path: string;
  aspect_ratio: string;
  crop_windows?: Record<string, unknown>;
  image_crops?: Record<string, { scale?: number; x?: number; y?: number }> | null;
  width?: number;
  height?: number;
  created_at: string;
  asset_type?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
};

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
  published_at: string | null;
  scheduled_for: string | null;
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
        .order('published_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const publishedWithAssets = await Promise.all((data || []).map(async (draft) => {
        const normalizedDraft = {
          ...draft,
          hashtags: normalizeHashtags(draft.hashtags || []),
        };

        if (draft.asset_ids && draft.asset_ids.length > 0) {
          const assets = await loadAssetsByIds(draft.asset_ids);
          return { ...normalizedDraft, assets };
        }

        return { ...normalizedDraft, assets: [] as Asset[] };
      }));

      setPublished(publishedWithAssets as PublishedPost[]);
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

async function loadAssetsByIds(assetIds: string[]): Promise<Asset[]> {
  if (!supabase || assetIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('assets')
    .select(
      `
        id,
        brand_id,
        title,
        storage_path,
        aspect_ratio,
        crop_windows,
        image_crops,
        width,
        height,
        created_at,
        asset_type,
        mime_type,
        file_size,
        thumbnail_url,
        duration_seconds
      `,
    )
    .in('id', assetIds);

  if (error || !data) {
    console.error('usePublished: error fetching assets by ids', error);
    return [];
  }

  const assets = (data as RawAsset[]).map((raw) => ({
    id: raw.id,
    brand_id: raw.brand_id,
    title: raw.title,
    storage_path: raw.storage_path,
    aspect_ratio: raw.aspect_ratio,
    crop_windows: raw.crop_windows,
    image_crops: raw.image_crops,
    width: raw.width,
    height: raw.height,
    created_at: raw.created_at,
    asset_type: raw.asset_type,
    mime_type: raw.mime_type,
    file_size: raw.file_size,
    thumbnail_url: raw.thumbnail_url,
    duration_seconds: raw.duration_seconds,
  }));

  // Attempt to generate signed URLs for assets
  const withSignedUrls = await Promise.all(
    assets.map(async (asset) => {
      const signedUrl = await getSignedUrl(asset.storage_path);
      return {
        ...asset,
        signed_url: signedUrl,
      };
    }),
  );

  return withSignedUrls as Asset[];
}
