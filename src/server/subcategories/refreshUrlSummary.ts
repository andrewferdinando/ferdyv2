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
 * Structured event details extracted from URL page
 */
export interface EventDetails {
  venue: string | null;
  date: string | null;
  time: string | null;
  price: string | null;
  format: "physical" | "online" | "promo" | null;
  hosts: string[] | null;
  key_points: string[] | null;
}

/**
 * Structured URL summary with extracted event details
 */
export interface StructuredUrlSummary {
  summary: string;
  details: EventDetails;
}

/**
 * Extract structured event details from HTML and cleaned text
 */
function extractEventDetails(html: string, cleanedText: string): EventDetails {
  const details: EventDetails = {
    venue: null,
    date: null,
    time: null,
    price: null,
    format: null,
    hosts: null,
    key_points: null,
  };

  // Combine raw HTML preview and cleaned text for pattern matching
  const rawHtmlPreview = html.slice(0, 8000);
  const searchText = (rawHtmlPreview + '\n\n' + cleanedText.slice(0, 2000)).toLowerCase();

  // 1. Extract VENUE/LOCATION
  // Pattern 1: Address format (number + street name + road/street/etc)
  const venuePattern1 = /(\d+\s+[a-z]+(?:\s+[a-z]+){0,3}\s+(?:road|street|avenue|lane|drive|place|way|boulevard|court|terrace|crescent|st|ave|rd|dr)[^.!?\n]{0,50})/i;
  const venueMatch1 = searchText.match(venuePattern1);
  if (venueMatch1 && venueMatch1[1]) {
    const venue = venueMatch1[1].trim();
    if (venue.length > 5 && venue.length < 200 && !venue.includes('http')) {
      details.venue = venue;
    }
  }

  // Pattern 2: "Location:", "Venue:", "Where:" labels
  if (!details.venue) {
    const venuePattern2 = /(?:location|venue|address|where)[\s:]+([^.!?\n]{10,150})/i;
    const venueMatch2 = searchText.match(venuePattern2);
    if (venueMatch2 && venueMatch2[1]) {
      const venue = venueMatch2[1].trim().replace(/^(is|at|:)\s*/i, '');
      if (venue.length > 5 && venue.length < 200 && !venue.includes('http')) {
        details.venue = venue;
      }
    }
  }

  // Pattern 3: Eventbrite location block
  if (!details.venue) {
    const eventbritePattern = /<[^>]*class[^>]*location[^>]*>([^<]{10,200})/i;
    const eventbriteMatch = rawHtmlPreview.match(eventbritePattern);
    if (eventbriteMatch && eventbriteMatch[1]) {
      const venue = eventbriteMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (venue.length > 5 && venue.length < 200) {
        details.venue = venue;
      }
    }
  }

  // 2. Extract DATE(S)
  // Pattern 1: "Nov 27, 2025" or "December 16, 2025" or "Jan 12–14, 2026"
  const datePattern1 = /([a-z]{3,9}\s+\d{1,2}(?:[–-]\d{1,2})?,?\s+\d{4})/i;
  const dateMatch1 = searchText.match(datePattern1);
  if (dateMatch1 && dateMatch1[1]) {
    details.date = dateMatch1[1].trim();
  }

  // Pattern 2: "Date:", "Dates:", "When:" labels
  if (!details.date) {
    const datePattern2 = /(?:date|dates|when)[\s:]+([a-z]{3,9}\s+\d{1,2}(?:[–-]\d{1,2})?,?\s+\d{4}[^.!?\n]{0,50})/i;
    const dateMatch2 = searchText.match(datePattern2);
    if (dateMatch2 && dateMatch2[1]) {
      const date = dateMatch2[1].trim();
      if (date.length > 8 && date.length < 100) {
        details.date = date;
      }
    }
  }

  // Pattern 3: DD/MM/YYYY or MM/DD/YYYY format
  if (!details.date) {
    const datePattern3 = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/;
    const dateMatch3 = searchText.match(datePattern3);
    if (dateMatch3 && dateMatch3[1]) {
      details.date = dateMatch3[1].trim();
    }
  }

  // 3. Extract TIME(S)
  // Pattern 1: "6:00 PM", "18:00", "6pm-9pm", "starts at 6pm", "ends at 9pm"
  const timePattern1 = /(\d{1,2}:?\d{0,2}\s*(?:am|pm|AM|PM|[–-]\s*\d{1,2}:?\d{0,2}\s*(?:am|pm|AM|PM)?))/i;
  const timeMatch1 = searchText.match(timePattern1);
  if (timeMatch1 && timeMatch1[1]) {
    details.time = timeMatch1[1].trim();
  }

  // Pattern 2: "Time:", "Starts:", "Ends:" labels
  if (!details.time) {
    const timePattern2 = /(?:time|starts?|ends?)[\s:]+(\d{1,2}:?\d{0,2}\s*(?:am|pm|AM|PM)[^.!?\n]{0,30})/i;
    const timeMatch2 = searchText.match(timePattern2);
    if (timeMatch2 && timeMatch2[1]) {
      details.time = timeMatch2[1].trim();
    }
  }

  // 4. Extract PRICE/TICKETS
  // Pattern 1: "$50", "from $20", "$10-$50", "free", "Free entry"
  const pricePattern1 = /(\$?\d+(?:\.\d{2})?(?:\s*[–-]\s*\$?\d+(?:\.\d{2})?)?|free|complimentary)/i;
  const priceMatch1 = searchText.match(pricePattern1);
  if (priceMatch1 && priceMatch1[1]) {
    const priceText = priceMatch1[1].trim();
    // Look for context around price
    const priceContext = searchText.slice(Math.max(0, priceMatch1.index! - 30), priceMatch1.index! + priceText.length + 30);
    if (priceContext.match(/(?:price|ticket|cost|entry|fee)/i)) {
      details.price = priceText;
    }
  }

  // Pattern 2: "Price:", "Tickets:", "Cost:" labels
  if (!details.price) {
    const pricePattern2 = /(?:price|tickets?|cost|entry|fee)[\s:]+(\$?\d+(?:\.\d{2})?(?:\s*[–-]\s*\$?\d+(?:\.\d{2})?)?|free|complimentary)[^.!?\n]{0,30}/i;
    const priceMatch2 = searchText.match(pricePattern2);
    if (priceMatch2 && priceMatch2[1]) {
      details.price = priceMatch2[1].trim();
    }
  }

  // 5. Infer FORMAT
  // Physical event indicators
  if (details.venue || searchText.match(/(?:in[-\s]?person|on[-\s]?site|at[-\s]?venue|physical|live[-\s]?event)/i)) {
    details.format = 'physical';
  }
  // Online event indicators
  else if (searchText.match(/(?:online|webinar|zoom|live[-\s]?stream|virtual|remote|digital)/i)) {
    details.format = 'online';
  }
  // Promo/sale indicators
  else if (searchText.match(/(?:sale|discount|%?\s*off|special\s+offer|promo|launch|early[-\s]?bird|%?\s*discount)/i)) {
    details.format = 'promo';
  }

  // 6. Extract HOSTS/SPEAKERS/PERFORMERS
  const hosts: string[] = [];
  
  // Pattern 1: "Hosted by", "Presented by", "Speaker", "DJ", "Instructor"
  const hostPattern1 = /(?:hosted\s+by|presented\s+by|speaker|dj|instructor|performer|artist)[\s:]+([a-z][^.!?\n]{5,80})/i;
  const hostMatches1 = searchText.matchAll(new RegExp(hostPattern1.source, 'gi'));
  for (const match of hostMatches1) {
    if (match[1]) {
      const host = match[1].trim().split(/[,&]|and/)[0].trim();
      if (host.length > 3 && host.length < 100 && !hosts.includes(host)) {
        hosts.push(host);
      }
    }
  }

  if (hosts.length > 0) {
    details.hosts = hosts.slice(0, 5); // Limit to 5 hosts
  }

  // 7. Extract KEY POINTS/AGENDA
  const keyPoints: string[] = [];
  
  // Pattern 1: Bullet points (•, -, *, numbers)
  const bulletPattern = /(?:^|\n)[\s]*[•\-\*]?\s*([a-z][^\n]{20,150})/gim;
  const bulletMatches = cleanedText.matchAll(bulletPattern);
  for (const match of bulletMatches) {
    if (match[1]) {
      const point = match[1].trim();
      if (point.length > 15 && point.length < 200 && keyPoints.length < 5) {
        keyPoints.push(point);
      }
    }
  }

  // Pattern 2: Numbered lists
  if (keyPoints.length < 3) {
    const numberedPattern = /(?:^|\n)[\s]*\d+[\.\)]\s*([a-z][^\n]{20,150})/gim;
    const numberedMatches = cleanedText.matchAll(numberedPattern);
    for (const match of numberedMatches) {
      if (match[1]) {
        const point = match[1].trim();
        if (point.length > 15 && point.length < 200 && keyPoints.length < 5) {
          keyPoints.push(point);
        }
      }
    }
  }

  // Pattern 3: Look for schedule/agenda section
  if (keyPoints.length < 3) {
    const agendaPattern = /(?:agenda|schedule|what[^\n]{0,20}happens?|includes?|features?)[\s:]+([^\n]{50,500})/i;
    const agendaMatch = cleanedText.match(agendaPattern);
    if (agendaMatch && agendaMatch[1]) {
      const agendaText = agendaMatch[1].slice(0, 500);
      // Split into sentences/phrases
      const phrases = agendaText.split(/[.!?]\s+|,\s+(?=[A-Z])/).filter(p => p.length > 15 && p.length < 150);
      keyPoints.push(...phrases.slice(0, 5 - keyPoints.length));
    }
  }

  if (keyPoints.length > 0) {
    details.key_points = keyPoints.slice(0, 5); // Limit to 5 points
  }

  return details;
}

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
    
    // Step 3: Extract structured event details from HTML and cleaned text
    const eventDetails = extractEventDetails(html, cleanedText);
    console.log(`[refreshSubcategoryUrlSummary] Extracted event details:`, JSON.stringify(eventDetails, null, 2));
    
    // Step 4: Build clean summary text (truncated at sentence boundary)
    const availableLength = MAX_SUMMARY_LENGTH;
    
    // Truncate at sentence boundary (last complete sentence ending with . ! ?)
    // ALWAYS ensure we never cut mid-word - find the last space before the limit
    let trimmed = cleanedText.slice(0, Math.max(0, availableLength)).trim();
    
    console.log(`[refreshSubcategoryUrlSummary] Truncating text. Available length: ${availableLength}, initial trimmed length: ${trimmed.length}`);
    
    // CRITICAL: Always ensure we end at a word boundary (never cut mid-word)
    // First, check if we're at or over the limit
    if (trimmed.length > availableLength) {
      // Find the last space before or at the limit
      const lastSpaceIndex = trimmed.lastIndexOf(' ', availableLength);
      console.log(`[refreshSubcategoryUrlSummary] Last space before limit at index: ${lastSpaceIndex} (limit: ${availableLength})`);
      
      if (lastSpaceIndex > 0) {
        // Found a space, truncate there
        trimmed = trimmed.slice(0, lastSpaceIndex).trim();
        console.log(`[refreshSubcategoryUrlSummary] Truncated at space index ${lastSpaceIndex}: ${trimmed.length} chars`);
      } else {
        // No space found in first availableLength chars - this is unusual, fall back to 90%
        const safeLength = Math.floor(availableLength * 0.9);
        const safeSpaceIndex = trimmed.lastIndexOf(' ', safeLength);
        console.log(`[refreshSubcategoryUrlSummary] No space found, trying safe length: ${safeLength}, safe space index: ${safeSpaceIndex}`);
        
        if (safeSpaceIndex > 0) {
          trimmed = trimmed.slice(0, safeSpaceIndex).trim();
          console.log(`[refreshSubcategoryUrlSummary] Truncated at safe space: ${trimmed.length} chars`);
        } else {
          // Last resort: find ANY space in the text
          const anySpaceIndex = trimmed.lastIndexOf(' ');
          if (anySpaceIndex > 0 && anySpaceIndex >= availableLength * 0.5) {
            trimmed = trimmed.slice(0, anySpaceIndex).trim();
            console.log(`[refreshSubcategoryUrlSummary] Truncated at any space found: ${trimmed.length} chars`);
          } else {
            // This should never happen, but if it does, truncate at a safe length
            trimmed = trimmed.slice(0, safeLength).trim();
            console.log(`[refreshSubcategoryUrlSummary] WARNING: Forced truncation at safe length: ${trimmed.length} chars`);
          }
        }
      }
    } else if (trimmed.length === availableLength) {
      // Exactly at the limit - check if it ends with a space, if not find the last space
      if (!trimmed.endsWith(' ')) {
        const lastSpaceIndex = trimmed.lastIndexOf(' ');
        if (lastSpaceIndex > 0 && lastSpaceIndex >= availableLength * 0.9) {
          trimmed = trimmed.slice(0, lastSpaceIndex).trim();
          console.log(`[refreshSubcategoryUrlSummary] Text at limit but doesn't end with space, truncated at: ${trimmed.length} chars`);
        }
      }
    }
    
    console.log(`[refreshSubcategoryUrlSummary] After initial truncation: ${trimmed.length} chars`);
    
    // Now try to improve truncation at sentence boundaries (optional optimization)
    // BUT: Only if we haven't already truncated, and ensure we still end at word boundary
    if (trimmed.length >= availableLength * 0.8) {
      // Look for sentence endings (period, exclamation, or question mark followed by space and capital letter)
      const sentenceEndRegex = /[.!?]\s+[A-Z]/g;
      let lastSentenceEnd = -1;
      let match;
      
      // Reset regex lastIndex
      sentenceEndRegex.lastIndex = 0;
      
      // Find all sentence endings BEFORE the current trimmed length
      while ((match = sentenceEndRegex.exec(trimmed)) !== null) {
        // Only consider matches that are reasonable (not too close to start, within reasonable range)
        if (match.index + match[0].length <= trimmed.length && match.index >= trimmed.length * 0.5) {
          lastSentenceEnd = match.index + match[0].length;
        }
      }
      
      // If we found a sentence boundary in a good position, use it (it's already at a word boundary)
      if (lastSentenceEnd > 0 && lastSentenceEnd >= trimmed.length * 0.6 && lastSentenceEnd <= availableLength) {
        trimmed = trimmed.slice(0, lastSentenceEnd).trim();
        console.log(`[refreshSubcategoryUrlSummary] Optimized at sentence boundary: ${trimmed.length} chars`);
      } else {
        // Try to find last punctuation mark (period, exclamation, question mark) followed by space
        // But ensure we don't go beyond available length
        const searchStart = Math.floor(trimmed.length * 0.7);
        const searchText = trimmed.slice(searchStart);
        const lastPunctMatch = /[.!?]\s/.exec(searchText);
        if (lastPunctMatch) {
          const punctIndex = searchStart + lastPunctMatch.index + 1;
          if (punctIndex > 0 && punctIndex <= availableLength) {
            trimmed = trimmed.slice(0, punctIndex).trim();
            console.log(`[refreshSubcategoryUrlSummary] Optimized at punctuation: ${trimmed.length} chars`);
          }
        }
      }
    }
    
    // FINAL SAFETY CHECK: Ensure we never end mid-word
    // Check the last character - if it's not whitespace or punctuation, find the last space
    const lastChar = trimmed.slice(-1);
    if (!/[.!?\s]/.test(lastChar)) {
      const finalLastSpace = trimmed.lastIndexOf(' ');
      if (finalLastSpace > 0 && finalLastSpace >= trimmed.length * 0.9) {
        trimmed = trimmed.slice(0, finalLastSpace).trim();
        console.log(`[refreshSubcategoryUrlSummary] Final safety check - truncated at word boundary: ${trimmed.length} chars`);
      }
    }
    
    console.log(`[refreshSubcategoryUrlSummary] Final trimmed text (last 50 chars): ${trimmed.slice(-50)}`);
    
    // Step 5: Build structured summary object
    const structuredSummary: StructuredUrlSummary = {
      summary: trimmed,
      details: eventDetails,
    };

    // Step 6: Store as JSON string in database (for backward compatibility, store JSON)
    const summaryJson = JSON.stringify(structuredSummary);

    console.log(`[refreshSubcategoryUrlSummary] Structured summary JSON length: ${summaryJson.length} characters, updating database...`);

    const { error: updateError } = await supabase
      .from('subcategories')
      .update({ url_page_summary: summaryJson })
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

    console.log(`[refreshSubcategoryUrlSummary] Successfully updated structured summary for subcategory ${subcategoryId} (${summaryJson.length} characters)`);
  } catch (e: any) {
    console.error('[refreshSubcategoryUrlSummary] Unexpected error:', {
      subcategoryId,
      error: e?.message || String(e),
      stack: e?.stack,
    });
  }
}


