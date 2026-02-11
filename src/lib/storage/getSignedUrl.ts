import { supabase } from '@/lib/supabase-browser'

const signedUrlCache = new Map<string, { url: string; expires: number }>()
const BUCKET_NAME = 'ferdy-assets'

export interface ImageTransform {
  width?: number
  height?: number
  quality?: number
  resize?: 'cover' | 'contain' | 'fill'
}

/** Thumbnail transform used by grid views: 400px wide, 75% quality */
export const GRID_THUMBNAIL: ImageTransform = { width: 400, quality: 75 }

function cacheKey(path: string, transform?: ImageTransform): string {
  if (!transform) return path
  return `${path}::w${transform.width ?? ''}h${transform.height ?? ''}q${transform.quality ?? ''}`
}

export async function getSignedUrl(path: string, transform?: ImageTransform): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client unavailable')
  }

  const key = cacheKey(path, transform)
  const cached = signedUrlCache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.url
  }

  const options = transform ? { transform } : undefined
  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, 600, options)

  if (error || !data?.signedUrl) {
    const message = error?.message || 'No signed URL returned'
    throw new Error(`Failed to create signed URL for path "${path}": ${message}`)
  }

  signedUrlCache.set(key, {
    url: data.signedUrl,
    expires: Date.now() + 9 * 60 * 1000,
  })

  return data.signedUrl
}

export async function getSignedUrls(
  paths: string[],
  transform?: ImageTransform,
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (paths.length === 0) return result

  // Separate cached from uncached
  const uncachedPaths: string[] = []
  const now = Date.now()

  for (const path of paths) {
    const key = cacheKey(path, transform)
    const cached = signedUrlCache.get(key)
    if (cached && cached.expires > now) {
      result.set(path, cached.url)
    } else {
      uncachedPaths.push(path)
    }
  }

  if (uncachedPaths.length > 0) {
    // Resolve uncached paths in parallel using the proven singular API
    const settled = await Promise.allSettled(
      uncachedPaths.map(async (path) => {
        const url = await getSignedUrl(path, transform)
        return { path, url }
      })
    )

    for (const entry of settled) {
      if (entry.status === 'fulfilled') {
        result.set(entry.value.path, entry.value.url)
      }
    }
  }

  return result
}

export function clearSignedUrlCache() {
  signedUrlCache.clear()
}
