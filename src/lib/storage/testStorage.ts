import { supabase } from '@/lib/supabase-browser'

export async function testStorageAccess() {
  console.log('🧪 Testing storage access...')
  
  try {
    // Test authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🔐 Auth status:', user ? 'AUTHENTICATED' : 'NOT AUTHENTICATED', authError)
    
    // Test bucket listing
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    console.log('🪣 Available buckets:', buckets?.map(b => b.name), bucketsError)
    
    // Test specific bucket access
    const { data: files, error: filesError } = await supabase.storage
      .from('ferdy_assets')
      .list('', { limit: 5 })
    console.log('📁 Files in ferdy_assets:', files?.map(f => f.name), filesError)
    
    // Test brands folder
    const { data: brandsFiles, error: brandsError } = await supabase.storage
      .from('ferdy_assets')
      .list('brands', { limit: 5 })
    console.log('📁 Files in brands folder:', brandsFiles?.map(f => f.name), brandsError)
    
    return {
      authenticated: !!user,
      buckets: buckets?.map(b => b.name) || [],
      files: files?.map(f => f.name) || [],
      brandsFiles: brandsFiles?.map(f => f.name) || []
    }
  } catch (error) {
    console.error('❌ Storage test error:', error)
    return { error: error.message }
  }
}
