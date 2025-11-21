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

    console.log(`[refreshSubcategoryUrlSummary] Extracted ${rawText.length} raw characters, cleaning...`);
    console.log(`[refreshSubcategoryUrlSummary] First 500 chars of raw text: ${rawText.slice(0, 500)}`);
    
    // Step 2: Clean the text (decode entities, remove noise, filter lines)
    const cleanedText = cleanExtractedText(rawText);
    console.log(`[refreshSubcategoryUrlSummary] Cleaned to ${cleanedText.length} characters`);
    console.log(`[refreshSubcategoryUrlSummary] First 800 chars of cleaned text: ${cleanedText.slice(0, 800)}`);
    
    // Step 3: Extract structured event data from cleaned text (date, time, venue)
    // Look for common patterns in the first 1000 characters (where event details usually appear)
    const previewText = cleanedText.slice(0, 1000);
    let eventMetadata: string[] = [];
    
    // Try to extract date/time - more flexible patterns
    // Pattern 1: "Nov 27 from 6pm to 9pm GMT+13" or similar
    const dateTimePattern1 = /([A-Z][a-z]{2,9}\s+\d{1,2}[^.!?]{0,80}(?:from|at)\s+\d{1,2}[ap]m[^.!?]{0,80}(?:to|until|-)\s+\d{1,2}[ap]m[^.!?]{0,80}(?:GMT[+-]?\d+)?[^.!?]{0,20}?)/i;
    const dateTimeMatch1 = previewText.match(dateTimePattern1);
    if (dateTimeMatch1 && dateTimeMatch1[1]) {
      const dateTime = dateTimeMatch1[1].trim();
      if (dateTime.length > 10 && dateTime.length < 200) {
        eventMetadata.push(`Date/Time: ${dateTime}`);
      }
    }
    
    // Pattern 2: Just date and time without "from/to" - "Nov 27 6pm-9pm"
    if (eventMetadata.length === 0) {
      const dateTimePattern2 = /([A-Z][a-z]{2,9}\s+\d{1,2}[^.!?]{0,40}\d{1,2}[ap]m[^.!?]{0,40}\d{1,2}[ap]m[^.!?]{0,20}?)/i;
      const dateTimeMatch2 = previewText.match(dateTimePattern2);
      if (dateTimeMatch2 && dateTimeMatch2[1]) {
        const dateTime = dateTimeMatch2[1].trim();
        if (dateTime.length > 8 && dateTime.length < 200) {
          eventMetadata.push(`Date/Time: ${dateTime}`);
        }
      }
    }
    
    // Try to extract venue - more flexible patterns
    // Pattern 1: "152 Ponsonby Road" or similar
    const venuePattern1 = /(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Road|Street|Avenue|Lane|Drive|Place|Way|Boulevard|Court|Terrace|Crescent)[^.!?]{0,50}?)/i;
    const venueMatch1 = previewText.match(venuePattern1);
    if (venueMatch1 && venueMatch1[1]) {
      const venue = venueMatch1[1].trim();
      if (venue.length > 5 && venue.length < 200) {
        eventMetadata.push(`Venue: ${venue}`);
      }
    }
    
    // Pattern 2: Look for "Location:" or "Venue:" followed by address
    if (eventMetadata.filter(m => m.startsWith('Venue:')).length === 0) {
      const venuePattern2 = /(?:Location|Venue|Address|Where)[\s:]+([^.!?]{10,150}?)/i;
      const venueMatch2 = previewText.match(venuePattern2);
      if (venueMatch2 && venueMatch2[1]) {
        const venue = venueMatch2[1].trim();
        if (venue.length > 5 && venue.length < 200 && !venue.includes('http')) {
          eventMetadata.push(`Venue: ${venue}`);
        }
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
    // ALWAYS ensure we never cut mid-word - find the last space before the limit
    let trimmed = cleanedText.slice(0, Math.max(0, availableLength)).trim();
    
    console.log(`[refreshSubcategoryUrlSummary] Truncating text. Available length: ${availableLength}, trimmed length: ${trimmed.length}`);
    
    // First, ensure we end at a word boundary (never cut mid-word)
    if (trimmed.length >= availableLength) {
      const lastSpaceIndex = trimmed.lastIndexOf(' ', availableLength);
      console.log(`[refreshSubcategoryUrlSummary] Last space before limit at index: ${lastSpaceIndex}`);
      
      if (lastSpaceIndex > 0 && lastSpaceIndex >= availableLength * 0.7) {
        // Found a space at a reasonable position, truncate there
        trimmed = trimmed.slice(0, lastSpaceIndex).trim();
        console.log(`[refreshSubcategoryUrlSummary] Truncated at space: ${trimmed.length} chars`);
      } else {
        // No space found in good range, truncate to a safe position (90% of limit)
        const safeLength = Math.floor(availableLength * 0.9);
        const safeSpaceIndex = trimmed.lastIndexOf(' ', safeLength);
        console.log(`[refreshSubcategoryUrlSummary] Safe length: ${safeLength}, safe space index: ${safeSpaceIndex}`);
        
        if (safeSpaceIndex > 0) {
          trimmed = trimmed.slice(0, safeSpaceIndex).trim();
          console.log(`[refreshSubcategoryUrlSummary] Truncated at safe space: ${trimmed.length} chars`);
        } else {
          // Fallback: truncate at safe length (but this should rarely happen)
          trimmed = trimmed.slice(0, safeLength).trim();
          console.log(`[refreshSubcategoryUrlSummary] Truncated at safe length: ${trimmed.length} chars`);
        }
      }
    }
    
    // Now try to improve truncation at sentence boundaries (optional optimization)
    if (trimmed.length >= availableLength * 0.8) {
      // Look for sentence endings (period, exclamation, or question mark followed by space and capital letter)
      const sentenceEndRegex = /[.!?]\s+[A-Z]/g;
      let lastSentenceEnd = -1;
      let match;
      
      // Reset regex lastIndex
      sentenceEndRegex.lastIndex = 0;
      
      // Find all sentence endings
      while ((match = sentenceEndRegex.exec(trimmed)) !== null) {
        // Only consider matches that are reasonable (not too close to start, within reasonable range)
        if (match.index + match[0].length <= trimmed.length && match.index >= trimmed.length * 0.5) {
          lastSentenceEnd = match.index + match[0].length;
        }
      }
      
      // If we found a sentence boundary in a good position, use it
      if (lastSentenceEnd > 0 && lastSentenceEnd >= trimmed.length * 0.6) {
        trimmed = trimmed.slice(0, lastSentenceEnd).trim();
      } else {
        // Try to find last punctuation mark (period, exclamation, question mark) followed by space
        const lastPunctMatch = /[.!?]\s/.exec(trimmed.slice(Math.floor(trimmed.length * 0.7)));
        if (lastPunctMatch) {
          const punctIndex = trimmed.indexOf(lastPunctMatch[0], Math.floor(trimmed.length * 0.7));
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

