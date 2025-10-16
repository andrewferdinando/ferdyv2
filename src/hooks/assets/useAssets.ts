import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { getSignedUrl } from '@/lib/storage/getSignedUrl'
import { debugStorage } from '@/lib/storage/debugStorage'
import { fixAssetPaths } from '@/lib/storage/fixAssetPaths'

export interface Asset {
  id: string
  brand_id: string
  title: string
  storage_path: string
  aspect_ratio: string
  tags: string[]
  crop_windows?: Record<string, unknown>
  width?: number
  height?: number
  created_at: string
  signed_url?: string
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
      
      // Fix asset paths to match actual file locations
      await fixAssetPaths(brandId)

      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // Generate signed URLs for each asset
      console.log('📦 Assets from database:', data)
      const assetsWithUrls = await Promise.all(
        (data || []).map(async (asset) => {
          console.log('🖼️ Processing asset:', asset.id, 'with storage_path:', asset.storage_path)
          
          // Try the original path first
          let signedUrl = null
          let actualPath = asset.storage_path
          
          try {
            signedUrl = await getSignedUrl(asset.storage_path)
            console.log('✅ Successfully generated signed URL for asset:', asset.id)
          } catch (urlError) {
            console.error('❌ Error generating signed URL for asset:', asset.id, urlError)
            console.error('❌ Storage path that failed:', asset.storage_path)
            
            // Try alternative path without brands/{brandId}/ prefix
            const alternativePath = asset.storage_path.replace(`brands/${brandId}/`, '')
            console.log('🔄 Trying alternative path:', alternativePath)
            
            try {
              signedUrl = await getSignedUrl(alternativePath)
              actualPath = alternativePath
              console.log('✅ Successfully generated signed URL with alternative path for asset:', asset.id)
            } catch (altError) {
              console.error('❌ Alternative path also failed:', alternativePath, altError)
              // Return asset without signed_url if both paths fail
              return { ...asset, signed_url: null }
            }
          }
          
          return { ...asset, signed_url: signedUrl }
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

  return {
    assets,
    loading,
    error,
    refetch
  }
}
