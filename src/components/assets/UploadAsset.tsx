'use client'

import { useRef, useState } from 'react'
import { useUploadAsset } from '@/hooks/assets/useUploadAsset'

interface UploadAssetProps {
  brandId: string
  onUploadSuccess: (assetId: string) => void
  onUploadError: (error: string) => void
}

export default function UploadAsset({ brandId, onUploadSuccess, onUploadError }: UploadAssetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const { uploadAsset, uploading, progress } = useUploadAsset()

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi']
    if (!allowedTypes.includes(file.type)) {
      onUploadError('Please select a valid image or video file')
      return
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      onUploadError('File size must be less than 50MB')
      return
    }

    uploadAsset({
      file,
      brandId,
      onSuccess: onUploadSuccess,
      onError: onUploadError
    })
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
        accept="image/*,video/*"
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
          flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Upload Content</span>
          </>
        )}
      </button>
    </>
  )
}
