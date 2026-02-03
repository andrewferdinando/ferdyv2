/**
 * Meta (Instagram/Facebook) asset validation for publishing.
 *
 * This module validates assets against Meta's requirements before publishing.
 * Reference: https://developers.facebook.com/docs/instagram-api/reference/ig-user/media
 */

/**
 * Meta's asset requirements
 */
export const META_REQUIREMENTS = {
  image: {
    minWidth: 320,
    minHeight: 320,
    recommendedMinWidth: 600,
    recommendedMinHeight: 600,
    maxFileSize: 30 * 1024 * 1024, // 30MB
    supportedFormats: ['image/jpeg', 'image/png'],
    unsupportedFormats: ['image/gif', 'image/webp'],
  },
  video: {
    minWidth: 500,
    minHeight: 500,
    maxFileSize: 200 * 1024 * 1024, // 200MB (varies by format)
    minDuration: 3, // seconds
    maxDuration: 60 * 60, // 60 minutes for Reels, varies by format
    supportedFormats: ['video/mp4', 'video/quicktime'],
  },
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Asset data for validation
 */
export interface AssetForValidation {
  asset_type?: 'image' | 'video' | null
  mime_type?: string | null
  width?: number | null
  height?: number | null
  file_size?: number | null
  duration_seconds?: number | null
}

/**
 * Validate an asset against Meta's requirements for publishing.
 *
 * Returns validation errors (blocking) and warnings (non-blocking but should be shown to user).
 */
export function validateAssetForMeta(asset: AssetForValidation): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const isVideo = asset.asset_type === 'video'

  if (isVideo) {
    // Video validation
    validateVideo(asset, errors, warnings)
  } else {
    // Image validation
    validateImage(asset, errors, warnings)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate image asset
 */
function validateImage(asset: AssetForValidation, errors: string[], warnings: string[]): void {
  const { image } = META_REQUIREMENTS

  // Check file format
  if (asset.mime_type) {
    if (image.unsupportedFormats.includes(asset.mime_type)) {
      const formatName = asset.mime_type === 'image/gif' ? 'GIF' : 'WebP'
      errors.push(
        `${formatName} images are not supported by Instagram. Please use JPEG or PNG format.`
      )
    } else if (!image.supportedFormats.includes(asset.mime_type)) {
      warnings.push(
        `Image format ${asset.mime_type} may not be fully supported. JPEG or PNG is recommended.`
      )
    }
  }

  // Check dimensions
  if (asset.width && asset.height) {
    if (asset.width < image.minWidth || asset.height < image.minHeight) {
      errors.push(
        `Image dimensions (${asset.width}x${asset.height}) are below Instagram's minimum of ${image.minWidth}x${image.minHeight} pixels.`
      )
    } else if (asset.width < image.recommendedMinWidth || asset.height < image.recommendedMinHeight) {
      warnings.push(
        `Image dimensions (${asset.width}x${asset.height}) are below the recommended ${image.recommendedMinWidth}x${image.recommendedMinHeight} pixels. Image quality may be reduced.`
      )
    }
  }

  // Check file size
  if (asset.file_size && asset.file_size > image.maxFileSize) {
    const sizeMB = (asset.file_size / (1024 * 1024)).toFixed(1)
    const maxMB = image.maxFileSize / (1024 * 1024)
    errors.push(
      `Image file size (${sizeMB}MB) exceeds Instagram's maximum of ${maxMB}MB.`
    )
  }
}

/**
 * Validate video asset
 */
function validateVideo(asset: AssetForValidation, errors: string[], warnings: string[]): void {
  const { video } = META_REQUIREMENTS

  // Check file format
  if (asset.mime_type && !video.supportedFormats.includes(asset.mime_type)) {
    errors.push(
      `Video format ${asset.mime_type} is not supported. Please use MP4 or MOV format.`
    )
  }

  // Check dimensions
  if (asset.width && asset.height) {
    if (asset.width < video.minWidth || asset.height < video.minHeight) {
      errors.push(
        `Video dimensions (${asset.width}x${asset.height}) are below Instagram's minimum of ${video.minWidth}x${video.minHeight} pixels.`
      )
    }
  }

  // Check file size
  if (asset.file_size && asset.file_size > video.maxFileSize) {
    const sizeMB = (asset.file_size / (1024 * 1024)).toFixed(1)
    const maxMB = video.maxFileSize / (1024 * 1024)
    errors.push(
      `Video file size (${sizeMB}MB) exceeds the maximum of ${maxMB}MB.`
    )
  }

  // Check duration
  if (asset.duration_seconds !== null && asset.duration_seconds !== undefined) {
    if (asset.duration_seconds < video.minDuration) {
      errors.push(
        `Video duration (${asset.duration_seconds}s) is below Instagram's minimum of ${video.minDuration} seconds.`
      )
    }
    if (asset.duration_seconds > video.maxDuration) {
      const maxMinutes = video.maxDuration / 60
      const durationMinutes = Math.round(asset.duration_seconds / 60)
      warnings.push(
        `Video duration (${durationMinutes} minutes) may exceed some Instagram format limits.`
      )
    }
  }
}

/**
 * Check if an image format requires conversion for Meta
 */
export function requiresFormatConversion(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false
  return META_REQUIREMENTS.image.unsupportedFormats.includes(mimeType)
}

/**
 * Check if dimensions are below recommended minimum
 */
export function isBelowRecommendedSize(width: number | null | undefined, height: number | null | undefined): boolean {
  if (!width || !height) return false
  return (
    width < META_REQUIREMENTS.image.recommendedMinWidth ||
    height < META_REQUIREMENTS.image.recommendedMinHeight
  )
}

/**
 * Get a user-friendly validation message for upload-time warnings
 */
export function getUploadWarning(asset: AssetForValidation): string | null {
  const result = validateAssetForMeta(asset)

  // Return first error if any
  if (result.errors.length > 0) {
    return result.errors[0]
  }

  // Return first warning if any
  if (result.warnings.length > 0) {
    return result.warnings[0]
  }

  return null
}
