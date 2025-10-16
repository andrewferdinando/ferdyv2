import { supabase } from '@/lib/supabase-browser'

export async function debugStorage() {
  console.log('🔍 Starting storage debug...')
  
  try {
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
    const brandId = '986a5e5d-4d6b-4893-acc8-9ddce8083921'
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
    
    // Test specific files that are failing
    const testFiles = [
      'originals/7f2f2b0c-ec49-450d-ad6a-0d1e678dd12b.png',
      'originals/1b2d5178-4e26-4fc9-a453-4ed38e864e52.jpg',
      'brand-assets/gokart.jpg'
    ]
    
    for (const testFile of testFiles) {
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
  }
}
