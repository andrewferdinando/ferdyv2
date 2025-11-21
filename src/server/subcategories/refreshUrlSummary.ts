/**
 * Server-side helper to fetch and store URL page summary for a subcategory
 * 
 * This function:
 * 1. Fetches the subcategory from Supabase (including url)
 * 2. Fetches and extracts text from the URL page
 * 3. Saves the cleaned summary back to the database
 * 
 * This should be called as fire-and-forget after subcategory create/update.
 * Errors are logged but do not throw to avoid breaking save flows.
 */

import { supabaseAdmin } from '@/lib/supabase-server';

const MAX_SUMMARY_LENGTH = 4000; // characters

export async function refreshSubcategoryUrlSummary(subcategoryId: string) {
  try {
    console.log(`[refreshSubcategoryUrlSummary] Starting refresh for subcategory ${subcategoryId}`);
    
    if (!subcategoryId) {
      console.error('[refreshSubcategoryUrlSummary] No subcategory ID provided');
      return;
    }

    const supabase = supabaseAdmin;
    if (!supabase) {
      console.error('[refreshSubcategoryUrlSummary] supabaseAdmin is not initialized');
      return;
    }

    console.log(`[refreshSubcategoryUrlSummary] Querying database for subcategory ${subcategoryId}`);
    console.log(`[refreshSubcategoryUrlSummary] Supabase client check:`, {
      hasClient: !!supabase,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
    });
    
    // 1) Get subcategory with URL - with timeout
    let queryStartTime = Date.now();
    let subcat: { id: string; url: string | null } | null = null;
    let error: any = null;
    
    try {
      console.log(`[refreshSubcategoryUrlSummary] Executing Supabase query...`);
      
      // Create a promise that will timeout after 15 seconds
      const queryPromise = supabase
        .from('subcategories')
        .select('id, url')
        .eq('id', subcategoryId)
        .maybeSingle();
      
      const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Database query timeout after 15 seconds'));
        }, 15000);
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      subcat = result.data;
      error = result.error;
      
      const queryDuration = Date.now() - queryStartTime;
      console.log(`[refreshSubcategoryUrlSummary] Database query completed in ${queryDuration}ms`);
    } catch (queryError: any) {
      const queryDuration = Date.now() - queryStartTime;
      console.error(`[refreshSubcategoryUrlSummary] Database query failed after ${queryDuration}ms:`, {
        subcategoryId,
        error: queryError?.message || String(queryError),
        name: queryError?.name,
        stack: queryError?.stack,
      });
      return;
    }

    if (error) {
      console.error('[refreshSubcategoryUrlSummary] Error fetching subcategory:', {
        subcategoryId,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return;
    }
    
    console.log(`[refreshSubcategoryUrlSummary] Fetched subcategory:`, {
      found: !!subcat,
      hasUrl: !!subcat?.url,
      url: subcat?.url || '(none)',
    });
    
    if (!subcat || !subcat.url) {
      // Nothing to do – no URL, or not found
      console.log(`[refreshSubcategoryUrlSummary] Subcategory ${subcategoryId} has no URL, skipping`);
      return;
    }

    console.log(`[refreshSubcategoryUrlSummary] Fetching URL: ${subcat.url}`);
    const response = await fetch(subcat.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'FerdyBot/1.0 (+https://ferdy.io)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      console.error('[refreshSubcategoryUrlSummary] Failed to fetch URL', {
        subcategoryId,
        url: subcat.url,
        status: response.status,
        statusText: response.statusText,
      });
      return;
    }

    console.log(`[refreshSubcategoryUrlSummary] Successfully fetched URL, parsing HTML...`);
    const html = await response.text();

    // Very simple HTML -> text cleanup (no extra deps)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const trimmed = text.slice(0, MAX_SUMMARY_LENGTH);
    console.log(`[refreshSubcategoryUrlSummary] Parsed ${trimmed.length} characters, updating database...`);

    const { error: updateError } = await supabase
      .from('subcategories')
      .update({ url_page_summary: trimmed || null })
      .eq('id', subcategoryId);

    if (updateError) {
      console.error('[refreshSubcategoryUrlSummary] Error updating subcategory with summary:', {
        subcategoryId,
        error: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
      });
      return;
    }

    console.log(`[refreshSubcategoryUrlSummary] Successfully updated summary for subcategory ${subcategoryId} (${trimmed.length} characters)`);
  } catch (e: any) {
    console.error('[refreshSubcategoryUrlSummary] Unexpected error:', {
      subcategoryId,
      error: e?.message || String(e),
      stack: e?.stack,
    });
  }
}

