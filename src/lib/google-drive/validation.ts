/**
 * Validation for Google Drive files
 * Same rules as direct upload: JPEG/PNG/GIF/WebP up to 50MB, MP4 up to 200MB
 */

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  size?: number
  sizeBytes?: string
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

// Allowed MIME types for images
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]

// Allowed MIME types for videos
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime']

// Size limits
const MAX_IMAGE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024 // 200MB

/**
 * Check if a MIME type is an allowed image type
 */
export function isAllowedImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase())
}

/**
 * Check if a MIME type is an allowed video type
 */
export function isAllowedVideoType(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType.toLowerCase())
}

/**
 * Check if a MIME type is allowed (either image or video)
 */
export function isAllowedFileType(mimeType: string): boolean {
  return isAllowedImageType(mimeType) || isAllowedVideoType(mimeType)
}

/**
 * Get the file size from a Google Drive file object
 */
function getFileSize(file: GoogleDriveFile): number | null {
  if (file.size !== undefined) {
    return file.size
  }
  if (file.sizeBytes !== undefined) {
    return parseInt(file.sizeBytes, 10)
  }
  return null
}

/**
 * Validate a single Google Drive file
 */
export function validateGoogleDriveFile(file: GoogleDriveFile): ValidationResult {
  const { mimeType, name } = file
  const size = getFileSize(file)

  // Check file type
  if (!isAllowedFileType(mimeType)) {
    return {
      valid: false,
      error: `"${name}" is not a supported file type. Allowed: JPEG, PNG, GIF, WebP images and MP4/MOV videos.`,
    }
  }

  // Check file size if available
  if (size !== null) {
    const isVideo = isAllowedVideoType(mimeType)
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    const maxSizeLabel = isVideo ? '200MB' : '50MB'
    const fileType = isVideo ? 'Video' : 'Image'

    if (size > maxSize) {
      return {
        valid: false,
        error: `"${name}" exceeds the ${maxSizeLabel} limit for ${fileType.toLowerCase()} files.`,
      }
    }
  }

  return { valid: true }
}

/**
 * Validate multiple Google Drive files
 * Returns the first error found, or success if all files are valid
 */
export function validateGoogleDriveFiles(files: GoogleDriveFile[]): ValidationResult {
  for (const file of files) {
    const result = validateGoogleDriveFile(file)
    if (!result.valid) {
      return result
    }
  }
  return { valid: true }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
