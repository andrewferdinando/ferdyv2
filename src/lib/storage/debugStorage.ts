import { supabase } from '@/lib/supabase-browser'

async function searchForFilesRecursively(path: string, depth = 0) {
  if (depth > 3) return // Prevent infinite recursion
  
  try {
    const { data, error } = await supabase.storage
      .from('ferdy-assets')
      .list(path, { limit: 100 })
    
    if (error) {
      console.error(`❌ Error listing ${path}:`, error)
      return
    }
    
    if (data && data.length > 0) {
      console.log(`📁 Contents of "${path}":`, data.map(f => ({ 
        name: f.name, 
        type: f.metadata?.mimetype || 'folder',
        size: f.metadata?.size 
      })))
      
      // Recursively search subdirectories
      for (const item of data) {
        if (!item.metadata?.mimetype) { // It's a folder
          const newPath = path ? `${path}/${item.name}` : item.name
          await searchForFilesRecursively(newPath, depth + 1)
        }
      }
    }
  } catch (err) {
    console.error(`❌ Error searching ${path}:`, err)
  }
}

export async function debugStorage() {
  console.log('🔍 Starting storage debug...')
  
  try {
    // Check environment variables
    console.log('🔧 Environment check:')
    console.log('🔧 SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING')
    console.log('🔧 SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING')
    
    // Also log the actual values (first few characters for security)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('🔧 SUPABASE_URL value:', process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20) + '...')
    }
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.log('🔧 SUPABASE_ANON_KEY value:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...')
    }
    
    // Test basic connection
    console.log('🔧 Testing Supabase connection...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('❌ Auth error:', authError)
    } else {
      console.log('✅ Auth connection works, user:', user?.id || 'anonymous')
    }
    
    // First, let's see what buckets exist
    console.log('🪣 Checking available buckets...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError)
      console.error('❌ Bucket error details:', {
        message: bucketsError.message,
        statusCode: bucketsError.statusCode
      })
    } else {
      console.log('🪣 Available buckets:', buckets?.map(b => ({ name: b.name, public: b.public })))
    }
    
    // Try to access the specific bucket directly
    console.log('🪣 Testing direct bucket access...')
    try {
      const { data: bucketData, error: bucketError } = await supabase.storage
        .from('ferdy-assets')
        .list('', { limit: 1 })
      
      if (bucketError) {
        console.error('❌ Direct bucket access error:', bucketError)
        console.error('❌ Direct bucket error details:', {
          message: bucketError.message,
          statusCode: bucketError.statusCode
        })
      } else {
        console.log('✅ Direct bucket access works:', bucketData)
      }
    } catch (directErr) {
      console.error('❌ Direct bucket access exception:', directErr)
    }
    // First, let's check what's in the Assets table
    const brandId = '986a5e5d-4d6b-4893-acc8-9ddce8083921'
    console.log('📊 Checking Assets table for brand:', brandId)
    
    const { data: assetsData, error: assetsError } = await supabase
      .from('assets')
      .select('id, title, storage_path')
      .eq('brand_id', brandId)
    
    if (assetsError) {
      console.error('❌ Error fetching assets from database:', assetsError)
    } else {
      console.log('📊 Assets in database:', assetsData?.map(asset => ({
        id: asset.id,
        title: asset.title,
        storage_path: asset.storage_path
      })))
    }
    // List root directory
    const { data: rootData, error: rootError } = await supabase.storage
      .from('ferdy-assets')
      .list('', { limit: 100 })
    
    if (rootError) {
      console.error('❌ Error listing root:', rootError)
    } else {
      console.log('📁 Root directory contents:', rootData?.map(f => ({ name: f.name, type: f.metadata?.mimetype })))
    }
    
    // List brands directory
    const { data: brandsData, error: brandsError } = await supabase.storage
      .from('ferdy-assets')
      .list('brands', { limit: 100 })
    
    if (brandsError) {
      console.error('❌ Error listing brands:', brandsError)
    } else {
      console.log('📁 Brands directory contents:', brandsData?.map(f => ({ name: f.name, type: f.metadata?.mimetype })))
    }
    
    // List originals directory
    const { data: originalsData, error: originalsError } = await supabase.storage
      .from('ferdy-assets')
      .list('originals', { limit: 100 })
    
    if (originalsError) {
      console.error('❌ Error listing originals:', originalsError)
    } else {
      console.log('📁 Originals directory contents:', originalsData?.map(f => ({ name: f.name, type: f.metadata?.mimetype })))
    }
    
    // Try to list the specific brand directory
    const { data: brandData, error: brandError } = await supabase.storage
      .from('ferdy-assets')
      .list(`brands/${brandId}`, { limit: 100 })
    
    if (brandError) {
      console.error('❌ Error listing brand directory:', brandError)
    } else {
      console.log('📁 Brand directory contents:', brandData?.map(f => ({ name: f.name, type: f.metadata?.mimetype })))
    }
    
    // Try to list the specific brand/originals directory
    const { data: brandOriginalsData, error: brandOriginalsError } = await supabase.storage
      .from('ferdy-assets')
      .list(`brands/${brandId}/originals`, { limit: 100 })
    
    if (brandOriginalsError) {
      console.error('❌ Error listing brand/originals:', brandOriginalsError)
    } else {
      console.log('📁 Brand/originals directory contents:', brandOriginalsData?.map(f => ({ name: f.name, type: f.metadata?.mimetype })))
    }
    
    // Test files from the database
    if (assetsData && assetsData.length > 0) {
      console.log('🧪 Testing files from database...')
      for (const asset of assetsData) {
        console.log(`🧪 Testing file: ${asset.storage_path}`)
        try {
          const { data: testData, error: testError } = await supabase.storage
            .from('ferdy-assets')
            .createSignedUrl(asset.storage_path, 60)
          
          if (testError) {
            console.error(`❌ Test failed for ${asset.storage_path}:`, testError)
          } else {
            console.log(`✅ Test passed for ${asset.storage_path}:`, testData?.signedUrl)
          }
        } catch (testErr) {
          console.error(`❌ Test error for ${asset.storage_path}:`, testErr)
        }
      }
    }
    
    // Search for files recursively to find where they actually are
    console.log('🔍 Searching for files recursively...')
    await searchForFilesRecursively('')
    
    // Also test some common paths
    const commonTestFiles = [
      'originals/7f2f2b0c-ec49-450d-ad6a-0d1e678dd12b.png',
      'originals/1b2d5178-4e26-4fc9-a453-4ed38e864e52.jpg',
      'brand-assets/gokart.jpg'
    ]
    
    console.log('🧪 Testing common file paths...')
    for (const testFile of commonTestFiles) {
      console.log(`🧪 Testing file: ${testFile}`)
      try {
        const { data: testData, error: testError } = await supabase.storage
          .from('ferdy-assets')
          .createSignedUrl(testFile, 60)
        
        if (testError) {
          console.error(`❌ Test failed for ${testFile}:`, testError)
        } else {
          console.log(`✅ Test passed for ${testFile}:`, testData?.signedUrl)
        }
      } catch (testErr) {
        console.error(`❌ Test error for ${testFile}:`, testErr)
      }
    }
    
  } catch (error) {
    console.error('❌ Debug storage error:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
  }
}
