/**
 * Extract URL summary directly from a URL string (without database dependency)
 * 
 * This function extracts structured event details and summary text from an arbitrary URL.
 * Used for event occurrences where we need to extract summaries from occurrence-specific URLs.
 */

import { EventDetails, StructuredUrlSummary } from './refreshUrlSummary';

const MAX_SUMMARY_LENGTH = 900; // characters (after cleaning, before adding source URL prefix)

// Export helper functions from refreshUrlSummary for reuse
export function extractEventDetails(html: string, cleanedText: string): EventDetails {
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
  const datePattern1 = /([a-z]{3,9}\s+\d{1,2}(?:[–-]\d{1,2})?,?\s+\d{4})/i;
  const dateMatch1 = searchText.match(datePattern1);
  if (dateMatch1 && dateMatch1[1]) {
    details.date = dateMatch1[1].trim();
  }

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

  if (!details.date) {
    const datePattern3 = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/;
    const dateMatch3 = searchText.match(datePattern3);
    if (dateMatch3 && dateMatch3[1]) {
      details.date = dateMatch3[1].trim();
    }
  }

  // 3. Extract TIME(S)
  const timePattern1 = /(\d{1,2}:?\d{0,2}\s*(?:am|pm|AM|PM|[–-]\s*\d{1,2}:?\d{0,2}\s*(?:am|pm|AM|PM)?))/i;
  const timeMatch1 = searchText.match(timePattern1);
  if (timeMatch1 && timeMatch1[1]) {
    details.time = timeMatch1[1].trim();
  }

  if (!details.time) {
    const timePattern2 = /(?:time|starts?|ends?)[\s:]+(\d{1,2}:?\d{0,2}\s*(?:am|pm|AM|PM)[^.!?\n]{0,30})/i;
    const timeMatch2 = searchText.match(timePattern2);
    if (timeMatch2 && timeMatch2[1]) {
      details.time = timeMatch2[1].trim();
    }
  }

  // 4. Extract PRICE/TICKETS
  const pricePattern1 = /(\$?\d+(?:\.\d{2})?(?:\s*[–-]\s*\$?\d+(?:\.\d{2})?)?|free|complimentary)/i;
  const priceMatch1 = searchText.match(pricePattern1);
  if (priceMatch1 && priceMatch1[1]) {
    const priceText = priceMatch1[1].trim();
    const priceContext = searchText.slice(Math.max(0, priceMatch1.index! - 30), priceMatch1.index! + priceText.length + 30);
    if (priceContext.match(/(?:price|ticket|cost|entry|fee)/i)) {
      details.price = priceText;
    }
  }

  if (!details.price) {
    const pricePattern2 = /(?:price|tickets?|cost|entry|fee)[\s:]+(\$?\d+(?:\.\d{2})?(?:\s*[–-]\s*\$?\d+(?:\.\d{2})?)?|free|complimentary)[^.!?\n]{0,30}/i;
    const priceMatch2 = searchText.match(pricePattern2);
    if (priceMatch2 && priceMatch2[1]) {
      details.price = priceMatch2[1].trim();
    }
  }

  // 5. Infer FORMAT
  if (details.venue || searchText.match(/(?:in[-\s]?person|on[-\s]?site|at[-\s]?venue|physical|live[-\s]?event)/i)) {
    details.format = 'physical';
  }
  else if (searchText.match(/(?:online|webinar|zoom|live[-\s]?stream|virtual|remote|digital)/i)) {
    details.format = 'online';
  }
  else if (searchText.match(/(?:sale|discount|%?\s*off|special\s+offer|promo|launch|early[-\s]?bird|%?\s*discount)/i)) {
    details.format = 'promo';
  }

  // 6. Extract HOSTS/SPEAKERS/PERFORMERS
  const hosts: string[] = [];
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
    details.hosts = hosts.slice(0, 5);
  }

  // 7. Extract KEY POINTS/AGENDA
  const keyPoints: string[] = [];
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

  if (keyPoints.length < 3) {
    const agendaPattern = /(?:agenda|schedule|what[^\n]{0,20}happens?|includes?|features?)[\s:]+([^\n]{50,500})/i;
    const agendaMatch = cleanedText.match(agendaPattern);
    if (agendaMatch && agendaMatch[1]) {
      const agendaText = agendaMatch[1].slice(0, 500);
      const phrases = agendaText.split(/[.!?]\s+|,\s+(?=[A-Z])/).filter(p => p.length > 15 && p.length < 150);
      keyPoints.push(...phrases.slice(0, 5 - keyPoints.length));
    }
  }

  if (keyPoints.length > 0) {
    details.key_points = keyPoints.slice(0, 5);
  }

  return details;
}

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

function cleanExtractedText(text: string): string {
  let cleaned = decodeEntities(text);
  
  const segments = cleaned
    .split(/([.!?]\s+|[\r\n]+|\s{2,})/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .filter(s => !/^[.!?]+$/.test(s));
  
  const filteredSegments: string[] = [];
  let lastSegment = '';
  
  for (const segment of segments) {
    const trimmed = segment.trim();
    
    if (!trimmed) continue;
    if (trimmed.length < 4) continue;
    if (isNoiseLine(trimmed)) continue;
    if (trimmed === lastSegment) continue;
    
    filteredSegments.push(trimmed);
    lastSegment = trimmed;
  }
  
  return filteredSegments.join(' ');
}

/**
 * Extract URL summary from an arbitrary URL
 */
export async function extractUrlSummary(url: string): Promise<StructuredUrlSummary> {
  try {
    if (!url) {
      throw new Error('URL is required');
    }

    // Fetch the URL
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': new URL(url).origin,
        'DNT': '1',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Extract text
    const rawText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Clean the text
    const cleanedText = cleanExtractedText(rawText);
    
    // Extract structured event details
    const eventDetails = extractEventDetails(html, cleanedText);
    
    // Build clean summary text (truncated at word boundary)
    let trimmed = cleanedText.slice(0, Math.max(0, MAX_SUMMARY_LENGTH)).trim();
    
    if (trimmed.length > MAX_SUMMARY_LENGTH) {
      const lastSpaceIndex = trimmed.lastIndexOf(' ', MAX_SUMMARY_LENGTH);
      if (lastSpaceIndex > 0) {
        trimmed = trimmed.slice(0, lastSpaceIndex).trim();
      } else {
        const safeLength = Math.floor(MAX_SUMMARY_LENGTH * 0.9);
        const safeSpaceIndex = trimmed.lastIndexOf(' ', safeLength);
        if (safeSpaceIndex > 0) {
          trimmed = trimmed.slice(0, safeSpaceIndex).trim();
        } else {
          trimmed = trimmed.slice(0, safeLength).trim();
        }
      }
    }
    
    // Build structured summary
    const structuredSummary: StructuredUrlSummary = {
      summary: trimmed,
      details: eventDetails,
    };

    return structuredSummary;
  } catch (error: any) {
    console.error('[extractUrlSummary] Error extracting URL summary:', error);
    // Return empty summary on error rather than throwing
    return {
      summary: '',
      details: {
        venue: null,
        date: null,
        time: null,
        price: null,
        format: null,
        hosts: null,
        key_points: null,
      },
    };
  }
}

