'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { normalizeHashtags } from '@/lib/utils/hashtags';
import type { Asset } from '@/hooks/assets/useAssets';
import { getSignedUrl } from '@/lib/storage/getSignedUrl';

type Tag = {
  id: string;
  name: string;
  kind: 'subcategory' | 'custom';
};

type RawAsset = {
  id: string;
  brand_id: string;
  title: string;
  storage_path: string;
  aspect_ratio: string;
  crop_windows?: Record<string, unknown>;
  width?: number;
  height?: number;
  created_at: string;
  asset_type?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  asset_tags?: Array<{
    tag_id: string;
    tags?:
      | {
          id: string;
          name: string;
          kind: 'subcategory' | 'custom';
          is_active: boolean;
        }
      | Array<{
          id: string;
          name: string;
          kind: 'subcategory' | 'custom';
          is_active: boolean;
        }>
      | null;
  }>;
};

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
  // From drafts_with_labels view
  category_name?: string;
  subcategory_name?: string;
  post_jobs: {
    id: string;
    scheduled_at: string;
    scheduled_local: string;
    scheduled_tz: string;
    status: string;
    target_month: string;
  };
  assets?: Asset[];
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
          .from('drafts_with_labels')
          .select('*')
          .eq('brand_id', brandId)
          .eq('approved', true)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Now fetch assets for each scheduled post that has asset_ids, and normalize hashtags
        const scheduledWithAssets = await Promise.all((data || []).map(async (draft) => {
          // Normalize hashtags
          const normalizedDraft = {
            ...draft,
            hashtags: normalizeHashtags(draft.hashtags || [])
          };
          
          if (draft.asset_ids && draft.asset_ids.length > 0) {
            const assets = await loadAssetsByIds(draft.asset_ids);
            return { ...normalizedDraft, assets };
          }
          return { ...normalizedDraft, assets: [] };
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
          .from('drafts_with_labels')
          .select('*')
          .eq('brand_id', brandId)
          .eq('approved', true)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Now fetch assets for each scheduled post that has asset_ids, and normalize hashtags
        const scheduledWithAssets = await Promise.all((data || []).map(async (draft) => {
          // Normalize hashtags
          const normalizedDraft = {
            ...draft,
            hashtags: normalizeHashtags(draft.hashtags || [])
          };
          
          if (draft.asset_ids && draft.asset_ids.length > 0) {
            const assets = await loadAssetsByIds(draft.asset_ids);
            return { ...normalizedDraft, assets };
          }
          return { ...normalizedDraft, assets: [] };
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
        width,
        height,
        created_at,
        asset_type,
        mime_type,
        file_size,
        thumbnail_url,
        duration_seconds,
        asset_tags (
          tag_id,
          tags (
            id,
            name,
            kind,
            is_active
          )
        )
      `,
    )
    .in('id', assetIds);

  if (error || !data) {
    console.error('Error fetching scheduled assets by ids:', error);
    return [];
  }

  return Promise.all(data.map(mapRawAssetToAsset));
}

async function mapRawAssetToAsset(raw: RawAsset): Promise<Asset> {
  const tags: Tag[] = (raw.asset_tags || [])
    .map((at) => {
      const tag = Array.isArray(at.tags) ? at.tags[0] : at.tags;
      return tag && tag.is_active
        ? {
            id: tag.id,
            name: tag.name,
            kind: tag.kind,
          }
        : null;
    })
    .filter((tag): tag is Tag => Boolean(tag));

  const tagIds = tags.map((tag) => tag.id);
  const assetType = raw.asset_type === 'video' ? 'video' : 'image';

  let signedUrl: string | undefined;
  let thumbnailSignedUrl: string | undefined;

  try {
    signedUrl = await getSignedUrl(raw.storage_path);
  } catch (err) {
    console.error('Failed to generate signed url for scheduled asset', raw.id, err);
  }

  const thumbnailPath = raw.thumbnail_url || (assetType === 'video' ? undefined : raw.storage_path);
  if (thumbnailPath) {
    try {
      thumbnailSignedUrl = await getSignedUrl(thumbnailPath);
    } catch (err) {
      console.error('Failed to generate thumbnail signed url for scheduled asset', raw.id, err);
    }
  }

  return {
    id: raw.id,
    brand_id: raw.brand_id,
    title: raw.title,
    storage_path: raw.storage_path,
    aspect_ratio: raw.aspect_ratio,
    crop_windows: raw.crop_windows,
    width: raw.width,
    height: raw.height,
    created_at: raw.created_at,
    asset_type: assetType,
    mime_type: raw.mime_type,
    file_size: raw.file_size,
    thumbnail_url: raw.thumbnail_url ?? null,
    duration_seconds: raw.duration_seconds,
    signed_url: signedUrl,
    thumbnail_signed_url: thumbnailSignedUrl,
    tags,
    tag_ids: tagIds,
  };
}
