import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export interface UpdateAssetParams {
  assetId: string
  brandId: string
  updates: {
    title?: string
    tags?: string[]
    aspect_ratio?: string
    crop_windows?: any
  }
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function useUpdateAsset() {
  const [updating, setUpdating] = useState(false)

  const updateAsset = async ({ assetId, brandId, updates, onSuccess, onError }: UpdateAssetParams) => {
    try {
      setUpdating(true)

      const supabase = createClient()
      const { error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', assetId)
        .eq('brand_id', brandId)

      if (error) {
        throw error
      }

      onSuccess?.()
    } catch (error) {
      console.error('Error updating asset:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update asset'
      onError?.(errorMessage)
    } finally {
      setUpdating(false)
    }
  }

  return {
    updateAsset,
    updating
  }
}
