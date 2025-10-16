import { supabase } from '@/lib/supabase-browser'

const signedUrlCache = new Map<string, { url: string; expires: number }>()

export async function getSignedUrl(path: string): Promise<string> {
  // Check cache first
  const cached = signedUrlCache.get(path)
  if (cached && cached.expires > Date.now()) {
    return cached.url
  }

  const { data, error } = await supabase.storage
    .from('ferdy-assets')
    .createSignedUrl(path, 600) // 10 minutes

  if (error) {
    console.error('Error creating signed URL:', error)
    throw error
  }

  if (!data?.signedUrl) {
    throw new Error('No signed URL returned')
  }

  // Cache the URL
  signedUrlCache.set(path, {
    url: data.signedUrl,
    expires: Date.now() + 9 * 60 * 1000 // Cache for 9 minutes (1 minute buffer)
  })

  return data.signedUrl
}

export function clearSignedUrlCache() {
  signedUrlCache.clear()
}
