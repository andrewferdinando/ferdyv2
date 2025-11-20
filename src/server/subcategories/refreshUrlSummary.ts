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
  const supabase = supabaseAdmin;

  // 1) Get subcategory with URL
  const { data: subcat, error } = await supabase
    .from('subcategories')
    .select('id, url')
    .eq('id', subcategoryId)
    .maybeSingle();

  if (error) {
    console.error('[refreshSubcategoryUrlSummary] Error fetching subcategory:', error);
    return;
  }
  
  if (!subcat || !subcat.url) {
    // Nothing to do – no URL, or not found
    console.log(`[refreshSubcategoryUrlSummary] Subcategory ${subcategoryId} has no URL, skipping`);
    return;
  }

  try {
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
        status: response.status,
      });
      return;
    }

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

    await supabase
      .from('subcategories')
      .update({ url_page_summary: trimmed || null })
      .eq('id', subcategoryId);

    console.log(`[refreshSubcategoryUrlSummary] Successfully updated summary for subcategory ${subcategoryId}`);
  } catch (e) {
    console.error('[refreshSubcategoryUrlSummary] Error fetching/parsing URL', {
      subcategoryId,
      error: e,
    });
  }
}

