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
          // Use public URL instead of signed URL for now
          const { getPublicUrl } = await import('@/lib/storage/getPublicUrl')
          const publicUrl = getPublicUrl(asset.storage_path)
          
          return { ...asset, signed_url: publicUrl }
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
