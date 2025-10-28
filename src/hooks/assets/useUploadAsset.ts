import { useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

export interface UploadAssetParams {
  file: File
  brandId: string
  onSuccess?: (assetId: string) => void
  onError?: (error: string) => void
}

export function useUploadAsset() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const uploadAsset = async ({ file, brandId, onSuccess, onError }: UploadAssetParams) => {
    try {
      setUploading(true)
      setProgress(0)

      // Generate asset ID and file extension
      const assetId = crypto.randomUUID()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      // Use the correct path structure: brands/{brandId}/originals/{assetId}.{ext}
      const path = `brands/${brandId}/originals/${assetId}.${ext}`


      // Upload to storage
      setProgress(25)
      console.log('📤 Uploading file to path:', path)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ferdy-assets')
        .upload(path, file, { upsert: false })

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        console.error('❌ Upload path:', path)
        throw uploadError
      }
      
      console.log('✅ Upload successful:', uploadData)

      setProgress(50)

      // Get image dimensions if it's an image
      let width: number | undefined
      let height: number | undefined

      if (file.type.startsWith('image/')) {
        try {
          const dimensions = await getImageDimensions(file)
          width = dimensions.width
          height = dimensions.height
        } catch (err) {
          console.warn('Could not get image dimensions:', err)
        }
      }

      setProgress(75)

      // Insert into assets table (tags are stored in asset_tags table, not here)
      const { error: insertError } = await supabase
        .from('assets')
        .insert({
          id: assetId,
          brand_id: brandId,
          title: file.name,
          storage_path: path,
          aspect_ratio: 'original',
          width,
          height
        })
        .select()
        .single()

      if (insertError) {
        // If insert fails, clean up the uploaded file
        await supabase.storage.from('ferdy-assets').remove([path])
        throw insertError
      }

      setProgress(100)
      onSuccess?.(assetId)
    } catch (error) {
      console.error('Error uploading asset:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload asset'
      onError?.(errorMessage)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return {
    uploadAsset,
    uploading,
    progress
  }
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
