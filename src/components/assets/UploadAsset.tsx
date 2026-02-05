'use client'

import { useRef, useState } from 'react'
import { useUploadAsset } from '@/hooks/assets/useUploadAsset'

interface UploadAssetProps {
  brandId: string
  onUploadSuccess: (assetIds: string[]) => void
  onUploadError: (error: string) => void
  label?: string
}

export default function UploadAsset({ brandId, onUploadSuccess, onUploadError, label = 'Upload images/videos' }: UploadAssetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const { uploadAsset, uploading, progress } = useUploadAsset()

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const uploadedAssetIds: string[] = []

    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const maxImageSize = 30 * 1024 * 1024 // 30MB (Meta's limit)
    const maxVideoSize = 200 * 1024 * 1024 // 200MB

    for (const file of fileArray) {
      const isVideo = file.type.startsWith('video/')

      if (isVideo) {
        if (file.type !== 'video/mp4' && file.type !== 'video/quicktime') {
          onUploadError(`Only .mp4 and .mov videos are supported. Problem file: ${file.name}`)
          return
        }
        if (file.size > maxVideoSize) {
          onUploadError(`Video files must be smaller than 200MB. Problem file: ${file.name}`)
          return
        }
      } else {
        if (!allowedImageTypes.includes(file.type)) {
          onUploadError(`Please select a valid image file. Problem file: ${file.name}`)
          return
        }
        if (file.size > maxImageSize) {
          onUploadError(`Image files must be smaller than 30MB. Problem file: ${file.name}`)
          return
        }
      }
    }

    for (const file of fileArray) {
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
        onUploadError(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return
      }
    }

    onUploadSuccess(uploadedAssetIds)
  }

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime,.mov"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={uploading}
      />

      <button
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={uploading}
        className={`
          flex items-center gap-3 px-4 py-2 rounded-lg transition-colors
          ${uploading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'
          }
          ${dragOver ? 'ring-2 ring-[#6366F1] ring-offset-2' : ''}
        `}
      >
        {uploading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Uploading... {Math.round(progress)}%</span>
          </>
        ) : (
          <>
            <span>{label}</span>
          </>
        )}
      </button>
    </>
  )
}
