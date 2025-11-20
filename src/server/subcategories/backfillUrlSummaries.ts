/**
 * Backfill script to refresh URL summaries for existing subcategories
 * 
 * This script:
 * 1. Finds all subcategories with a URL but no url_page_summary
 * 2. Calls refreshSubcategoryUrlSummary for each one
 * 
 * Usage: Can be run as a one-time script or exposed via an admin API route
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import { refreshSubcategoryUrlSummary } from './refreshUrlSummary';

export async function backfillSubcategoryUrlSummaries(brandId?: string) {
  try {
    console.log('[backfillSubcategoryUrlSummaries] Starting backfill...');

    // Build query to find subcategories with URL but no summary
    let query = supabaseAdmin
      .from('subcategories')
      .select('id, url')
      .not('url', 'is', null)
      .is('url_page_summary', null);

    // Optionally filter by brand
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    const { data: subcategories, error } = await query;

    if (error) {
      console.error('[backfillSubcategoryUrlSummaries] Error fetching subcategories:', error);
      return { success: false, error: error.message };
    }

    if (!subcategories || subcategories.length === 0) {
      console.log('[backfillSubcategoryUrlSummaries] No subcategories found to backfill');
      return { success: true, processed: 0 };
    }

    console.log(`[backfillSubcategoryUrlSummaries] Found ${subcategories.length} subcategories to process`);

    // Process each subcategory
    let processed = 0;
    let errors = 0;

    for (const subcat of subcategories) {
      if (!subcat.url || !subcat.url.trim()) {
        continue;
      }

      try {
        await refreshSubcategoryUrlSummary(subcat.id);
        processed++;
        
        // Small delay to avoid overwhelming external servers
        if (processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.error(`[backfillSubcategoryUrlSummaries] Error processing subcategory ${subcat.id}:`, err);
        errors++;
      }
    }

    console.log(`[backfillSubcategoryUrlSummaries] Completed: ${processed} processed, ${errors} errors`);
    
    return { success: true, processed, errors };
  } catch (err) {
    console.error('[backfillSubcategoryUrlSummaries] Unexpected error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

