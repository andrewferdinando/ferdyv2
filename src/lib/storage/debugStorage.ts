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
    
  } catch (error) {
    console.error('❌ Debug storage error:', error)
  }
}
