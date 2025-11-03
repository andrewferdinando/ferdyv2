'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { normalizeHashtags } from '@/lib/utils/hashtags';

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
  const backfillingRef = useRef(false);

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

        // Fetch drafts with category/subcategory names from view
        const query = supabase
          .from('drafts_with_labels')
          .select('*')
          .eq('brand_id', brandId)
          .eq('approved', false); // Only show non-approved drafts

        // Apply status filter if provided
        if (statusFilter) {
          // Temporarily disable status filter to debug
          console.log('useDrafts: Status filter disabled for debugging:', statusFilter);
          // query = query.not('post_jobs', 'is', null).in('post_jobs.status', statusFilter.split(','));
        }

        const { data, error } = await query
          .order('scheduled_for', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true });

        console.log('useDrafts: Query result:', { data, error });
        console.log('useDrafts: Raw data length:', data?.length || 0);
        if (data && data.length > 0) {
          console.log('useDrafts: First draft:', data[0]);
          console.log('useDrafts: First draft approved field:', data[0].approved);
        }

        if (error) {
          console.error('useDrafts: Query error:', error);
          throw error;
        }

        // Now fetch assets for each draft that has asset_ids, and normalize hashtags
        const draftsWithAssets = await Promise.all((data || []).map(async (draft) => {
          // Normalize hashtags
          const normalizedDraft = {
            ...draft,
            hashtags: normalizeHashtags(draft.hashtags || [])
          };
          
          if (draft.asset_ids && draft.asset_ids.length > 0) {
            const { data: assetsData, error: assetsError } = await supabase
              .from('assets')
              .select('id, title, storage_path, aspect_ratio')
              .in('id', draft.asset_ids);
            
            if (assetsError) {
              console.error('Error fetching assets for draft:', draft.id, assetsError);
              return { ...normalizedDraft, assets: [] };
            }
            
            return { ...normalizedDraft, assets: assetsData || [] };
          }
          return { ...normalizedDraft, assets: [] };
        }));

        setDrafts(draftsWithAssets);
        console.log('useDrafts: Set drafts:', draftsWithAssets?.length || 0, 'items');

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
            const refetchQuery = supabase
              .from('drafts_with_labels')
              .select('*')
              .eq('brand_id', brandId)
              .eq('approved', false)
              .order('scheduled_for', { ascending: true, nullsFirst: false })
              .order('created_at', { ascending: true });
            const { data: refreshed } = await refetchQuery;
            const refreshedWithAssets = await Promise.all((refreshed || []).map(async (draft) => {
              if (draft.asset_ids && draft.asset_ids.length > 0) {
                const { data: assetsData } = await supabase
                  .from('assets')
                  .select('id, title, storage_path, aspect_ratio')
                  .in('id', draft.asset_ids);
                return { ...draft, assets: assetsData || [] };
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
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      // Directly update the approved field to true and set scheduled_by
      const { data, error } = await supabase
        .from('drafts')
        .update({ 
          approved: true,
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
        const query = supabase
          .from('drafts_with_labels')
          .select('*')
          .eq('brand_id', brandId)
          .eq('approved', false); // Only show non-approved drafts

      // Apply status filter if provided
      if (statusFilter) {
        // Temporarily disable status filter to debug
        console.log('useDrafts: Status filter disabled for debugging in refetch:', statusFilter);
        // query = query.not('post_jobs', 'is', null).in('post_jobs.status', statusFilter.split(','));
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Now fetch assets for each draft that has asset_ids
      const draftsWithAssets = await Promise.all((data || []).map(async (draft) => {
        if (draft.asset_ids && draft.asset_ids.length > 0) {
          const { data: assetsData, error: assetsError } = await supabase
            .from('assets')
            .select('id, title, storage_path, aspect_ratio')
            .in('id', draft.asset_ids);
          
          if (assetsError) {
            console.error('Error fetching assets for draft:', draft.id, assetsError);
            return { ...draft, assets: [] };
          }
          
          return { ...draft, assets: assetsData || [] };
        }
        return { ...draft, assets: [] };
      }));

      setDrafts(draftsWithAssets);
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
