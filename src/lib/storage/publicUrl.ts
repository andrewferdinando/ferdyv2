const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const BUCKET_NAME = 'ferdy-assets'

export interface ImageTransform {
  width?: number
  height?: number
  quality?: number
  resize?: 'cover' | 'contain' | 'fill'
}

/** Thumbnail transform used by grid views: 400px wide, 75% quality */
export const GRID_THUMBNAIL: ImageTransform = { width: 400, quality: 75 }

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'])

function isVideoPath(path: string): boolean {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase()
  return VIDEO_EXTENSIONS.has(ext)
}

/**
 * Build a public URL for a file in the ferdy-assets bucket.
 * Synchronous — zero API calls.
 *
 * If `transform` is provided and the path is NOT a video, returns an
 * Image Transforms render URL. Otherwise returns the plain public URL.
 */
export function getPublicUrl(storagePath: string, transform?: ImageTransform): string {
  if (!storagePath) return ''

  if (transform && !isVideoPath(storagePath)) {
    const params = new URLSearchParams()
    if (transform.width) params.set('width', String(transform.width))
    if (transform.height) params.set('height', String(transform.height))
    if (transform.quality) params.set('quality', String(transform.quality))
    if (transform.resize) params.set('resize', transform.resize)
    const qs = params.toString()
    return `${SUPABASE_URL}/storage/v1/render/image/public/${BUCKET_NAME}/${storagePath}${qs ? `?${qs}` : ''}`
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`
}

/**
 * Populate `signed_url` and `thumbnail_signed_url` on an asset object.
 * Synchronous — returns a new object (does NOT mutate the original).
 */
export function resolveAssetUrls<T extends { storage_path: string; thumbnail_url?: string | null; asset_type?: string | null }>(
  asset: T,
  transform?: ImageTransform,
): T & { signed_url: string | undefined; thumbnail_signed_url: string | undefined } {
  const isVideo = (asset.asset_type ?? 'image') === 'video'
  const signed_url = asset.storage_path ? getPublicUrl(asset.storage_path) : undefined
  const thumbPath = asset.thumbnail_url || (isVideo ? undefined : asset.storage_path)
  const thumbnail_signed_url = thumbPath
    ? getPublicUrl(thumbPath, transform)
    : undefined

  return { ...asset, signed_url, thumbnail_signed_url }
}
