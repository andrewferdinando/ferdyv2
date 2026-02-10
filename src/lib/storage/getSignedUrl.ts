import { supabase } from '@/lib/supabase-browser'

const signedUrlCache = new Map<string, { url: string; expires: number }>()
const BUCKET_NAME = 'ferdy-assets'

export async function getSignedUrl(path: string): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client unavailable')
  }

  const cached = signedUrlCache.get(path)
  if (cached && cached.expires > Date.now()) {
    return cached.url
  }

  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, 600)

  if (error || !data?.signedUrl) {
    const message = error?.message || 'No signed URL returned'
    throw new Error(`Failed to create signed URL for path "${path}": ${message}`)
  }

  signedUrlCache.set(path, {
    url: data.signedUrl,
    expires: Date.now() + 9 * 60 * 1000,
  })

  return data.signedUrl
}

export async function getSignedUrls(paths: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (paths.length === 0) return result

  if (!supabase) {
    throw new Error('Supabase client unavailable')
  }

  const now = Date.now()
  const uncachedPaths: string[] = []

  for (const path of paths) {
    const cached = signedUrlCache.get(path)
    if (cached && cached.expires > now) {
      result.set(path, cached.url)
    } else {
      uncachedPaths.push(path)
    }
  }

  if (uncachedPaths.length > 0) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrls(uncachedPaths, 600)

    if (error) {
      console.error('Batch signed URL error:', error.message)
    }

    if (data) {
      for (const item of data) {
        if (item.signedUrl && item.path) {
          signedUrlCache.set(item.path, {
            url: item.signedUrl,
            expires: now + 9 * 60 * 1000,
          })
          result.set(item.path, item.signedUrl)
        }
      }
    }
  }

  return result
}

export function clearSignedUrlCache() {
  signedUrlCache.clear()
}
