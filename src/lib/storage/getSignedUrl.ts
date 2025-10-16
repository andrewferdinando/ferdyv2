import { supabase } from '@/lib/supabase-browser'

const signedUrlCache = new Map<string, { url: string; expires: number }>()

export async function getSignedUrl(path: string): Promise<string> {
  console.log('🔍 getSignedUrl called with path:', path)
  
  // Check cache first
  const cached = signedUrlCache.get(path)
  if (cached && cached.expires > Date.now()) {
    console.log('✅ Using cached signed URL for:', path)
    return cached.url
  }

  console.log('🔄 Generating new signed URL for:', path)
  
  const { data, error } = await supabase.storage
    .from('ferdy-assets')
    .createSignedUrl(path, 600) // 10 minutes

  if (error) {
    console.error('❌ Error creating signed URL:', error)
    console.error('❌ Path that failed:', path)
    throw error
  }

  if (!data?.signedUrl) {
    console.error('❌ No signed URL returned for path:', path)
    throw new Error('No signed URL returned')
  }

  console.log('✅ Generated signed URL:', data.signedUrl)

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
