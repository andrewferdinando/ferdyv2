import { useState, useEffect, useMemo, useRef } from 'react'
import { getSignedUrls } from '@/lib/storage/getSignedUrl'
import type { Asset } from './useAssets'

export interface AssetUrlEntry {
  signedUrl?: string
  thumbnailSignedUrl?: string
}

export function useAssetUrls(assets: Asset[]) {
  const [urlMap, setUrlMap] = useState<Map<string, AssetUrlEntry>>(new Map())
  const [loading, setLoading] = useState(false)
  const prevKeyRef = useRef('')

  // Build a stable key from the asset IDs so we only re-fetch when the set changes
  const assetKey = useMemo(
    () => assets.map((a) => a.id).join(','),
    [assets],
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

      // Collect all unique paths that need signing
      const pathSet = new Set<string>()
      for (const asset of assets) {
        if (asset.storage_path) pathSet.add(asset.storage_path)
        const isVideo = (asset.asset_type ?? 'image') === 'video'
        const thumbPath = asset.thumbnail_url || (isVideo ? undefined : asset.storage_path)
        if (thumbPath && thumbPath !== asset.storage_path) pathSet.add(thumbPath)
      }

      try {
        const signed = await getSignedUrls(Array.from(pathSet))
        if (cancelled) return

        const next = new Map<string, AssetUrlEntry>()
        for (const asset of assets) {
          const isVideo = (asset.asset_type ?? 'image') === 'video'
          const thumbPath = asset.thumbnail_url || (isVideo ? undefined : asset.storage_path)
          next.set(asset.id, {
            signedUrl: signed.get(asset.storage_path),
            thumbnailSignedUrl: thumbPath ? signed.get(thumbPath) : undefined,
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
  }, [assetKey, assets])

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
