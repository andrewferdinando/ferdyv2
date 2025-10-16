import { supabase } from '@/lib/supabase-browser'

export async function fixAssetPaths(brandId: string) {
  console.log('🔧 Starting asset path fix for brand:', brandId)
  
  try {
    // Get all assets for this brand
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('brand_id', brandId)
    
    if (fetchError) {
      console.error('❌ Error fetching assets:', fetchError)
      return
    }
    
    console.log('📦 Found assets:', assets?.length)
    
    if (!assets || assets.length === 0) {
      console.log('ℹ️ No assets to fix')
      return
    }
    
    // Update each asset's storage_path to remove the brands/{brandId}/ prefix
    for (const asset of assets) {
      const currentPath = asset.storage_path
      const newPath = currentPath.replace(`brands/${brandId}/`, '')
      
      if (currentPath !== newPath) {
        console.log(`🔄 Updating asset ${asset.id}:`)
        console.log(`   From: ${currentPath}`)
        console.log(`   To: ${newPath}`)
        
        const { error: updateError } = await supabase
          .from('assets')
          .update({ storage_path: newPath })
          .eq('id', asset.id)
          .eq('brand_id', brandId)
        
        if (updateError) {
          console.error(`❌ Error updating asset ${asset.id}:`, updateError)
        } else {
          console.log(`✅ Updated asset ${asset.id}`)
        }
      } else {
        console.log(`ℹ️ Asset ${asset.id} already has correct path: ${currentPath}`)
      }
    }
    
    console.log('🎉 Asset path fix completed')
    
  } catch (error) {
    console.error('❌ Error in fixAssetPaths:', error)
  }
}
