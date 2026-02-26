import sharp from 'sharp'

/**
 * Meta (Instagram/Facebook) target dimensions for each aspect ratio
 */
export const META_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '1.91:1': { width: 1080, height: 566 },
  '9:16': { width: 1080, height: 1920 },
}

/**
 * Supported aspect ratios
 */
export const SUPPORTED_ASPECT_RATIOS = ['1:1', '4:5', '1.91:1', '9:16'] as const
export type AspectRatio = typeof SUPPORTED_ASPECT_RATIOS[number]

/**
 * Crop coordinates stored in the database (normalized)
 */
export interface CropCoordinates {
  scale: number
  x: number // -1 to 1 (pan offset)
  y: number // -1 to 1 (pan offset)
}

/**
 * Result of image processing
 */
export interface ProcessedImageResult {
  buffer: Buffer
  width: number
  height: number
  format: 'jpeg'
}

/**
 * Process an image by applying crop and resizing to Meta dimensions.
 *
 * The crop coordinates work as follows:
 * - scale: How much the image is zoomed (1 = fit, higher = zoomed in)
 * - x, y: Pan offset from -1 to 1 (0 = centered)
 *
 * The algorithm:
 * 1. Calculate the visible region based on the aspect ratio frame
 * 2. Apply the crop scale and pan offsets
 * 3. Extract that region from the original image
 * 4. Resize to Meta's target dimensions
 */
export async function processImage(
  imageBuffer: Buffer,
  aspectRatio: AspectRatio,
  crop: CropCoordinates,
): Promise<ProcessedImageResult> {
  const targetDimensions = META_DIMENSIONS[aspectRatio]
  if (!targetDimensions) {
    throw new Error(`Unsupported aspect ratio: ${aspectRatio}`)
  }

  // Get source image metadata
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions')
  }

  const sourceWidth = metadata.width
  const sourceHeight = metadata.height
  const targetRatio = targetDimensions.width / targetDimensions.height

  // Calculate the frame dimensions that would fit in the source image
  // This is similar to what the frontend does to calculate minScale
  let frameWidth: number
  let frameHeight: number

  if (sourceWidth / sourceHeight > targetRatio) {
    // Source is wider than target ratio - height constrained
    frameHeight = sourceHeight
    frameWidth = frameHeight * targetRatio
  } else {
    // Source is taller than target ratio - width constrained
    frameWidth = sourceWidth
    frameHeight = frameWidth / targetRatio
  }

  // Calculate minScale (the scale at which the image just fills the frame)
  const minScale = Math.max(
    frameWidth / sourceWidth,
    frameHeight / sourceHeight,
  )

  // Apply the user's scale (clamped to minScale)
  const effectiveScale = Math.max(crop.scale, minScale)

  // Calculate the visible dimensions at this scale
  const scaledImageWidth = sourceWidth * effectiveScale
  const scaledImageHeight = sourceHeight * effectiveScale

  // Calculate overflow (how much the scaled image extends beyond the frame)
  const overflowX = Math.max(0, (scaledImageWidth - frameWidth) / 2)
  const overflowY = Math.max(0, (scaledImageHeight - frameHeight) / 2)

  // Calculate the center offset based on pan (x, y are -1 to 1)
  const panOffsetX = overflowX === 0 ? 0 : crop.x * overflowX
  const panOffsetY = overflowY === 0 ? 0 : crop.y * overflowY

  // Calculate the crop region in source image coordinates
  // The center of the frame is at the center of the source image
  // Then we apply the pan offset and account for the frame size
  const centerX = sourceWidth / 2
  const centerY = sourceHeight / 2

  // In the scaled coordinate system, we're viewing a frameWidth x frameHeight window
  // centered at (centerX + panOffsetX/effectiveScale, centerY + panOffsetY/effectiveScale)
  // We need to extract this region from the source image

  // The crop region in source coordinates
  const cropWidth = frameWidth / effectiveScale
  const cropHeight = frameHeight / effectiveScale
  const cropLeft = centerX - (cropWidth / 2) - (panOffsetX / effectiveScale)
  const cropTop = centerY - (cropHeight / 2) - (panOffsetY / effectiveScale)

  // Ensure crop region is within bounds
  const safeCropLeft = Math.max(0, Math.min(cropLeft, sourceWidth - cropWidth))
  const safeCropTop = Math.max(0, Math.min(cropTop, sourceHeight - cropHeight))
  const safeCropWidth = Math.min(cropWidth, sourceWidth - safeCropLeft)
  const safeCropHeight = Math.min(cropHeight, sourceHeight - safeCropTop)

  // Process the image: extract crop region and resize to target dimensions
  const processedBuffer = await sharp(imageBuffer)
    .extract({
      left: Math.round(safeCropLeft),
      top: Math.round(safeCropTop),
      width: Math.round(safeCropWidth),
      height: Math.round(safeCropHeight),
    })
    .resize(targetDimensions.width, targetDimensions.height, {
      fit: 'fill', // Fill exact dimensions
      kernel: sharp.kernel.lanczos3, // High quality resampling
    })
    .jpeg({
      quality: 90,
      progressive: true,
    })
    .toBuffer()

  return {
    buffer: processedBuffer,
    width: targetDimensions.width,
    height: targetDimensions.height,
    format: 'jpeg',
  }
}

/**
 * Get default crop coordinates (centered, no zoom)
 */
export function getDefaultCrop(): CropCoordinates {
  return {
    scale: 1,
    x: 0,
    y: 0,
  }
}

/**
 * Validate that an aspect ratio is supported
 */
export function isValidAspectRatio(ratio: string): ratio is AspectRatio {
  return SUPPORTED_ASPECT_RATIOS.includes(ratio as AspectRatio)
}

/**
 * Calculate the best-fit aspect ratio for an image based on its dimensions.
 * Mirrors the Content Library's bestFormat algorithm:
 * - Picks the format requiring the least zoom (scale) to fill the frame
 * - Breaks ties by choosing the format closest to the actual image ratio
 */
export function calculateBestFit(width: number, height: number): AspectRatio {
  const imageRatio = width / height
  const EPSILON = 1e-6

  const formats: { key: AspectRatio; ratio: number }[] = [
    { key: '1:1', ratio: 1 },
    { key: '4:5', ratio: 4 / 5 },
    { key: '1.91:1', ratio: 1.91 },
    { key: '9:16', ratio: 9 / 16 },
  ]

  const computeScale = (formatRatio: number) => Math.max(formatRatio / imageRatio, 1)

  return formats.reduce((best, candidate) => {
    const bestScale = computeScale(best.ratio)
    const candidateScale = computeScale(candidate.ratio)

    if (candidateScale < bestScale - EPSILON) return candidate
    if (Math.abs(candidateScale - bestScale) <= EPSILON) {
      return Math.abs(candidate.ratio - imageRatio) < Math.abs(best.ratio - imageRatio)
        ? candidate
        : best
    }
    return best
  }, formats[0]).key
}

/**
 * Pick the closest valid aspect ratio for Instagram Feed.
 * IG Feed allows ratios between 4:5 (0.8) and 1.91:1 (1.91).
 * Returns the target ratio if the image is outside range, or null if the original is fine.
 */
export function pickClosestFeedRatio(width: number, height: number): AspectRatio | null {
  const ratio = width / height
  if (ratio < 0.8) return '4:5'    // Too tall — clamp to tallest IG Feed allows
  if (ratio > 1.91) return '1.91:1' // Too wide — clamp to widest IG Feed allows
  return null                        // Within range — original is fine
}
