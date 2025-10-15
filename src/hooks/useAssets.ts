'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Asset {
  id: string;
  brand_id: string;
  title: string;
  storage_path: string;
  width: number;
  height: number;
  aspect_ratio: 'original' | '1:1' | '4:5' | '1.91:1';
  crop_windows: any;
  tags: string[];
  created_at: string;
}

export function useAssets(brandId: string, readyOnly: boolean = false) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) return;

    const fetchAssets = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('assets')
          .select('*')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false });

        // If readyOnly is true, filter assets that have proper metadata
        if (readyOnly) {
          query = query.not('title', 'is', null);
        }

        const { data, error } = await query;

        if (error) throw error;

        setAssets(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch assets');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [brandId, readyOnly]);

  const updateAsset = async (assetId: string, updates: Partial<Asset>) => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', assetId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setAssets(prev => prev.map(asset => 
        asset.id === assetId ? { ...asset, ...updates } : asset
      ));

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update asset');
      throw err;
    }
  };

  const deleteAsset = async (assetId: string) => {
    try {
      // Check if asset is referenced by any drafts
      const { data: drafts, error: checkError } = await supabase
        .from('drafts')
        .select('id')
        .eq('brand_id', brandId)
        .contains('asset_ids', [assetId]);

      if (checkError) throw checkError;

      if (drafts && drafts.length > 0) {
        throw new Error('Cannot delete asset: it is referenced by existing drafts');
      }

      // Delete the asset
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId);

      if (error) throw error;

      // Remove from local state
      setAssets(prev => prev.filter(asset => asset.id !== assetId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete asset');
      throw err;
    }
  };

  return {
    assets,
    loading,
    error,
    updateAsset,
    deleteAsset,
    refetch: () => {
      setLoading(true);
      setAssets([]);
    }
  };
}
