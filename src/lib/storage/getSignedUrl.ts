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

export function clearSignedUrlCache() {
  signedUrlCache.clear()
}
