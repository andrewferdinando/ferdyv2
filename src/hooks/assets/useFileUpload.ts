'use client'

import { useState, useCallback, useRef } from 'react'
import { useUploadAsset } from './useUploadAsset'

const MAX_FILES = 10

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const MAX_IMAGE_SIZE = 30 * 1024 * 1024 // 30MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024 // 200MB

interface UseFileUploadOptions {
  brandId: string
  onSuccess: (assetIds: string[]) => void
  onError: (error: string) => void
}

export interface UseFileUploadReturn {
  processFiles: (files: FileList | File[]) => Promise<void>
  uploading: boolean
  completedFiles: number
  totalFiles: number
  progress: number
}

export function useFileUpload({ brandId, onSuccess, onError }: UseFileUploadOptions): UseFileUploadReturn {
  const [uploading, setUploading] = useState(false)
  const [completedFiles, setCompletedFiles] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)

  const { uploadAsset, progress } = useUploadAsset()
  const uploadingRef = useRef(false)

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    // Prevent concurrent uploads
    if (uploadingRef.current) return

    // Check file count limit
    if (fileArray.length > MAX_FILES) {
      onError(`You can upload a maximum of ${MAX_FILES} files at once. You selected ${fileArray.length}.`)
      return
    }

    // Validate ALL files upfront, collect all errors
    const validationErrors: string[] = []
    const validFiles: File[] = []

    for (const file of fileArray) {
      const isVideo = file.type.startsWith('video/')

      if (isVideo) {
        if (file.type !== 'video/mp4' && file.type !== 'video/quicktime') {
          validationErrors.push(`${file.name}: Only .mp4 and .mov videos are supported`)
          continue
        }
        if (file.size > MAX_VIDEO_SIZE) {
          validationErrors.push(`${file.name}: Video must be smaller than 200MB`)
          continue
        }
      } else {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          validationErrors.push(`${file.name}: Unsupported image format`)
          continue
        }
        if (file.size > MAX_IMAGE_SIZE) {
          validationErrors.push(`${file.name}: Image must be smaller than 30MB`)
          continue
        }
      }

      validFiles.push(file)
    }

    // If ALL files are invalid, report and bail
    if (validFiles.length === 0) {
      onError(validationErrors.join('\n'))
      return
    }

    // If some files are invalid, we'll still upload the valid ones
    // and report the validation errors at the end

    uploadingRef.current = true
    setUploading(true)
    setCompletedFiles(0)
    setTotalFiles(validFiles.length)

    const uploadedAssetIds: string[] = []
    const uploadErrors: string[] = [...validationErrors]

    // Sequential upload with skip-on-failure
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      try {
        const assetId = await new Promise<string>((resolve, reject) => {
          uploadAsset({
            file,
            brandId,
            onSuccess: (id) => resolve(id),
            onError: (error) => reject(new Error(error)),
          })
        })
        uploadedAssetIds.push(assetId)
      } catch (error) {
        uploadErrors.push(
          `${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`
        )
      }
      setCompletedFiles(i + 1)
    }

    setUploading(false)
    uploadingRef.current = false

    // Report successes
    if (uploadedAssetIds.length > 0) {
      onSuccess(uploadedAssetIds)
    }

    // Report failures
    if (uploadErrors.length > 0) {
      const failCount = uploadErrors.length
      const summary = failCount === 1
        ? uploadErrors[0]
        : `${failCount} file${failCount === 1 ? '' : 's'} failed:\n${uploadErrors.join('\n')}`
      onError(summary)
    }
  }, [brandId, onSuccess, onError, uploadAsset])

  return {
    processFiles,
    uploading,
    completedFiles,
    totalFiles,
    progress,
  }
}
