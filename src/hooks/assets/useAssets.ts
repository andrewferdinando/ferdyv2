import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { getSignedUrl } from '@/lib/storage/getSignedUrl'
import { debugStorage } from '@/lib/storage/debugStorage'

export interface Asset {
  id: string
  brand_id: string
  title: string
  storage_path: string
  aspect_ratio: string
  tags: Tag[] // Changed from string[] to Tag[] - contains tag objects with id, name, kind
  tag_ids?: string[] // For backward compatibility and easier access
  crop_windows?: Record<string, unknown>
  width?: number
  height?: number
  created_at: string
  signed_url?: string
}

interface Tag {
  id: string
  name: string
  kind: 'subcategory' | 'custom'
}

export function useAssets(brandId: string) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Debug storage structure first
      await debugStorage()

      // Fetch assets with tags via asset_tags join
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          asset_tags (
            tag_id,
            tags (
              id,
              name,
              kind,
              is_active
            )
          )
        `)
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // Generate signed URLs and process tags for each asset
      console.log('📦 Assets from database:', data)
      const assetsWithUrls = await Promise.all(
        (data || []).map(async (asset: any) => {
          // Use public URL instead of signed URL for now
          const { getPublicUrl } = await import('@/lib/storage/getPublicUrl')
          const publicUrl = getPublicUrl(asset.storage_path)
          
          // Process tags from asset_tags join
          const assetTags: Tag[] = (asset.asset_tags || [])
            .filter((at: any) => at.tags && at.tags.is_active) // Only include active tags
            .map((at: any) => ({
              id: at.tags.id,
              name: at.tags.name,
              kind: at.tags.kind
            }))
          
          const tagIds = assetTags.map((tag: Tag) => tag.id)
          
          return { 
            ...asset, 
            signed_url: publicUrl,
            tags: assetTags,
            tag_ids: tagIds
          }
        })
      )

      setAssets(assetsWithUrls)
    } catch (err) {
      console.error('Error fetching assets:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch assets')
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    if (brandId) {
      fetchAssets()
    }
  }, [brandId, fetchAssets])

  const refetch = () => {
    fetchAssets()
  }

  // Helper function to save asset tags to asset_tags table
  const saveAssetTags = async (assetId: string, tagIds: string[]) => {
    try {
      // First, delete existing tags for this asset
      await supabase
        .from('asset_tags')
        .delete()
        .eq('asset_id', assetId)

      // Then, insert new tags
      if (tagIds.length > 0) {
        const assetTagsToInsert = tagIds.map(tagId => ({
          asset_id: assetId,
          tag_id: tagId
        }))

        const { error: insertError } = await supabase
          .from('asset_tags')
          .insert(assetTagsToInsert)

        if (insertError) {
          throw insertError
        }
      }

      // Refetch assets to get updated tag data
      await fetchAssets()
    } catch (err) {
      console.error('Error saving asset tags:', err)
      throw err
    }
  }

  // Fetch assets needing tags (from assets_needing_tags view)
  const fetchAssetsNeedingTags = async () => {
    try {
      const { data, error } = await supabase
        .from('assets_needing_tags')
        .select(`
          *,
          asset_tags (
            tag_id,
            tags (
              id,
              name,
              kind,
              is_active
            )
          )
        `)
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // Process tags similar to fetchAssets
      const assetsWithUrls = await Promise.all(
        (data || []).map(async (asset: any) => {
          const { getPublicUrl } = await import('@/lib/storage/getPublicUrl')
          const publicUrl = getPublicUrl(asset.storage_path)
          
          const assetTags: Tag[] = (asset.asset_tags || [])
            .filter((at: any) => at.tags && at.tags.is_active)
            .map((at: any) => ({
              id: at.tags.id,
              name: at.tags.name,
              kind: at.tags.kind
            }))
          
          return { 
            ...asset, 
            signed_url: publicUrl,
            tags: assetTags,
            tag_ids: assetTags.map((tag: Tag) => tag.id)
          }
        })
      )

      return assetsWithUrls
    } catch (err) {
      console.error('Error fetching assets needing tags:', err)
      throw err
    }
  }

  return {
    assets,
    loading,
    error,
    refetch,
    saveAssetTags,
    fetchAssetsNeedingTags
  }
}
