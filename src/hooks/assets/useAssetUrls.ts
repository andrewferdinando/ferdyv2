import { useState, useEffect, useMemo, useRef } from 'react'
import { getSignedUrls, getSignedUrlsBatch } from '@/lib/storage/getSignedUrl'
import type { ImageTransform } from '@/lib/storage/getSignedUrl'
import type { Asset } from './useAssets'

export interface AssetUrlEntry {
  signedUrl?: string
  thumbnailSignedUrl?: string
}

export function useAssetUrls(assets: Asset[], transform?: ImageTransform) {
  const [urlMap, setUrlMap] = useState<Map<string, AssetUrlEntry>>(new Map())
  const [loading, setLoading] = useState(false)
  const prevKeyRef = useRef('')

  // Build a stable key from the asset IDs and transform so we re-fetch when either changes
  const transformKey = transform
    ? `::w${transform.width ?? ''}h${transform.height ?? ''}q${transform.quality ?? ''}`
    : ''
  const assetKey = useMemo(
    () => assets.map((a) => a.id).join(',') + transformKey,
    [assets, transformKey],
  )

  useEffect(() => {
    if (assets.length === 0) {
      setUrlMap(prev => prev.size > 0 ? new Map() : prev)
      return
    }

    // Skip if the set of assets hasn't changed
    if (assetKey === prevKeyRef.current) return
    prevKeyRef.current = assetKey

    let cancelled = false

    async function resolve() {
      setLoading(true)

      // Split paths: images need transforms, videos don't
      const transformPaths = new Set<string>()
      const plainPaths = new Set<string>()

      for (const asset of assets) {
        const isVideo = (asset.asset_type ?? 'image') === 'video'

        if (asset.storage_path) {
          if (transform && !isVideo) {
            // Image main files: sign with transform for grid thumbnails
            transformPaths.add(asset.storage_path)
          } else {
            // Video main files, or no transform requested: batch sign
            plainPaths.add(asset.storage_path)
          }
        }

        const thumbPath = asset.thumbnail_url || (isVideo ? undefined : asset.storage_path)
        if (thumbPath && thumbPath !== asset.storage_path) {
          if (transform) {
            // Thumbnail images: sign with transform
            transformPaths.add(thumbPath)
          } else {
            plainPaths.add(thumbPath)
          }
        }
      }

      try {
        // Resolve both groups in parallel
        const [transformedUrls, plainUrls] = await Promise.all([
          transformPaths.size > 0
            ? getSignedUrls(Array.from(transformPaths), transform)
            : new Map<string, string>(),
          plainPaths.size > 0
            ? getSignedUrlsBatch(Array.from(plainPaths))
            : new Map<string, string>(),
        ])

        if (cancelled) return

        // Merge results (transform URLs take priority for shared paths)
        const allUrls = new Map([...plainUrls, ...transformedUrls])

        const next = new Map<string, AssetUrlEntry>()
        for (const asset of assets) {
          const isVideo = (asset.asset_type ?? 'image') === 'video'
          const thumbPath = asset.thumbnail_url || (isVideo ? undefined : asset.storage_path)
          next.set(asset.id, {
            signedUrl: allUrls.get(asset.storage_path),
            thumbnailSignedUrl: thumbPath ? allUrls.get(thumbPath) : undefined,
          })
        }
        setUrlMap(next)
      } catch (err) {
        console.error('useAssetUrls: batch resolve failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    resolve()
    return () => {
      cancelled = true
    }
  }, [assetKey, assets, transform])

  return { urlMap, loading }
}

/**
 * Merge URL map entries back into asset objects for rendering.
 * Returns new array — does NOT mutate the originals.
 */
export function mergeAssetUrls(assets: Asset[], urlMap: Map<string, AssetUrlEntry>): Asset[] {
  if (urlMap.size === 0) return assets
  return assets.map((asset) => {
    const entry = urlMap.get(asset.id)
    if (!entry) return asset
    return {
      ...asset,
      signed_url: entry.signedUrl ?? asset.signed_url,
      thumbnail_signed_url: entry.thumbnailSignedUrl ?? asset.thumbnail_signed_url,
    }
  })
}
