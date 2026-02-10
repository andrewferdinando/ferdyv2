import { useState, useEffect, useCallback, useRef } from 'react'
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
  image_crops?: Record<
    string,
    {
      scale: number
      x: number
      y: number
    }
  >
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
  image_crops?: Record<string, { scale?: number; x?: number; y?: number }> | null
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

function mapAsset(asset: AssetFromDB): Asset {
  const assetTags: Tag[] = (asset.asset_tags || [])
    .filter((at: any) => at.tags && at.tags.is_active)
    .map((at: any) => ({
      id: at.tags!.id,
      name: at.tags!.name,
      kind: at.tags!.kind,
    }))

  const tagIds = assetTags.map((tag: any) => tag.id)
  const assetType = (asset.asset_type as 'image' | 'video' | null) ?? 'image'
  const thumbnailPath = asset.thumbnail_url || (assetType === 'video' ? undefined : asset.storage_path)

  const imageCrops =
    asset.image_crops &&
    Object.fromEntries(
      Object.entries(asset.image_crops).map(([key, value]) => [
        key,
        {
          scale: typeof value?.scale === 'number' ? value.scale : 1,
          x: typeof value?.x === 'number' ? value.x : 0,
          y: typeof value?.y === 'number' ? value.y : 0,
        },
      ]),
    )

  return {
    ...asset,
    asset_type: assetType,
    mime_type: asset.mime_type,
    file_size: asset.file_size,
    duration_seconds: asset.duration_seconds,
    thumbnail_url: thumbnailPath || null,
    signed_url: undefined,
    thumbnail_signed_url: undefined,
    tags: assetTags,
    tag_ids: tagIds,
    image_crops: imageCrops ?? undefined,
  } as Asset
}

export interface UseAssetsOptions {
  onlyReady?: boolean
}

export function useAssets(brandId: string, options?: UseAssetsOptions) {
  const { onlyReady = false } = options || {}
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchIdRef = useRef(0)

  const fetchAssets = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current

    try {
      setLoading(true)
      setError(null)

      // If onlyReady is true, fetch IDs from assets_needing_tags to exclude them
      let assetsNeedingTagsIds: Set<string> = new Set()
      if (onlyReady) {
        const { data: needingTagsData, error: needingTagsError } = await supabase
          .from('assets_needing_tags')
          .select('id')
          .eq('brand_id', brandId)

        if (needingTagsError) {
          console.warn('Error fetching assets needing tags:', needingTagsError)
        } else {
          assetsNeedingTagsIds = new Set((needingTagsData || []).map((item: any) => item.id))
        }
      }

      const { data, error: fetchError } = await supabase
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

      if (fetchError) {
        throw fetchError
      }

      const mapped: Asset[] = (data || []).map((asset: AssetFromDB) => mapAsset(asset))

      const filteredAssets = onlyReady
        ? mapped.filter((asset) => !assetsNeedingTagsIds.has(asset.id))
        : mapped

      // Phase 1: instant render with metadata only (no signed URLs)
      setAssets(filteredAssets)
      setLoading(false)

      // Phase 2: resolve signed URLs in background, then update state
      if (filteredAssets.length > 0) {
        try {
          const withUrls = await Promise.all(
            filteredAssets.map(async (asset) => {
              try {
                const signedUrl = asset.storage_path
                  ? await getSignedUrl(asset.storage_path)
                  : undefined
                const isVideo = (asset.asset_type ?? 'image') === 'video'
                const thumbPath = asset.thumbnail_url || (isVideo ? undefined : asset.storage_path)
                const thumbnailSignedUrl = thumbPath && thumbPath !== asset.storage_path
                  ? await getSignedUrl(thumbPath)
                  : thumbPath === asset.storage_path
                    ? signedUrl
                    : undefined
                return { ...asset, signed_url: signedUrl, thumbnail_signed_url: thumbnailSignedUrl }
              } catch {
                return asset
              }
            }),
          )
          if (currentFetchId === fetchIdRef.current) {
            setAssets(withUrls)
          }
        } catch (urlErr) {
          console.error('useAssets: URL resolution failed', urlErr)
        }
      }
    } catch (err) {
      if (currentFetchId === fetchIdRef.current) {
        console.error('Error fetching assets:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch assets')
        setLoading(false)
      }
    }
  }, [brandId, onlyReady])

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

      const mapped: Asset[] = (data || []).map((asset: AssetFromDB) => mapAsset(asset))

      // Resolve signed URLs before returning
      const withUrls = await Promise.all(
        mapped.map(async (asset: Asset) => {
          try {
            const signedUrl = asset.storage_path
              ? await getSignedUrl(asset.storage_path)
              : undefined
            const isVideo = (asset.asset_type ?? 'image') === 'video'
            const thumbPath = asset.thumbnail_url || (isVideo ? undefined : asset.storage_path)
            const thumbnailSignedUrl = thumbPath && thumbPath !== asset.storage_path
              ? await getSignedUrl(thumbPath)
              : thumbPath === asset.storage_path
                ? signedUrl
                : undefined
            return { ...asset, signed_url: signedUrl, thumbnail_signed_url: thumbnailSignedUrl }
          } catch {
            return asset
          }
        }),
      )

      return withUrls
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
