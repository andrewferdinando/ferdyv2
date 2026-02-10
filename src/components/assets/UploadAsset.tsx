'use client'

import { useRef, useState } from 'react'
import { useFileUpload } from '@/hooks/assets/useFileUpload'

interface UploadAssetProps {
  brandId: string
  onUploadSuccess: (assetIds: string[]) => void
  onUploadError: (error: string) => void
  label?: string
}

export default function UploadAsset({ brandId, onUploadSuccess, onUploadError, label = 'Upload images/videos' }: UploadAssetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const {
    processFiles,
    uploading,
    completedFiles,
    totalFiles,
    progress,
  } = useFileUpload({
    brandId,
    onSuccess: onUploadSuccess,
    onError: onUploadError,
  })

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    await processFiles(files)
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
            <span>
              {totalFiles > 1
                ? `Uploading ${completedFiles + 1}/${totalFiles}...`
                : `Uploading... ${Math.round(progress)}%`}
            </span>
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
