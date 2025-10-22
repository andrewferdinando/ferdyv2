import { supabase } from '@/lib/supabase-browser'

const signedUrlCache = new Map<string, { url: string; expires: number }>()

export async function getSignedUrl(path: string): Promise<string> {
  console.log('🔍 getSignedUrl called with path:', path)
  console.log('🔍 Path length:', path.length)
  console.log('🔍 Path characters:', path.split('').map(c => c.charCodeAt(0)))
  
  // Check cache first
  const cached = signedUrlCache.get(path)
  if (cached && cached.expires > Date.now()) {
    console.log('✅ Using cached signed URL for:', path)
    return cached.url
  }

  console.log('🔄 Generating new signed URL for:', path)
  
  // Let's also try to list files in the bucket to see what's actually there
  try {
    const { data: listData, error: listError } = await supabase.storage
      .from('ferdy_assets')
      .list('', { limit: 100 })
    
    if (!listError) {
      console.log('📁 Files in bucket root:', listData?.map(f => f.name))
    }
  } catch (listErr) {
    console.log('❌ Could not list bucket contents:', listErr)
  }
  
  // Try both bucket names since there might be a naming mismatch
  let data, error;
  
  try {
    const result = await supabase.storage
      .from('ferdy_assets')
      .createSignedUrl(path, 600) // 10 minutes
    data = result.data;
    error = result.error;
  } catch (firstError) {
    console.log('🔄 ferdy_assets failed, trying ferdy-assets...')
    try {
      const result = await supabase.storage
        .from('ferdy-assets')
        .createSignedUrl(path, 600) // 10 minutes
      data = result.data;
      error = result.error;
    } catch (secondError) {
      error = secondError;
    }
  }

  if (error) {
    console.error('❌ Error creating signed URL:', error)
    console.error('❌ Path that failed:', path)
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
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
