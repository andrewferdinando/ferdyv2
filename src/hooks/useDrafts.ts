'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { normalizeHashtags } from '@/lib/utils/hashtags';
import type { Asset } from '@/hooks/assets/useAssets';
import { getSignedUrl } from '@/lib/storage/getSignedUrl';
import { fetchJobsByDraftId } from './usePostJobs';
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
      return;
    }

    const fetchDrafts = async () => {
      if (!supabase) {
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

        // Order by scheduled_for ascending (earliest first), nulls last
        const { data, error } = await query.order('scheduled_for', { ascending: true, nullsFirst: false });
        
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

        // Now fetch assets for each draft that has asset_ids, and normalize hashtags
        const draftsWithAssets = await Promise.all((data || []).map(async (draft: any) => {
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

        // Fetch post_jobs for all drafts and group by draft_id
        const draftIds = (data || []).map((draft: any) => draft.id).filter((id: any): id is string => Boolean(id));
        const jobsMap = await fetchJobsByDraftId(draftIds);
        setJobsByDraftId(jobsMap);

        // Backfill any drafts missing copy or assets (framework-created without client post-processing)
        // CRITICAL: Only backfill drafts that are truly missing assets - NEVER update asset_ids if they already exist
        const needsBackfill = (data || []).filter((d: any) => {
          const needsCopy = !d.copy || d.copy.trim() === '';
          const needsAssets = !d.asset_ids || !Array.isArray(d.asset_ids) || d.asset_ids.length === 0;
          return needsCopy || needsAssets;
        });
        
        if (needsBackfill.length > 0 && !backfillingRef.current) {
          backfillingRef.current = true;
          try {
            await Promise.all(needsBackfill.map(async (d: any) => {
              const updates: Partial<Pick<Draft, 'copy' | 'asset_ids'>> = {};
              
              // Only update copy if missing
              if (!d.copy || d.copy.trim() === '') {
                updates.copy = 'Post copy coming soon…';
              }
              
              // ONLY select and update asset_ids if they are truly missing
              // NEVER update asset_ids if they already exist (even if empty array - that's intentional)
              const hasAssets = d.asset_ids && Array.isArray(d.asset_ids) && d.asset_ids.length > 0;
              if (!hasAssets) {
                // Select image by subcategory tag when available; else fallback to any random active asset
                // CRITICAL: Only select assets that are tagged with THIS subcategory's tag
                let chosenAssetId: string | null = null;
                if (d.subcategory_id) {
                  const { data: tags } = await supabase
                    .from('tags')
                    .select('id')
                    .eq('subcategory_id', d.subcategory_id);
                  const tagIds = (tags || []).map((t: any) => t.id);
                  if (tagIds.length > 0) {
                    // Get assets linked to this specific subcategory's tags
                    const { data: assetTagRows } = await supabase
                      .from('asset_tags')
                      .select('asset_id')
                      .in('tag_id', tagIds);
                    const assetIds = (assetTagRows || []).map((r: any) => r.asset_id);
                    if (assetIds.length > 0) {
                      // Verify assets belong to correct brand AND are tagged with this subcategory's tag
                      const { data: match } = await supabase
                        .from('assets')
                        .select('id')
                        .eq('brand_id', d.brand_id)
                        .in('id', assetIds);
                      
                      if (match && match.length > 0) {
                        // CRITICAL: Verify all assets are tagged with this subcategory's tag
                        // This prevents selecting assets from other categories
                        const matchAssetIds = match.map((a: any) => a.id);
                        const { data: verifiedAssetTags } = await supabase
                          .from('asset_tags')
                          .select('asset_id')
                          .in('asset_id', matchAssetIds)
                          .in('tag_id', tagIds);
                        
                        const verifiedAssetIds: string[] = verifiedAssetTags
                          ? (Array.from(new Set(verifiedAssetTags.map((at: any) => at.asset_id as string))) as string[])
                          : [];
                        
                        if (verifiedAssetIds.length > 0) {
                          // Pick a random asset from verified assets only
                          chosenAssetId = verifiedAssetIds[Math.floor(Math.random() * verifiedAssetIds.length)];
                        }
                      }
                    }
                  }
                }

                if (!chosenAssetId) {
                  const { data: fallback } = await supabase
                    .from('assets')
                    .select('id')
                    .eq('brand_id', d.brand_id);
                  if (fallback && fallback.length > 0) {
                    // Pick a random asset in JavaScript since PostgREST doesn't support random() ordering
                    chosenAssetId = fallback[Math.floor(Math.random() * fallback.length)].id;
                  }
                }
                
                if (chosenAssetId) {
                  updates.asset_ids = [chosenAssetId];
                }
              }

              // Only update if there are changes to make
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
            
            const { data: refreshed, error: refetchError } = await refetchQuery.order('scheduled_for', { ascending: true, nullsFirst: false });
            
            if (refetchError) {
              console.error('useDrafts: Refetch error:', refetchError);
              throw refetchError;
            }
            const refreshedWithAssets = await Promise.all((refreshed || []).map(async (draft: any) => {
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

      const { data, error } = await query.order('scheduled_for', { ascending: true, nullsFirst: false });

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
      const draftsWithAssets = await Promise.all((data || []).map(async (draft: any) => {
        if (draft.asset_ids && draft.asset_ids.length > 0) {
          const assets = await loadAssetsByIds(draft.asset_ids);
          return { ...draft, assets };
        }
        return { ...draft, assets: [] };
      }));

      setDrafts(draftsWithAssets);

      // Fetch post_jobs for all drafts and group by draft_id
      const draftIds = (data || []).map((draft: any) => draft.id).filter((id: any): id is string => Boolean(id));
      const jobsMap = await fetchJobsByDraftId(draftIds);
      setJobsByDraftId(jobsMap);
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
    .map((at: any) => {
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

  const tagIds = tags.map((tag: any) => tag.id);
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
