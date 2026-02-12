import { useState, useCallback } from 'react'
import { useUploadAsset } from './useUploadAsset'
import { PickerFile } from './useGoogleDrivePicker'

const MAX_CONCURRENT = 3

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
 * Download a file directly from Google Drive using the access token.
 * Google APIs support CORS for authenticated requests, so no proxy needed.
 */
async function downloadFromGoogleDrive(file: PickerFile): Promise<File> {
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`

  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${file.accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download "${file.name}" from Google Drive (${response.status})`)
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
      let completed = 0

      const uploadOne = async (file: PickerFile) => {
        setCurrentFile(file.name)
        onProgress?.(completed + 1, files.length, file.name)

        try {
          // Download file directly from Google Drive (no proxy)
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
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : `Failed to upload "${file.name}"`
          errors.push(errorMsg)
          console.error(`Error uploading ${file.name} from Google Drive:`, err)
        }

        completed++
        setCompletedFiles(completed)
        setProgress(Math.round((completed / files.length) * 100))
      }

      // Process files in batches of MAX_CONCURRENT
      for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
        const batch = files.slice(i, i + MAX_CONCURRENT)
        await Promise.all(batch.map(uploadOne))
      }

      setCurrentFile(null)
      setUploading(false)

      // Report results
      if (uploadedAssetIds.length > 0) {
        onUploadSuccess?.(uploadedAssetIds)
      }

      if (errors.length > 0) {
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
