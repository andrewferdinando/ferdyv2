import { useState, useCallback } from 'react'
import { useUploadAsset } from './useUploadAsset'
import { PickerFile } from './useGoogleDrivePicker'

interface UseGoogleDriveUploadOptions {
  brandId: string
  onUploadSuccess?: (assetIds: string[]) => void
  onUploadError?: (error: string) => void
  onProgress?: (current: number, total: number, fileName: string) => void
}

interface UseGoogleDriveUploadResult {
  uploadFromGoogleDrive: (files: PickerFile[]) => Promise<void>
  uploading: boolean
  progress: number
  currentFile: string | null
  totalFiles: number
  completedFiles: number
}

/**
 * Download a file from Google Drive via our API proxy
 */
async function downloadFromGoogleDrive(file: PickerFile): Promise<File> {
  const response = await fetch('/api/google-drive/download', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileId: file.id,
      accessToken: file.accessToken,
      fileName: file.name,
      mimeType: file.mimeType,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to download file' }))
    throw new Error(error.error || `Failed to download "${file.name}" from Google Drive`)
  }

  const blob = await response.blob()
  return new File([blob], file.name, { type: file.mimeType })
}

export function useGoogleDriveUpload({
  brandId,
  onUploadSuccess,
  onUploadError,
  onProgress,
}: UseGoogleDriveUploadOptions): UseGoogleDriveUploadResult {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [totalFiles, setTotalFiles] = useState(0)
  const [completedFiles, setCompletedFiles] = useState(0)

  const { uploadAsset } = useUploadAsset()

  const uploadFromGoogleDrive = useCallback(
    async (files: PickerFile[]) => {
      if (files.length === 0) return

      setUploading(true)
      setProgress(0)
      setTotalFiles(files.length)
      setCompletedFiles(0)

      const uploadedAssetIds: string[] = []
      const errors: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setCurrentFile(file.name)
        setProgress(Math.round((i / files.length) * 100))
        onProgress?.(i + 1, files.length, file.name)

        try {
          // Download file from Google Drive
          const localFile = await downloadFromGoogleDrive(file)

          // Upload to Supabase using existing hook
          const assetId = await new Promise<string>((resolve, reject) => {
            uploadAsset({
              file: localFile,
              brandId,
              onSuccess: (id) => resolve(id),
              onError: (error) => reject(new Error(error)),
            })
          })

          uploadedAssetIds.push(assetId)
          setCompletedFiles(i + 1)
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : `Failed to upload "${file.name}"`
          errors.push(errorMsg)
          console.error(`Error uploading ${file.name} from Google Drive:`, err)
        }
      }

      setProgress(100)
      setCurrentFile(null)
      setUploading(false)

      // Report results
      if (uploadedAssetIds.length > 0) {
        onUploadSuccess?.(uploadedAssetIds)
      }

      if (errors.length > 0) {
        // If some succeeded and some failed, report both
        if (uploadedAssetIds.length > 0) {
          onUploadError?.(
            `${uploadedAssetIds.length} file(s) uploaded successfully. ${errors.length} file(s) failed: ${errors[0]}`
          )
        } else {
          onUploadError?.(errors[0])
        }
      }
    },
    [brandId, uploadAsset, onUploadSuccess, onUploadError, onProgress]
  )

  return {
    uploadFromGoogleDrive,
    uploading,
    progress,
    currentFile,
    totalFiles,
    completedFiles,
  }
}
