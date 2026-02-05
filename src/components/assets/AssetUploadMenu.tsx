'use client'

import { useRef, useState, useEffect } from 'react'
import { useUploadAsset } from '@/hooks/assets/useUploadAsset'
import { useGoogleDrivePicker, PickerFile } from '@/hooks/assets/useGoogleDrivePicker'
import { useGoogleDriveUpload } from '@/hooks/assets/useGoogleDriveUpload'
import { isGoogleDriveConfigured } from '@/lib/google-drive/config'

interface AssetUploadMenuProps {
  brandId: string
  onUploadSuccess: (assetIds: string[]) => void
  onUploadError: (error: string) => void
  label?: string
}

// Upload icon
const UploadIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

// Chevron down icon
const ChevronDownIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

// Computer/Device icon
const DeviceIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
)

// Google Drive icon
const GoogleDriveIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.71 3.5L1.15 15l3.43 5.96L11.14 9.46 7.71 3.5zm6.58 0h-3.43l6.43 11.5h3.43L14.29 3.5zm-7.15 12l-3.43 5.96h13.72L21 15.5H7.14z" />
  </svg>
)

export default function AssetUploadMenu({
  brandId,
  onUploadSuccess,
  onUploadError,
  label = 'Upload',
}: AssetUploadMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const { uploadAsset, uploading: deviceUploading, progress: deviceProgress } = useUploadAsset()

  const {
    uploadFromGoogleDrive,
    uploading: driveUploading,
    progress: driveProgress,
    currentFile: driveCurrentFile,
    completedFiles,
    totalFiles,
  } = useGoogleDriveUpload({
    brandId,
    onUploadSuccess,
    onUploadError,
  })

  const { openPicker, loading: pickerLoading } = useGoogleDrivePicker({
    onSelect: (files: PickerFile[]) => {
      setIsOpen(false)
      uploadFromGoogleDrive(files)
    },
    onError: onUploadError,
  })

  const isUploading = deviceUploading || driveUploading || pickerLoading
  const googleDriveEnabled = isGoogleDriveConfigured()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close menu on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsOpen(false)

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
        onUploadError(
          `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        return
      }
    }

    onUploadSuccess(uploadedAssetIds)
  }

  const handleDeviceUploadClick = () => {
    setIsOpen(false)
    fileInputRef.current?.click()
  }

  const handleGoogleDriveClick = () => {
    openPicker()
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

  // Render loading state
  const renderButtonContent = () => {
    if (driveUploading) {
      return (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>
            Importing {completedFiles + 1}/{totalFiles}
            {driveCurrentFile ? ` - ${driveCurrentFile}` : ''}
          </span>
        </>
      )
    }

    if (deviceUploading) {
      return (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Uploading... {Math.round(deviceProgress)}%</span>
        </>
      )
    }

    if (pickerLoading) {
      return (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Opening Google Drive...</span>
        </>
      )
    }

    return (
      <>
        <UploadIcon />
        <span>{label}</span>
        {googleDriveEnabled && <ChevronDownIcon className="ml-1 w-4 h-4" />}
      </>
    )
  }

  // If Google Drive is not configured, just show a simple upload button
  if (!googleDriveEnabled) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/quicktime,.mov"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={isUploading}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={isUploading}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
            ${
              isUploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'
            }
            ${dragOver ? 'ring-2 ring-[#6366F1] ring-offset-2' : ''}
          `}
        >
          {renderButtonContent()}
        </button>
      </>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime,.mov"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={isUploading}
      />

      {/* Main button */}
      <button
        onClick={() => !isUploading && setIsOpen(!isOpen)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={isUploading}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
          ${
            isUploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'
          }
          ${dragOver ? 'ring-2 ring-[#6366F1] ring-offset-2' : ''}
        `}
      >
        {renderButtonContent()}
      </button>

      {/* Dropdown menu */}
      {isOpen && !isUploading && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <button
              onClick={handleDeviceUploadClick}
              className="flex w-full items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <DeviceIcon className="w-5 h-5 mr-3 text-gray-400" />
              <div className="text-left">
                <div className="font-medium">Upload from device</div>
                <div className="text-xs text-gray-500">Select files from your computer</div>
              </div>
            </button>

            <button
              onClick={handleGoogleDriveClick}
              className="flex w-full items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <GoogleDriveIcon className="w-5 h-5 mr-3 text-gray-400" />
              <div className="text-left">
                <div className="font-medium">Import from Google Drive</div>
                <div className="text-xs text-gray-500">Select files from your Drive</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
