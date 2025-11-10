import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { getSignedUrl } from '@/lib/storage/getSignedUrl'

export interface Asset {
  id: string
  brand_id: string
  title: string
  storage_path: string
  aspect_ratio: string
  tags: Tag[]
  tag_ids?: string[]
  crop_windows?: Record<string, unknown>
  width?: number
  height?: number
  created_at: string
  signed_url?: string
  thumbnail_url?: string | null
  thumbnail_signed_url?: string
  asset_type: 'image' | 'video'
  mime_type?: string | null
  file_size?: number | null
  duration_seconds?: number | null
}

interface Tag {
  id: string
  name: string
  kind: 'subcategory' | 'custom'
}

interface AssetFromDB {
  id: string
  brand_id: string
  title: string
  storage_path: string
  aspect_ratio: string
  crop_windows?: Record<string, unknown>
  width?: number
  height?: number
  created_at: string
  asset_type?: string | null
  mime_type?: string | null
  file_size?: number | null
  thumbnail_url?: string | null
  duration_seconds?: number | null
  asset_tags?: Array<{
    tag_id: string
    tags?: {
      id: string
      name: string
      kind: 'subcategory' | 'custom'
      is_active: boolean
    } | null
  }>
}

export function useAssets(brandId: string) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const buildSignedUrl = async (path?: string | null) => {
    if (!path) return undefined
    try {
      return await getSignedUrl(path)
    } catch (err) {
      console.error('Error generating signed URL for path:', path, err)
      return undefined
    }
  }

  const mapAsset = async (asset: AssetFromDB) => {
    const assetTags: Tag[] = (asset.asset_tags || [])
      .filter((at) => at.tags && at.tags.is_active)
      .map((at) => ({
        id: at.tags!.id,
        name: at.tags!.name,
        kind: at.tags!.kind,
      }))

    const tagIds = assetTags.map((tag) => tag.id)
    const assetType = (asset.asset_type as 'image' | 'video' | null) ?? 'image'

    const signedUrl = await buildSignedUrl(asset.storage_path)
    const thumbnailPath = asset.thumbnail_url || (assetType === 'video' ? undefined : asset.storage_path)
    const thumbnailSignedUrl = await buildSignedUrl(thumbnailPath)

    return {
      ...asset,
      asset_type: assetType,
      mime_type: asset.mime_type,
      file_size: asset.file_size,
      duration_seconds: asset.duration_seconds,
      thumbnail_url: thumbnailPath || null,
      signed_url: signedUrl,
      thumbnail_signed_url: thumbnailSignedUrl,
      tags: assetTags,
      tag_ids: tagIds,
    } as Asset
  }

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('assets')
        .select(
          `
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
          `,
        )
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      const assetsWithUrls = await Promise.all((data || []).map((asset: AssetFromDB) => mapAsset(asset)))
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

  const saveAssetTags = async (assetId: string, tagIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const createdBy = user?.id || null

      await supabase
        .from('asset_tags')
        .delete()
        .eq('asset_id', assetId)

      if (tagIds.length > 0) {
        const assetTagsToInsert = tagIds.map((tagId) => ({
          asset_id: assetId,
          tag_id: tagId,
          ...(createdBy && { created_by: createdBy }),
        }))

        const { error: insertError } = await supabase.from('asset_tags').insert(assetTagsToInsert)
        if (insertError) {
          throw insertError
        }
      }

      await fetchAssets()
    } catch (err) {
      console.error('Error saving asset tags:', err)
      throw err
    }
  }

  const fetchAssetsNeedingTags = async () => {
    try {
      const { data, error } = await supabase
        .from('assets_needing_tags')
        .select(
          `
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
          `,
        )
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      const assetsWithUrls = await Promise.all((data || []).map((asset: AssetFromDB) => mapAsset(asset)))
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
    fetchAssetsNeedingTags,
  }
}
