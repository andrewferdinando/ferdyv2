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

const MAX_SUMMARY_LENGTH = 900; // characters (after cleaning, before adding source URL prefix)

/**
 * Decode common HTML entities to their readable characters
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&#8211;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Check if a line contains navigation/footer noise (case-insensitive)
 */
function isNoiseLine(line: string): boolean {
  const noisePatterns = [
    'skip to main content',
    'skip to footer',
    'home',
    'about us',
    'events',
    'contact us',
    'terms and conditions',
    'privacy policy',
    '© 20',
    'join thousands of marketers',
    'newsletter',
  ];
  
  const lowerLine = line.toLowerCase().trim();
  return noisePatterns.some(pattern => lowerLine.includes(pattern));
}

/**
 * Clean extracted text by removing noise, decoding entities, and filtering segments
 */
function cleanExtractedText(text: string): string {
  // Step 1: Decode HTML entities
  let cleaned = decodeEntities(text);
  
  // Step 2: Split into logical segments (by periods, newlines, or double spaces)
  // This allows us to filter out noise segments while preserving content
  const segments = cleaned
    .split(/([.!?]\s+|[\r\n]+|\s{2,})/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .filter(s => !/^[.!?]+$/.test(s)); // Remove punctuation-only segments
  
  // Step 3: Filter out noise segments, empty segments, and short segments
  const filteredSegments: string[] = [];
  let lastSegment = '';
  
  for (const segment of segments) {
    const trimmed = segment.trim();
    
    // Skip empty segments
    if (!trimmed) continue;
    
    // Skip short segments (< 4 characters)
    if (trimmed.length < 4) continue;
    
    // Skip noise segments (navigation/footer) - case-insensitive check
    if (isNoiseLine(trimmed)) continue;
    
    // Skip duplicate consecutive segments
    if (trimmed === lastSegment) continue;
    
    filteredSegments.push(trimmed);
    lastSegment = trimmed;
  }
  
  // Step 4: Join segments back into a single string with single spaces
  return filteredSegments.join(' ');
}

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
    
    let response: Response;
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      response = await fetch(subcat.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': new URL(subcat.url).origin,
          'DNT': '1',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        console.error('[refreshSubcategoryUrlSummary] Fetch timeout after 30 seconds', {
          subcategoryId,
          url: subcat.url,
        });
      } else {
        console.error('[refreshSubcategoryUrlSummary] Fetch error', {
          subcategoryId,
          url: subcat.url,
          error: fetchError?.message || String(fetchError),
          name: fetchError?.name,
        });
      }
      return;
    }

    if (!response.ok) {
      // Try to read response body for more details
      let errorBody = '';
      try {
        errorBody = await response.text();
        // Limit error body length for logging
        if (errorBody.length > 500) {
          errorBody = errorBody.slice(0, 500) + '... (truncated)';
        }
      } catch {
        // Ignore errors reading error body
      }
      
      console.error('[refreshSubcategoryUrlSummary] Failed to fetch URL', {
        subcategoryId,
        url: subcat.url,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        errorBody: errorBody || '(could not read error body)',
      });
      return;
    }

    console.log(`[refreshSubcategoryUrlSummary] Successfully fetched URL, parsing HTML...`);
    const html = await response.text();

    // Step 1: Basic HTML -> text extraction (remove scripts, styles, tags)
    const rawText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`[refreshSubcategoryUrlSummary] Extracted ${rawText.length} raw characters, found ${eventMetadata.length} metadata items, cleaning...`);
    
    // Step 3: Clean the text (decode entities, remove noise, filter lines)
    const cleanedText = cleanExtractedText(rawText);
    console.log(`[refreshSubcategoryUrlSummary] Cleaned to ${cleanedText.length} characters`);
    
    // Step 4: Extract structured event data from cleaned text (date, time, venue)
    // Look for common patterns in the first 500 characters (where event details usually appear)
    const previewText = cleanedText.slice(0, 500);
    let eventMetadata: string[] = [];
    
    // Try to extract date/time (patterns like "Nov 27 from 6pm to 9pm GMT+13" or "Nov 27, 2025 from 6pm to 9pm")
    const dateTimeMatch = previewText.match(/\b([A-Z][a-z]{2,8}\s+\d{1,2}[^.!?]{0,50}(?:from|at)\s+\d{1,2}[ap]m[^.!?]{0,50}(?:to|until)\s+\d{1,2}[ap]m[^.!?]{0,50}(?:GMT)?[^.!?]{0,20}?)/i);
    if (dateTimeMatch && dateTimeMatch[1]) {
      const dateTime = dateTimeMatch[1].trim();
      if (dateTime.length > 10 && dateTime.length < 150) {
        eventMetadata.push(`Date/Time: ${dateTime}`);
      }
    }
    
    // Try to extract venue (patterns like "152 Ponsonby Road")
    const venueMatch = previewText.match(/(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Road|Street|Avenue|Lane|Drive|Place|Way|Boulevard|Court)[^.!?]{0,30}?)/i);
    if (venueMatch && venueMatch[1]) {
      const venue = venueMatch[1].trim();
      if (venue.length > 5 && venue.length < 150) {
        eventMetadata.push(`Venue: ${venue}`);
      }
    }
    
    // Step 5: Build summary with metadata first, then text truncated at sentence boundary
    const sourcePrefix = `SUMMARY_SOURCE_URL: ${subcat.url}\n\n`;
    let metadataSection = '';
    
    if (eventMetadata.length > 0) {
      metadataSection = `${eventMetadata.join('\n')}\n\n`;
    }
    
    // Calculate available length for main text
    const prefixLength = sourcePrefix.length + metadataSection.length;
    const availableLength = MAX_SUMMARY_LENGTH - prefixLength;
    
    // Truncate at sentence boundary (last complete sentence ending with . ! ?)
    let trimmed = cleanedText.slice(0, Math.max(0, availableLength)).trim();
    
    // If we're close to the limit, find the last complete sentence
    if (trimmed.length >= availableLength * 0.85) {
      // Look for sentence endings (period, exclamation, or question mark followed by space and capital letter or end of string)
      const sentenceEndRegex = /[.!?]\s+[A-Z]/g;
      let lastSentenceEnd = -1;
      let match;
      
      // Find all sentence endings
      while ((match = sentenceEndRegex.exec(trimmed)) !== null) {
        // Only consider matches before the limit
        if (match.index + match[0].length <= availableLength) {
          lastSentenceEnd = match.index + match[0].length;
        }
      }
      
      // If we found a sentence boundary within the limit, use it
      if (lastSentenceEnd > 0 && lastSentenceEnd >= availableLength * 0.7) {
        trimmed = trimmed.slice(0, lastSentenceEnd).trim();
      } else {
        // No sentence boundary found in good range, find last punctuation mark
        const lastPunct = /[.!?](?:\s|$)/.exec(trimmed.slice(Math.floor(availableLength * 0.8)));
        if (lastPunct) {
          const punctIndex = trimmed.indexOf(lastPunct[0], Math.floor(availableLength * 0.8));
          if (punctIndex > 0) {
            trimmed = trimmed.slice(0, punctIndex + 1).trim();
          }
        }
      }
    }
    
    const finalSummary = `${sourcePrefix}${metadataSection}${trimmed}`;

    console.log(`[refreshSubcategoryUrlSummary] Final summary length: ${finalSummary.length} characters, updating database...`);

    const { error: updateError } = await supabase
      .from('subcategories')
      .update({ url_page_summary: finalSummary || null })
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

    console.log(`[refreshSubcategoryUrlSummary] Successfully updated summary for subcategory ${subcategoryId} (${finalSummary.length} characters)`);
  } catch (e: any) {
    console.error('[refreshSubcategoryUrlSummary] Unexpected error:', {
      subcategoryId,
      error: e?.message || String(e),
      stack: e?.stack,
    });
  }
}

