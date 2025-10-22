import { useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

export interface DeleteAssetParams {
  assetId: string
  brandId: string
  storagePath: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function useDeleteAsset() {
  const [deleting, setDeleting] = useState(false)

  const deleteAsset = async ({ assetId, brandId, storagePath, onSuccess, onError }: DeleteAssetParams) => {
    try {
      setDeleting(true)


      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('ferdy_assets')
        .remove([storagePath])

      if (storageError) {
        console.warn('Error deleting from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId)
        .eq('brand_id', brandId)

      if (dbError) {
        throw dbError
      }

      onSuccess?.()
    } catch (error) {
      console.error('Error deleting asset:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete asset'
      onError?.(errorMessage)
    } finally {
      setDeleting(false)
    }
  }

  return {
    deleteAsset,
    deleting
  }
}
