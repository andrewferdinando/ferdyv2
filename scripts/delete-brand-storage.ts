/**
 * Script to delete all storage files for a specific brand
 * 
 * Usage:
 *   npx tsx scripts/delete-brand-storage.ts <brandId>
 * 
 * Or set BRAND_ID environment variable:
 *   BRAND_ID=14214424-7951-460f-ac99-4a59e79c80ab npx tsx scripts/delete-brand-storage.ts
 */

import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'ferdy-assets';
const BRAND_ID = process.env.BRAND_ID || process.argv[2];

if (!BRAND_ID) {
  console.error('Error: Brand ID is required');
  console.error('Usage: npx tsx scripts/delete-brand-storage.ts <brandId>');
  console.error('   Or: BRAND_ID=<brandId> npx tsx scripts/delete-brand-storage.ts');
  process.exit(1);
}

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase credentials not found');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

// Create admin client with service role key (has full access)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteBrandStorage() {
  console.log(`\n🗑️  Deleting storage files for brand: ${BRAND_ID}\n`);

  try {
    // Recursively list all files for this brand
    const brandFiles: string[] = [];
    
    // Directories to check for this brand
    const directoriesToCheck = [
      `brands/${BRAND_ID}`,
      `videos/${BRAND_ID}`
    ];

    // Recursive function to list all files in a directory
    async function listFilesRecursive(path: string): Promise<void> {
      const { data: items, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(path, {
          limit: 1000,
          offset: 0
        });

      if (error) {
        // Directory might not exist, that's okay
        if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
          return;
        }
        console.warn(`Warning: Could not list ${path}:`, error.message);
        return;
      }

      if (!items || items.length === 0) {
        return;
      }

      for (const item of items) {
        const fullPath = path ? `${path}/${item.name}` : item.name;
        
        // If it's a folder (no metadata or size is null), recurse
        if (item.id === null || item.metadata === null) {
          await listFilesRecursive(fullPath);
        } else {
          // It's a file, add it to the list
          brandFiles.push(fullPath);
        }
      }
    }

    // List files from all brand directories
    for (const dir of directoriesToCheck) {
      await listFilesRecursive(dir);
    }

    if (brandFiles.length === 0) {
      console.log('✅ No storage files found for this brand');
      return;
    }

    console.log(`Found ${brandFiles.length} file(s) to delete:`);
    brandFiles.forEach(file => console.log(`  - ${file}`));
    console.log('');

    // Delete files in batches (Supabase has limits)
    const BATCH_SIZE = 100;
    let deletedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < brandFiles.length; i += BATCH_SIZE) {
      const batch = brandFiles.slice(i, i + BATCH_SIZE);
      
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(batch);

      if (error) {
        console.error(`Error deleting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        errorCount += batch.length;
      } else {
        deletedCount += batch.length;
        console.log(`✅ Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} file(s)`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total files found: ${brandFiles.length}`);
    console.log(`   Successfully deleted: ${deletedCount}`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount}`);
    }
    console.log('');

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
deleteBrandStorage()
  .then(() => {
    console.log('✅ Storage cleanup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

