'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { normalizeHashtags } from '@/lib/utils/hashtags';
import type { Asset } from '@/hooks/assets/useAssets';
import { getSignedUrl } from '@/lib/storage/getSignedUrl';
import { canonicalizeChannel, SUPPORTED_CHANNELS } from '@/lib/channels';
import type { PostJobSummary } from '@/types/postJobs';

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
  image_crops?: Record<string, { scale?: number; x?: number; y?: number }> | null;
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

type DraftStatus = 'draft' | 'scheduled' | 'partially_published' | 'published';

interface Draft {
  id: string;
  brand_id: string;
  post_job_id: string;
  channel: string;
  channels?: string[]; // optional array form from framework
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
  // Optional linkage from framework
  category_id?: string;
  subcategory_id?: string;
  status: DraftStatus;
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

const CHANNEL_ORDER = SUPPORTED_CHANNELS;
const CHANNEL_ORDER_INDEX = new Map(CHANNEL_ORDER.map((channel, index) => [channel, index]));

export function useDrafts(brandId: string, statuses: DraftStatus[] = ['draft']) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [jobsByDraftId, setJobsByDraftId] = useState<Record<string, PostJobSummary[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const backfillingRef = useRef(false);
  
  // Memoize statuses to prevent unnecessary refetches
  const statusesKey = useMemo(() => [...statuses].sort().join(','), [statuses]);

  useEffect(() => {
    if (!brandId) {
      console.log('useDrafts: No brandId provided');
      return;
    }

    const fetchDrafts = async () => {
      if (!supabase) {
        console.log('useDrafts: Supabase client not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch drafts with category/subcategory names from view
        const isDraftOnly = statuses.every((status) => status === 'draft');

        const query = supabase
          .from('drafts_with_labels')
          .select('*')
          .eq('brand_id', brandId)
          .in('status', statuses);

        // Only filter by approved if we're looking for drafts only
        if (isDraftOnly) {
          query.eq('approved', false);
        }

        // Order by created_at desc (matching working SQL query)
        const { data, error } = await query.order('created_at', { ascending: false });

        console.log('useDrafts: Query result:', { data, error });
        console.log('useDrafts: Raw data length:', data?.length || 0);
        
        if (error) {
          console.error('useDrafts: Query error:', error);
          console.error('useDrafts: Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          setError(error.message || 'Failed to fetch drafts');
          setDrafts([]); // Set empty array on error to prevent UI issues
          return; // Exit early on error to prevent further processing
        }

        if (data && data.length > 0) {
          console.log('useDrafts: First draft:', data[0]);
          console.log('useDrafts: First draft approved field:', data[0].approved);
        }

        // Now fetch assets for each draft that has asset_ids, and normalize hashtags
        const draftsWithAssets = await Promise.all((data || []).map(async (draft) => {
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

        setDrafts(draftsWithAssets);
        console.log('useDrafts: Set drafts:', draftsWithAssets?.length || 0, 'items');

        // Fetch post_jobs for all drafts and group by draft_id
        const draftIds = (data || []).map((draft) => draft.id).filter((id): id is string => Boolean(id));
        if (draftIds.length > 0) {
          const { data: jobsData, error: jobsError } = await supabase
            .from('post_jobs')
            .select('id, draft_id, channel, status, error, external_post_id, external_url, last_attempt_at')
            .in('draft_id', draftIds);

          if (jobsError) {
            console.error('useDrafts: Failed to load post_jobs', jobsError);
            setJobsByDraftId({});
          } else {
            const map: Record<string, PostJobSummary[]> = {};
            (jobsData ?? []).forEach((job) => {
              if (!job.draft_id) return;
              const canonical = canonicalizeChannel(job.channel) ?? job.channel;
              const entry: PostJobSummary = {
                id: job.id,
                draft_id: job.draft_id,
                channel: canonical,
                status: job.status,
                error: job.error ?? null,
                external_post_id: job.external_post_id ?? null,
                external_url: job.external_url ?? null,
                last_attempt_at: job.last_attempt_at ?? null,
              };

              if (!map[job.draft_id]) {
                map[job.draft_id] = [];
              }

              map[job.draft_id].push(entry);
            });

            // Sort jobs by channel order
            for (const draftId of Object.keys(map)) {
              map[draftId].sort((a, b) => {
                const aIndex = CHANNEL_ORDER_INDEX.get(a.channel) ?? Number.MAX_SAFE_INTEGER;
                const bIndex = CHANNEL_ORDER_INDEX.get(b.channel) ?? Number.MAX_SAFE_INTEGER;
                if (aIndex === bIndex) {
                  return a.channel.localeCompare(b.channel);
                }
                return aIndex - bIndex;
              });
            }

            setJobsByDraftId(map);
          }
        } else {
          setJobsByDraftId({});
        }

        // Backfill any drafts missing copy or assets (framework-created without client post-processing)
        const needsBackfill = (data || []).filter(d => (!d.copy || d.copy.trim() === '') || !d.asset_ids || d.asset_ids.length === 0);
        if (needsBackfill.length > 0 && !backfillingRef.current) {
          backfillingRef.current = true;
          try {
            await Promise.all(needsBackfill.map(async (d) => {
              // Select image by subcategory tag when available; else fallback to any random active asset
              let chosenAssetId: string | null = null;
              if (d.subcategory_id) {
                const { data: tags } = await supabase
                  .from('tags')
                  .select('id')
                  .eq('subcategory_id', d.subcategory_id);
                const tagIds = (tags || []).map(t => t.id);
                if (tagIds.length > 0) {
                  const { data: assetTagRows } = await supabase
                    .from('assets_tags')
                    .select('asset_id')
                    .in('tag_id', tagIds);
                  const assetIds = (assetTagRows || []).map(r => r.asset_id);
                  if (assetIds.length > 0) {
                    const { data: match } = await supabase
                      .from('assets')
                      .select('id')
                      .eq('brand_id', d.brand_id)
                      .eq('is_active', true)
                      .in('id', assetIds)
                      .order('random()')
                      .limit(1);
                    if (match && match.length > 0) {
                      chosenAssetId = match[0].id;
                    }
                  }
                }
              }

              if (!chosenAssetId) {
                const { data: fallback } = await supabase
                  .from('assets')
                  .select('id')
                  .eq('brand_id', d.brand_id)
                  .order('random()')
                  .limit(1);
                if (fallback && fallback.length > 0) {
                  chosenAssetId = fallback[0].id;
                }
              }

              const updates: Partial<Pick<Draft, 'copy' | 'asset_ids'>> = {};
              if (!d.copy || d.copy.trim() === '') {
                updates.copy = 'Post copy coming soon…';
              }
              if (chosenAssetId && (!d.asset_ids || d.asset_ids.length === 0)) {
                updates.asset_ids = [chosenAssetId];
              }

              if (Object.keys(updates).length > 0) {
                await supabase
                  .from('drafts')
                  .update(updates)
                  .eq('id', d.id);
              }
            }));

            // Refetch to load updated assets/copy
            const isDraftOnlyRefetch = statuses.every((status) => status === 'draft');
            const refetchQuery = supabase
              .from('drafts_with_labels')
              .select('*')
              .eq('brand_id', brandId)
              .in('status', statuses);
            
            if (isDraftOnlyRefetch) {
              refetchQuery.eq('approved', false);
            }
            
            const { data: refreshed, error: refetchError } = await refetchQuery.order('created_at', { ascending: false });
            
            if (refetchError) {
              console.error('useDrafts: Refetch error:', refetchError);
              throw refetchError;
            }
            const refreshedWithAssets = await Promise.all((refreshed || []).map(async (draft) => {
              if (draft.asset_ids && draft.asset_ids.length > 0) {
            const assets = await loadAssetsByIds(draft.asset_ids);
            return { ...draft, assets };
              }
              return { ...draft, assets: [] };
            }));
            setDrafts(refreshedWithAssets);
          } finally {
            backfillingRef.current = false;
          }
        }
      } catch (err) {
        console.error('useDrafts: Error fetching drafts:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch drafts';
        setError(errorMessage);
        setDrafts([]); // Set empty array on error
        // Don't throw - we've handled the error, prevent infinite refetch loops
      } finally {
        setLoading(false);
      }
    };

    fetchDrafts();
  }, [brandId, statusesKey]); // Use memoized statuses key to prevent refetch on array reference changes

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

      let nextAssets: Asset[] | undefined;
      if (updates.asset_ids && updates.asset_ids.length > 0) {
        nextAssets = await loadAssetsByIds(updates.asset_ids);
      }

      // Update local state
      setDrafts(prev =>
        prev.map(draft =>
          draft.id === draftId
            ? { ...draft, ...updates, ...(nextAssets ? { assets: nextAssets } : {}) }
            : draft,
        ),
      );

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
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      // Directly update the approved field to true and set scheduled_by
      const { data, error } = await supabase
        .from('drafts')
        .update({ 
          approved: true,
          status: 'scheduled',
          scheduled_by: user?.id || null
        })
        .eq('id', draftId)
        .select()
        .single();

      if (error) throw error;

      // Don't update local state immediately - let the parent component trigger a refetch
      // This ensures all hooks (drafts, scheduled, published) are synchronized
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
        // Fetch drafts with category/subcategory names from view
        const isDraftOnly = statuses.every((status) => status === 'draft');

        const query = supabase
          .from('drafts_with_labels')
          .select('*')
          .eq('brand_id', brandId)
          .in('status', statuses);

        if (isDraftOnly) {
          query.eq('approved', false);
        }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('useDrafts: Refetch error:', error);
        console.error('useDrafts: Refetch error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setError(error.message || 'Failed to fetch drafts');
        setDrafts([]);
        return;
      }

      // Now fetch assets for each draft that has asset_ids
      const draftsWithAssets = await Promise.all((data || []).map(async (draft) => {
        if (draft.asset_ids && draft.asset_ids.length > 0) {
          const assets = await loadAssetsByIds(draft.asset_ids);
          return { ...draft, assets };
        }
        return { ...draft, assets: [] };
      }));

      setDrafts(draftsWithAssets);

      // Fetch post_jobs for all drafts and group by draft_id
      const draftIds = (data || []).map((draft) => draft.id).filter((id): id is string => Boolean(id));
      if (draftIds.length > 0) {
        const { data: jobsData, error: jobsError } = await supabase
          .from('post_jobs')
          .select('id, draft_id, channel, status, error, external_post_id, external_url, last_attempt_at')
          .in('draft_id', draftIds);

        if (jobsError) {
          console.error('useDrafts: Failed to load post_jobs in refetch', jobsError);
          setJobsByDraftId({});
        } else {
          const map: Record<string, PostJobSummary[]> = {};
          (jobsData ?? []).forEach((job) => {
            if (!job.draft_id) return;
            const canonical = canonicalizeChannel(job.channel) ?? job.channel;
            const entry: PostJobSummary = {
              id: job.id,
              draft_id: job.draft_id,
              channel: canonical,
              status: job.status,
              error: job.error ?? null,
              external_post_id: job.external_post_id ?? null,
              external_url: job.external_url ?? null,
              last_attempt_at: job.last_attempt_at ?? null,
            };

            if (!map[job.draft_id]) {
              map[job.draft_id] = [];
            }

            map[job.draft_id].push(entry);
          });

          // Sort jobs by channel order
          for (const draftId of Object.keys(map)) {
            map[draftId].sort((a, b) => {
              const aIndex = CHANNEL_ORDER_INDEX.get(a.channel) ?? Number.MAX_SAFE_INTEGER;
              const bIndex = CHANNEL_ORDER_INDEX.get(b.channel) ?? Number.MAX_SAFE_INTEGER;
              if (aIndex === bIndex) {
                return a.channel.localeCompare(b.channel);
              }
              return aIndex - bIndex;
            });
          }

          setJobsByDraftId(map);
        }
      } else {
        setJobsByDraftId({});
      }
    } catch (err) {
      console.error('useDrafts: Refetch exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch drafts';
      setError(errorMessage);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    drafts,
    jobsByDraftId,
    loading,
    error,
    updateDraft,
    approveDraft,
    deleteDraft,
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
        image_crops,
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
    console.error('Error fetching assets by ids:', error);
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
    console.error('Failed to generate signed url for asset', raw.id, err);
  }

  const thumbnailPath = raw.thumbnail_url || (assetType === 'video' ? undefined : raw.storage_path);
  if (thumbnailPath) {
    try {
      thumbnailSignedUrl = await getSignedUrl(thumbnailPath);
    } catch (err) {
      console.error('Failed to generate thumbnail signed url for asset', raw.id, err);
    }
  }

  const imageCrops = raw.image_crops
    ? Object.fromEntries(
        Object.entries(raw.image_crops).map(([key, value]) => [
          key,
          {
            scale: typeof value?.scale === 'number' ? value.scale : 1,
            x: typeof value?.x === 'number' ? value.x : 0,
            y: typeof value?.y === 'number' ? value.y : 0,
          },
        ]),
      )
    : undefined;

  return {
    id: raw.id,
    brand_id: raw.brand_id,
    title: raw.title,
    storage_path: raw.storage_path,
    aspect_ratio: raw.aspect_ratio,
    crop_windows: raw.crop_windows,
    image_crops: imageCrops,
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
