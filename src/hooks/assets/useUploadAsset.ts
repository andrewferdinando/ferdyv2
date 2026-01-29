import { useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

// Meta requirements for images (client-side constants)
const META_IMAGE_REQUIREMENTS = {
  recommendedMinWidth: 600,
  recommendedMinHeight: 600,
  unsupportedFormats: ['image/gif', 'image/webp'],
}

export interface UploadAssetParams {
  file: File
  brandId: string
  onSuccess?: (assetId: string) => void
  onError?: (error: string) => void
  onWarning?: (warning: string) => void // Optional callback for non-blocking warnings
}

export function useUploadAsset() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const uploadAsset = async ({ file, brandId, onSuccess, onError, onWarning }: UploadAssetParams) => {
    try {
      setUploading(true)
      setProgress(0)

      const assetId = crypto.randomUUID()
      const isVideo = file.type.startsWith('video/')

      if (isVideo && file.type !== 'video/mp4') {
        throw new Error('Only .mp4 videos are supported at this time.')
      }

      const ext = isVideo ? 'mp4' : file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const storagePath = isVideo
        ? `videos/${brandId}/${assetId}.${ext}`
        : `brands/${brandId}/originals/${assetId}.${ext}`

      let width: number | undefined
      let height: number | undefined
      let durationSeconds: number | undefined
      let thumbnailPath: string | null = null
      let thumbnailFile: File | undefined

      if (isVideo) {
        try {
          const { width: metaWidth, height: metaHeight, duration, thumbnailBlob } = await getVideoMetadata(file)
          width = metaWidth
          height = metaHeight
          durationSeconds = Math.round(duration)
          thumbnailFile = new File([thumbnailBlob], `${assetId}-thumb.jpg`, { type: 'image/jpeg' })
          thumbnailPath = `brands/${brandId}/thumbnails/${assetId}.jpg`
        } catch (metadataError) {
          console.warn('useUploadAsset: unable to read video metadata locally', metadataError)
        }
      } else {
        try {
          const { width: imageWidth, height: imageHeight } = await getImageDimensions(file)
          width = imageWidth
          height = imageHeight

          // Check for upload-time warnings
          if (onWarning) {
            // Warn about unsupported formats for Meta
            if (META_IMAGE_REQUIREMENTS.unsupportedFormats.includes(file.type)) {
              const formatName = file.type === 'image/gif' ? 'GIF' : 'WebP'
              onWarning(
                `${formatName} images are not supported by Instagram/Facebook. The image will be uploaded, but you may need to convert it before publishing.`
              )
            }
            // Warn about small dimensions
            else if (
              imageWidth < META_IMAGE_REQUIREMENTS.recommendedMinWidth ||
              imageHeight < META_IMAGE_REQUIREMENTS.recommendedMinHeight
            ) {
              onWarning(
                `Image dimensions (${imageWidth}x${imageHeight}) are below the recommended ${META_IMAGE_REQUIREMENTS.recommendedMinWidth}x${META_IMAGE_REQUIREMENTS.recommendedMinHeight} pixels for Instagram/Facebook. Image quality may be reduced.`
              )
            }
          }
        } catch (dimensionError) {
          console.warn('useUploadAsset: unable to read image dimensions', dimensionError)
        }
      }

      // Upload thumbnail if provided
      if (thumbnailFile && thumbnailPath) {
        const { error: thumbnailError } = await supabase.storage
          .from('ferdy-assets')
          .upload(thumbnailPath, thumbnailFile, {
            upsert: true,
            contentType: thumbnailFile.type || 'image/jpeg',
          })

        if (thumbnailError) {
          console.warn('useUploadAsset: failed to upload video thumbnail', thumbnailError)
          thumbnailPath = null
        }
      }

      setProgress(35)
      const { error: uploadError } = await supabase.storage
        .from('ferdy-assets')
        .upload(storagePath, file, { upsert: false, contentType: file.type || undefined })

      if (uploadError) {
        throw uploadError
      }

      setProgress(70)

      const insertPayload = {
        id: assetId,
        brand_id: brandId,
        title: file.name,
        storage_path: storagePath,
        aspect_ratio: 'original',
        width,
        height,
        asset_type: isVideo ? 'video' : 'image',
        mime_type: file.type,
        file_size: file.size,
        thumbnail_url: thumbnailPath ?? (isVideo ? null : storagePath),
        duration_seconds: durationSeconds,
        image_crops: null,
      }

      const { error: insertError } = await supabase.from('assets').insert(insertPayload).select().single()

      if (insertError) {
        await supabase.storage.from('ferdy-assets').remove([
          storagePath,
          ...(thumbnailPath ? [thumbnailPath] : []),
        ])
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
    progress,
  }
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(img.src)
      reject(err)
    }
    img.src = URL.createObjectURL(file)
  })
}

async function getVideoMetadata(file: File): Promise<{
  thumbnailBlob: Blob
  width: number
  height: number
  duration: number
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const objectUrl = URL.createObjectURL(file)
    video.src = objectUrl

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
    }

    video.onloadedmetadata = () => {
      const duration = video.duration || 0
      const seekTo = Math.min(0.1, Math.max(duration / 2, 0))
      video.currentTime = seekTo
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error('Unable to get canvas context')
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            cleanup()
            if (!blob) {
              reject(new Error('Unable to generate thumbnail'))
              return
            }
            resolve({
              thumbnailBlob: blob,
              width: video.videoWidth,
              height: video.videoHeight,
              duration: video.duration || 0,
            })
          },
          'image/jpeg',
          0.8,
        )
      } catch (err) {
        cleanup()
        reject(err)
      }
    }

    video.onerror = (event) => {
      cleanup()
      reject(event instanceof ErrorEvent ? event.error : new Error('Unable to load video for thumbnail generation'))
    }
  })
}

