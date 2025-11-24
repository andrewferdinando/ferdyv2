/**
 * Extract URL summary directly from a URL string (without database dependency)
 * 
 * This function extracts structured event details and summary text from an arbitrary URL.
 * Used for event occurrences where we need to extract summaries from occurrence-specific URLs.
 * 
 * Enhanced for EVENT-type URLs with better targeting of main content and structured extraction.
 */

import * as cheerio from 'cheerio';
import { EventDetails, StructuredUrlSummary } from './refreshUrlSummary';

const MAX_SUMMARY_LENGTH = 900; // characters (after cleaning, before adding source URL prefix)
const MAX_SNIPPET_LENGTH = 250; // characters for rawSnippet

/**
 * Detect if a page looks like an event page based on content indicators
 */
function isEventPage($: cheerio.CheerioAPI): boolean {
  const html = $.html().toLowerCase();
  const bodyText = $('body').text().toLowerCase();
  
  // Check for event-related keywords in URL, title, or main content
  const eventIndicators = [
    /event|fixture|match|game|concert|show|ticket|venue|stadium|arena/i,
    /vs\.|v\.|versus/i, // Sports fixtures
    /round|season|competition|tournament|series/i,
  ];
  
  const hasEventKeywords = eventIndicators.some(pattern => 
    pattern.test(html) || pattern.test(bodyText)
  );
  
  // Check for common event page structure elements
  const hasEventStructure = $('[class*="event"], [class*="fixture"], [class*="match"], [id*="event"], [id*="fixture"]').length > 0;
  
  // Check for date/time/venue sections
  const hasEventMetadata = $('[class*="date"], [class*="time"], [class*="venue"], [class*="location"]').length > 0;
  
  return hasEventKeywords || hasEventStructure || hasEventMetadata;
}

/**
 * Find the main content region of the page, avoiding nav/footer
 */
function findMainContent($: cheerio.CheerioAPI) {
  // Priority order: main, article, content sections
  const selectors = [
    'main',
    'article',
    '[role="main"]',
    '[class*="main-content"]',
    '[class*="content"]',
    '[id*="content"]',
    '[class*="event-detail"]',
    '[class*="fixture-detail"]',
    '[class*="page-content"]',
  ];
  
  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      // Check if it's not obviously nav/footer
      const classes = element.attr('class') || '';
      const id = element.attr('id') || '';
      if (!/(nav|footer|header|sidebar|cookie|newsletter)/i.test(classes + id)) {
        return element;
      }
    }
  }
  
  // Fallback: return body but remove nav/footer
  const $body = $('body').clone();
  $body.find('nav, footer, header, aside, .nav, .footer, .header, .sidebar, [class*="nav"], [class*="footer"]').remove();
  return $body;
}

/**
 * Extract title from page (prefer OG tags, then H1, then title tag)
 */
function extractTitle($: cheerio.CheerioAPI, mainContent: ReturnType<typeof findMainContent>): string | null {
  // Try OG title first
  const ogTitle = $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content');
  if (ogTitle) return ogTitle.trim();
  
  // Try H1 in main content
  const h1 = mainContent.find('h1').first().text().trim();
  if (h1 && h1.length > 3) return h1;
  
  // Fallback to title tag
  const titleTag = $('title').text().trim();
  if (titleTag) return titleTag;
  
  return null;
}

/**
 * Extract subtitle (H2 or short P near main heading)
 */
function extractSubtitle($: cheerio.CheerioAPI, mainContent: ReturnType<typeof findMainContent>): string | null {
  // Look for H2 after H1
  const h2 = mainContent.find('h1').first().nextAll('h2').first().text().trim();
  if (h2 && h2.length > 5 && h2.length < 150) return h2;
  
  // Look for short paragraph in hero/intro section
  const introP = mainContent.find('.intro, .hero, .lead, [class*="subtitle"]').first().text().trim();
  if (introP && introP.length > 10 && introP.length < 200) return introP;
  
  // Look for first P after H1
  const firstP = mainContent.find('h1').first().nextAll('p').first().text().trim();
  if (firstP && firstP.length > 10 && firstP.length < 150) return firstP;
  
  return null;
}

/**
 * Extract date and time using <time> tags and common patterns
 */
function extractDateAndTime($: cheerio.CheerioAPI, mainContent: ReturnType<typeof findMainContent>): { dateText: string | null; startTime: string | null } {
  let dateText: string | null = null;
  let startTime: string | null = null;
  
  // Try <time> tags first
  const timeTags = mainContent.find('time[datetime]');
  if (timeTags.length > 0) {
    timeTags.each((_, el) => {
      const datetime = $(el).attr('datetime');
      const text = $(el).text().trim();
      if (datetime) {
        try {
          const date = new Date(datetime);
          if (!isNaN(date.getTime())) {
            // Format as readable date
            dateText = date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            
            // Extract time if present
            if (datetime.includes('T')) {
              const timePart = datetime.split('T')[1];
              if (timePart) {
                const hour = parseInt(timePart.split(':')[0]);
                const minute = timePart.split(':')[1]?.split(/[:\+]/)[0] || '00';
                const ampm = hour >= 12 ? 'pm' : 'am';
                const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                startTime = `${displayHour}:${minute} ${ampm}`;
              }
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      if (!dateText && text) {
        dateText = text;
      }
    });
  }
  
  // Look for common date/time class patterns
  if (!dateText || !startTime) {
    const dateElements = mainContent.find('[class*="date"], [class*="event-date"], [class*="fixture-date"], [class*="match-date"]');
    dateElements.each((_, el) => {
      const text = $(el).text().trim();
      if (!dateText && text.length > 8 && text.length < 100) {
        // Check if it looks like a date
        if (/[a-z]{3,9}\s+\d{1,2}|d{1,2}\/[0-9]|july|august|september|october|november|december|january|february|march|april|may|june/i.test(text)) {
          dateText = text;
        }
      }
    });
    
    const timeElements = mainContent.find('[class*="time"], [class*="start"], [class*="kickoff"], [class*="ko"]');
    timeElements.each((_, el) => {
      const text = $(el).text().trim();
      if (!startTime && /^\d{1,2}:?\d{0,2}\s*(am|pm)/i.test(text)) {
        startTime = text;
      }
    });
  }
  
  // Fallback: pattern matching in main content text
  if (!dateText || !startTime) {
    const mainText = mainContent.text();
    
    // Date patterns - try to extract full dates with day name
    if (!dateText) {
      const datePatterns = [
        // Full date with day: "Saturday 12 July 2025", "Sat, July 12, 2025"
        /((?:saturday|sunday|monday|tuesday|wednesday|thursday|friday),?\s+[a-z]{3,9}\s+\d{1,2}(?:[–-]\d{1,2})?,?\s+\d{4})/i,
        // Full month name: "12 July 2025", "July 12, 2025"
        /(\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})/i,
        /((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4})/i,
        // Short month: "12 Jul 2025", "Jul 12, 2025"
        /([a-z]{3,9}\s+\d{1,2}(?:[–-]\d{1,2})?,?\s+\d{4})/i,
      ];
      
      for (const pattern of datePatterns) {
        const match = mainText.match(pattern);
        if (match && match[1]) {
          dateText = match[1].trim();
          break;
        }
      }
    }
    
    // Time patterns
    if (!startTime) {
      const timePatterns = [
        /(?:kick.?off|ko|start|time)[\s:]+(\d{1,2}:?\d{0,2}\s*(?:am|pm|AM|PM))/i,
        /(\d{1,2}:?\d{0,2}\s*(?:am|pm|AM|PM))(?:\s+[a-z]{3,9})?/i,
      ];
      
      for (const pattern of timePatterns) {
        const match = mainText.match(pattern);
        if (match && match[1]) {
          startTime = match[1].trim();
          break;
        }
      }
    }
  }
  
  return { dateText, startTime };
}

/**
 * Extract venue name and location
 */
function extractVenueAndLocation($: cheerio.CheerioAPI, mainContent: ReturnType<typeof findMainContent>): { venueName: string | null; locationText: string | null } {
  let venueName: string | null = null;
  let locationText: string | null = null;
  
  // Look for venue-specific elements
  const venueSelectors = [
    '[class*="venue"]',
    '[class*="location"]',
    '[class*="stadium"]',
    '[class*="arena"]',
    '[class*="ground"]',
    '[id*="venue"]',
    '[id*="location"]',
  ];
  
  for (const selector of venueSelectors) {
    const elements = mainContent.find(selector);
    if (elements.length > 0) {
      elements.each((_, el) => {
        const text = $(el).text().trim();
        const classes = $(el).attr('class') || '';
        
        // Skip if it looks like navigation or footer
        if (/(nav|footer|menu|header)/i.test(classes)) return;
        
        if (text.length > 5 && text.length < 200 && !text.includes('http')) {
          // Check if it contains venue keywords
          if (/(stadium|arena|park|ground|centre|center|theatre|theater|hall|venue|location)/i.test(text)) {
            if (!venueName) venueName = text;
          } else if (!locationText) {
            locationText = text;
          }
        }
      });
    }
  }
  
  // Fallback: pattern matching
  if (!venueName || !locationText) {
    const mainText = mainContent.text();
    
    // Venue pattern (stadium, arena, etc.)
    if (!venueName) {
      const venuePattern = /\b([A-Z][a-zA-Z\s]+?(?:stadium|arena|park|ground|centre|center|theatre|theater|hall|pavilion))\b/i;
      const match = mainText.match(venuePattern);
      if (match && match[1]) {
        venueName = match[1].trim();
      }
    }
    
    // Location pattern (city, region)
    if (!locationText) {
      const locationPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)(?:,?\s+[A-Z][a-zA-Z]+)?\s*(?:New Zealand|Australia|UK|United Kingdom|USA|United States)/i;
      const match = mainText.match(locationPattern);
      if (match && match[1]) {
        locationText = match[1].trim();
      }
    }
  }
  
  return { venueName, locationText };
}

/**
 * Extract price information - conservative approach
 * Only sets prices when reasonably confident to avoid wrong values
 */
function extractPrice($: cheerio.CheerioAPI, mainContent: ReturnType<typeof findMainContent>): { priceFrom: number | null; priceText: string | null } {
  // Currency symbols and codes pattern
  const currencyPattern = /(?:^|\s)([$£€]|NZD|AUD|USD|GBP|EUR)\s*/i;
  
  // Price number pattern: matches $29, $29.00, NZD 29, $29 - $49, etc.
  const priceNumberPattern = /(?:[$£€]|NZD|AUD|USD|GBP|EUR)\s*(\d+(?:\.\d{2})?)(?:\s*[–-]\s*(?:[$£€]|NZD|AUD|USD|GBP|EUR)?\s*(\d+(?:\.\d{2})?))?/gi;
  
  // Ticket-related keywords for context
  const ticketKeywords = /\b(ticket|tickets|admission|entry|from|price|prices|cost|fee|adult|child|concession|senior|student)\b/i;
  
  interface PriceCandidate {
    value: number;
    text: string;
    context: string;
    confidence: number; // Higher = more confident
  }
  
  const candidates: PriceCandidate[] = [];
  
  // 1. Prioritize elements with price/ticket-related classes
  const priceSelectors = [
    '[class*="price"]',
    '[class*="ticket"]',
    '[class*="cost"]',
    '[class*="fee"]',
    '[class*="admission"]',
    '[class*="entry"]',
  ];
  
  for (const selector of priceSelectors) {
    const elements = mainContent.find(selector);
    if (elements.length > 0) {
      elements.each((_, el) => {
        const text = $(el).text().trim();
        const elementHtml = $(el).html() || '';
        
        // Skip if too long (likely not a price element)
        if (text.length > 200) return;
        
        // Check if element or nearby context contains ticket keywords
        const hasTicketContext = ticketKeywords.test(text) || 
          ticketKeywords.test($(el).prev().text()) ||
          ticketKeywords.test($(el).parent().text());
        
        if (!hasTicketContext) return;
        
        // Extract all price numbers from this element
        const matches = [...text.matchAll(priceNumberPattern)];
        for (const match of matches) {
          const firstNum = parseFloat(match[1]);
          const secondNum = match[2] ? parseFloat(match[2]) : null;
          
          if (!isNaN(firstNum) && firstNum > 0) {
            // Clean up the price text (remove extra whitespace, normalize)
            const priceText = match[0].trim();
            
            candidates.push({
              value: firstNum,
              text: priceText,
              context: text.slice(0, 150), // Keep some context
              confidence: hasTicketContext ? 8 : 5, // Higher confidence with ticket context
            });
            
            // If there's a range, also consider the second number
            if (secondNum && !isNaN(secondNum) && secondNum > firstNum) {
              candidates.push({
                value: firstNum, // Use the lower value from range
                text: match[0].trim(),
                context: text.slice(0, 150),
                confidence: hasTicketContext ? 8 : 5,
              });
            }
          }
        }
      });
    }
  }
  
  // 2. Search in main content text near ticket keywords (less confident)
  // Only do this if we haven't found good candidates yet
  const mainText = mainContent.text();
  
  // 2a. Check for "free" or "complimentary" events first (before numeric prices)
  const freePattern = /\b(free|complimentary|no charge|no admission|gratis)\b/i;
  if (freePattern.test(mainText)) {
    // Check if "free" appears near ticket/event keywords
    const freeMatches = [...mainText.matchAll(freePattern)];
    for (const match of freeMatches) {
      const context = mainText.slice(Math.max(0, match.index! - 50), match.index! + match[0].length + 50);
      if (ticketKeywords.test(context)) {
        candidates.push({
          value: 0,
          text: 'Free',
          context: context,
          confidence: 7, // High confidence for explicit "free" near ticket keywords
        });
        break; // Only add one free entry
      }
    }
  }
  
  // 2b. Search for numeric prices in text (only if no high-confidence candidates yet)
  if (candidates.filter(c => c.confidence >= 7).length === 0) {
    // Look for patterns like "From $29", "Tickets: $29", "Price: $29 - $49"
    const priceWithContextPattern = /(?:tickets?:?|price:?|from|cost:?|entry:?|admission:?)\s*[:\-–]?\s*([$£€]|NZD|AUD|USD|GBP|EUR)\s*(\d+(?:\.\d{2})?)(?:\s*[–-]\s*(?:[$£€]|NZD|AUD|USD|GBP|EUR)?\s*(\d+(?:\.\d{2})?))?/gi;
    
    const contextMatches = [...mainText.matchAll(priceWithContextPattern)];
    for (const match of contextMatches) {
      const num = parseFloat(match[2]);
      const secondNum = match[3] ? parseFloat(match[3]) : null;
      
      if (!isNaN(num) && num > 0) {
        // Get surrounding context
        const matchIndex = match.index || 0;
        const context = mainText.slice(Math.max(0, matchIndex - 50), matchIndex + match[0].length + 50);
        
        candidates.push({
          value: num,
          text: match[0].trim(),
          context: context,
          confidence: 6, // Medium confidence
        });
        
        if (secondNum && !isNaN(secondNum) && secondNum > num) {
          candidates.push({
            value: num, // Use lower value from range
            text: match[0].trim(),
            context: context,
            confidence: 6,
          });
        }
      }
    }
  }
  
  // 3. Filter out low-confidence or suspicious candidates
  const validCandidates = candidates.filter(c => {
    // Reject very low prices that aren't near ticket keywords (could be page numbers, etc.)
    if (c.value > 0 && c.value < 1 && !ticketKeywords.test(c.context)) {
      return false;
    }
    
    // Reject prices that look like dates or times
    if (c.value > 0 && c.value < 32 && /\b(day|days|hour|hours|minute|minutes|week|weeks|month|months)\b/i.test(c.context)) {
      return false;
    }
    
    // Reject isolated "$0" unless explicitly "free"
    if (c.value === 0 && !/\b(free|complimentary|no charge|no admission|gratis)\b/i.test(c.context)) {
      return false;
    }
    
    // Reject prices that are clearly not ticket prices (like phone numbers, addresses)
    if (c.value > 100000 || (c.value > 1000 && /\b(phone|tel|address|zip|postal|code)\b/i.test(c.context))) {
      return false;
    }
    
    return true;
  });
  
  // 4. If no valid candidates, return null (conservative approach)
  if (validCandidates.length === 0) {
    return { priceFrom: null, priceText: null };
  }
  
  // 5. Choose the best candidate: lowest price value, highest confidence
  validCandidates.sort((a, b) => {
    // First sort by confidence (descending)
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    // Then by value (ascending - prefer lower prices)
    return a.value - b.value;
  });
  
  const bestCandidate = validCandidates[0];
  
  // 6. Final confidence check: require at least medium confidence
  if (bestCandidate.confidence < 5) {
    return { priceFrom: null, priceText: null };
  }
  
  // 7. Find the absolute lowest price from all valid candidates (might be different from best text)
  const lowestPrice = Math.min(...validCandidates.map(c => c.value));
  
  // 8. Use the best candidate's text (which has good context) but lowest price value
  return {
    priceFrom: lowestPrice,
    priceText: bestCandidate.text.length <= 100 ? bestCandidate.text : bestCandidate.text.slice(0, 100),
  };
}

/**
 * Extract competition or series name
 */
function extractCompetitionOrSeries($: cheerio.CheerioAPI, mainContent: ReturnType<typeof findMainContent>): string | null {
  // Look for competition/series in specific elements first
  const competitionSelectors = [
    '[class*="competition"]',
    '[class*="series"]',
    '[class*="tournament"]',
    '[class*="league"]',
    '[class*="championship"]',
  ];
  
  for (const selector of competitionSelectors) {
    const elements = mainContent.find(selector);
    if (elements.length > 0) {
      const text = elements.first().text().trim();
      if (text.length > 3 && text.length < 100 && !/(nav|footer|menu|header)/i.test(elements.first().attr('class') || '')) {
        return text;
      }
    }
  }
  
  // Pattern matching as fallback
  const competitionPatterns = [
    /(?:competition|series|tournament|league|championship)[\s:]+([A-Z][a-zA-Z\s]+?)(?:\s|$|\.|,)/i,
    /\b(Super\s+Rugby|All\s+Blacks|NRL|AFL|Premier\s+League|Champions\s+League|ANZAC\s+Cup|NPC|Mitre\s+10\s+Cup)\b/i,
  ];
  
  const mainText = mainContent.text();
  for (const pattern of competitionPatterns) {
    const match = mainText.match(pattern);
    if (match && match[1]) {
      const comp = match[1].trim().replace(/[,\.]$/, '');
      if (comp.length > 3 && comp.length < 100) {
        return comp;
      }
    }
  }
  
  return null;
}

/**
 * Extract a short descriptive snippet from main content
 */
function extractRawSnippet($: cheerio.CheerioAPI, mainContent: ReturnType<typeof findMainContent>): string | null {
  // Try to find first meaningful paragraph (excluding intro/lead which might be used as subtitle)
  const paragraphs = mainContent.find('p');
  
  for (let i = 0; i < paragraphs.length; i++) {
    const text = $(paragraphs[i]).text().trim();
    
    // Skip if too short or looks like navigation/noise
    if (text.length < 50 || text.length > 500) continue;
    if (isNoiseLine(text)) continue;
    
    // Skip if it's the subtitle/intro
    if ($(paragraphs[i]).hasClass('intro') || $(paragraphs[i]).hasClass('lead') || $(paragraphs[i]).hasClass('subtitle')) {
      continue;
    }
    
    // This looks like a good snippet
    return text.slice(0, MAX_SNIPPET_LENGTH);
  }
  
  // Fallback: use first significant text block
  const allText = mainContent.text();
  const sentences = allText.split(/[.!?]\s+/).filter(s => s.length > 50 && s.length < 200);
  if (sentences.length > 0) {
    return sentences[0].slice(0, MAX_SNIPPET_LENGTH);
  }
  
  return null;
}

/**
 * Enhanced extraction using Cheerio for better HTML parsing
 * This is the legacy function signature - we'll enhance it but maintain backward compatibility
 */
export function extractEventDetails(html: string, cleanedText: string): EventDetails {
  const $ = cheerio.load(html);
  const isEvent = isEventPage($);
  const mainContent = findMainContent($);
  
  const details: EventDetails = {
    // Legacy fields
    venue: null,
    date: null,
    time: null,
    price: null,
    format: null,
    hosts: null,
    key_points: null,
    
    // Enhanced fields
    title: null,
    subtitle: null,
    dateText: null,
    startTime: null,
    venueName: null,
    locationText: null,
    priceFrom: null,
    priceText: null,
    competitionOrSeries: null,
    rawSnippet: null,
  };

  // If it looks like an event page, use enhanced extraction
  if (isEvent) {
    // Extract enhanced fields
    details.title = extractTitle($, mainContent);
    details.subtitle = extractSubtitle($, mainContent);
    
    const { dateText, startTime } = extractDateAndTime($, mainContent);
    details.dateText = dateText;
    details.startTime = startTime;
    
    const { venueName, locationText } = extractVenueAndLocation($, mainContent);
    details.venueName = venueName;
    details.locationText = locationText;
    
    const { priceFrom, priceText } = extractPrice($, mainContent);
    details.priceFrom = priceFrom;
    details.priceText = priceText;
    
    details.competitionOrSeries = extractCompetitionOrSeries($, mainContent);
    details.rawSnippet = extractRawSnippet($, mainContent);
    
    // Populate legacy fields from enhanced fields for backward compatibility
    if (details.dateText) details.date = details.dateText;
    if (details.startTime) details.time = details.startTime;
    if (details.venueName) details.venue = details.venueName;
    if (details.priceText) details.price = details.priceText;
  }

  // Always run legacy extraction as fallback or for non-event pages
  const rawHtmlPreview = html.slice(0, 8000);
  const searchText = (rawHtmlPreview + '\n\n' + cleanedText.slice(0, 2000)).toLowerCase();

  // Legacy extraction as fallback (only fill in if enhanced extraction didn't find values)
  // 1. Extract VENUE/LOCATION
  if (!details.venue && !details.venueName) {
    // Pattern 1: Address format (number + street name + road/street/etc)
    const venuePattern1 = /(\d+\s+[a-z]+(?:\s+[a-z]+){0,3}\s+(?:road|street|avenue|lane|drive|place|way|boulevard|court|terrace|crescent|st|ave|rd|dr)[^.!?\n]{0,50})/i;
    const venueMatch1 = searchText.match(venuePattern1);
    if (venueMatch1 && venueMatch1[1]) {
      const venue = venueMatch1[1].trim();
      if (venue.length > 5 && venue.length < 200 && !venue.includes('http')) {
        details.venue = venue;
        details.venueName = venue; // Also populate enhanced field
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
          details.venueName = venue; // Also populate enhanced field
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
          details.venueName = venue; // Also populate enhanced field
        }
      }
    }
  }

  // 2. Extract DATE(S) - legacy fallback
  if (!details.date && !details.dateText) {
    const datePattern1 = /([a-z]{3,9}\s+\d{1,2}(?:[–-]\d{1,2})?,?\s+\d{4})/i;
    const dateMatch1 = searchText.match(datePattern1);
    if (dateMatch1 && dateMatch1[1]) {
      details.date = dateMatch1[1].trim();
      details.dateText = dateMatch1[1].trim(); // Also populate enhanced field
    }

    if (!details.date) {
      const datePattern2 = /(?:date|dates|when)[\s:]+([a-z]{3,9}\s+\d{1,2}(?:[–-]\d{1,2})?,?\s+\d{4}[^.!?\n]{0,50})/i;
      const dateMatch2 = searchText.match(datePattern2);
      if (dateMatch2 && dateMatch2[1]) {
        const date = dateMatch2[1].trim();
        if (date.length > 8 && date.length < 100) {
          details.date = date;
          details.dateText = date; // Also populate enhanced field
        }
      }
    }

    if (!details.date) {
      const datePattern3 = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/;
      const dateMatch3 = searchText.match(datePattern3);
      if (dateMatch3 && dateMatch3[1]) {
        details.date = dateMatch3[1].trim();
        details.dateText = dateMatch3[1].trim(); // Also populate enhanced field
      }
    }
  }

  // 3. Extract TIME(S) - legacy fallback
  if (!details.time && !details.startTime) {
    const timePattern1 = /(\d{1,2}:?\d{0,2}\s*(?:am|pm|AM|PM|[–-]\s*\d{1,2}:?\d{0,2}\s*(?:am|pm|AM|PM)?))/i;
    const timeMatch1 = searchText.match(timePattern1);
    if (timeMatch1 && timeMatch1[1]) {
      details.time = timeMatch1[1].trim();
      details.startTime = timeMatch1[1].trim(); // Also populate enhanced field
    }

    if (!details.time) {
      const timePattern2 = /(?:time|starts?|ends?)[\s:]+(\d{1,2}:?\d{0,2}\s*(?:am|pm|AM|PM)[^.!?\n]{0,30})/i;
      const timeMatch2 = searchText.match(timePattern2);
      if (timeMatch2 && timeMatch2[1]) {
        details.time = timeMatch2[1].trim();
        details.startTime = timeMatch2[1].trim(); // Also populate enhanced field
      }
    }
  }

  // 4. Extract PRICE/TICKETS - legacy fallback
  if (!details.price && !details.priceText) {
    const pricePattern1 = /(\$?\d+(?:\.\d{2})?(?:\s*[–-]\s*\$?\d+(?:\.\d{2})?)?|free|complimentary)/i;
    const priceMatch1 = searchText.match(pricePattern1);
    if (priceMatch1 && priceMatch1[1]) {
      const priceText = priceMatch1[1].trim();
      const priceContext = searchText.slice(Math.max(0, priceMatch1.index! - 30), priceMatch1.index! + priceText.length + 30);
      if (priceContext.match(/(?:price|ticket|cost|entry|fee)/i)) {
        details.price = priceText;
        details.priceText = priceText; // Also populate enhanced field
        
        // Extract numeric value
        const numMatch = priceText.match(/(\d+(?:\.\d{2})?)/);
        if (numMatch && numMatch[1]) {
          details.priceFrom = parseFloat(numMatch[1]);
        }
      }
    }

    if (!details.price) {
      const pricePattern2 = /(?:price|tickets?|cost|entry|fee)[\s:]+(\$?\d+(?:\.\d{2})?(?:\s*[–-]\s*\$?\d+(?:\.\d{2})?)?|free|complimentary)[^.!?\n]{0,30}/i;
      const priceMatch2 = searchText.match(pricePattern2);
      if (priceMatch2 && priceMatch2[1]) {
        details.price = priceMatch2[1].trim();
        details.priceText = priceMatch2[1].trim(); // Also populate enhanced field
        
        // Extract numeric value
        const numMatch = details.price.match(/(\d+(?:\.\d{2})?)/);
        if (numMatch && numMatch[1]) {
          details.priceFrom = parseFloat(numMatch[1]);
        }
      }
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

/**
 * Fallback extraction for JS-heavy pages (like Ticketmaster) where main extraction fails
 * Only fills in missing fields, doesn't overwrite existing good data
 */
function applyFallbackExtraction(
  $: cheerio.CheerioAPI,
  html: string,
  currentSummary: string,
  currentDetails: EventDetails
): { summary: string; details: EventDetails } {
  const result = {
    summary: currentSummary,
    details: { ...currentDetails },
  };
  
  // Only run fallback if summary is empty/short AND most details are missing
  const isSummaryEmpty = !currentSummary || currentSummary.trim().length < 50;
  const isMostlyEmpty = !currentDetails.date && 
                       !currentDetails.dateText &&
                       !currentDetails.venue && 
                       !currentDetails.venueName &&
                       !currentDetails.time &&
                       !currentDetails.startTime;
  
  if (!isSummaryEmpty || !isMostlyEmpty) {
    return result; // Don't run fallback if we already have good data
  }
  
  // 1. Fallback title/summary from meta tags
  if (isSummaryEmpty) {
    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() ||
                   $('meta[name="twitter:title"]').attr('content')?.trim() ||
                   $('title').text().trim() ||
                   null;
    
    const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() ||
                         $('meta[name="description"]').attr('content')?.trim() ||
                         null;
    
    if (ogTitle) {
      if (ogDescription) {
        result.summary = `${ogTitle} — ${ogDescription}`;
      } else {
        result.summary = ogTitle;
      }
      
      // Truncate if too long
      if (result.summary.length > MAX_SUMMARY_LENGTH) {
        result.summary = result.summary.slice(0, MAX_SUMMARY_LENGTH).trim();
        const lastSpace = result.summary.lastIndexOf(' ');
        if (lastSpace > MAX_SUMMARY_LENGTH * 0.8) {
          result.summary = result.summary.slice(0, lastSpace).trim();
        }
      }
    }
  }
  
  // 2. Simple date/time detection from raw HTML (only if missing)
  if (!currentDetails.date && !currentDetails.dateText && !currentDetails.time && !currentDetails.startTime) {
    const htmlText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                         .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                         .replace(/<[^>]+>/g, ' ')
                         .replace(/\s+/g, ' ');
    
    // Date patterns - lenient matching (prioritize full dates with year)
    const datePatterns = [
      // Full dates with year (preferred): "12 July 2025", "July 12, 2025", "12/07/2025"
      /\b([a-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[a-z]{3,9}\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/i,
      // Partial dates (less preferred): "12 July", "July 12"
      /\b([a-z]{3,9}\s+\d{1,2}|\d{1,2}\s+[a-z]{3,9})\b/i,
    ];
    
    for (const pattern of datePatterns) {
      const matches = [...htmlText.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const dateStr = match[1].trim();
          // Basic validation: 
          // - Doesn't look like a time
          // - Has reasonable length
          // - Doesn't look like a random number sequence
          if (dateStr.length >= 6 && 
              dateStr.length <= 30 && 
              !/^\d{1,2}:\d{2}/.test(dateStr) &&
              !/^\d+$/.test(dateStr.replace(/[\/\-\s,]/g, ''))) {
            result.details.date = dateStr;
            result.details.dateText = dateStr;
            break; // Take first reasonable match
          }
        }
      }
      // If we found a good date, stop looking
      if (result.details.date) break;
    }
    
    // Time patterns - lenient matching
    const timePatterns = [
      // 12-hour with am/pm (preferred): "7:35 pm", "7:35pm", "7.35pm"
      /\b(\d{1,2}[\.:]?\d{0,2}\s*(am|pm|AM|PM))\b/i,
      // 24-hour format: "19:35", "19.35"
      /\b([01]?\d|2[0-3])[\.:]?([0-5]\d)\b(?![\.:]?\d)/,
    ];
    
    for (const pattern of timePatterns) {
      const matches = [...htmlText.matchAll(pattern)];
      for (const match of matches) {
        const timeStr = match[0].trim();
        // Basic validation: 
        // - Reasonable length
        // - Looks like a valid time (not part of a date or other number)
        if (timeStr.length >= 3 && 
            timeStr.length <= 10 &&
            !/^\d{4,}$/.test(timeStr.replace(/[\.:]/g, ''))) {
          result.details.time = timeStr;
          result.details.startTime = timeStr;
          break; // Take first reasonable match
        }
      }
      // If we found a good time, stop looking
      if (result.details.time) break;
    }
  }
  
  return result;
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
    const $ = cheerio.load(html);
    
    // Remove non-content elements before extracting
    $('script, style, nav, footer, header, aside, .nav, .footer, .header, .sidebar, [class*="nav"], [class*="footer"], [class*="cookie"], [class*="newsletter"]').remove();
    
    // Find main content for better text extraction
    const mainContent = findMainContent($);
    const mainContentText = mainContent.text();
    
    // Extract raw text for legacy fallback (from main content if available, else body)
    const rawText = mainContentText || $('body').text();
    
    // Clean the text
    const cleanedText = cleanExtractedText(rawText);
    
    // Extract structured event details (uses Cheerio internally for enhanced extraction)
    const eventDetails = extractEventDetails(html, cleanedText);
    
    // Build clean summary text from main content (truncated at word boundary)
    // Prefer rawSnippet if available, otherwise use cleaned text from main content
    let trimmed: string;
    if (eventDetails.rawSnippet) {
      trimmed = eventDetails.rawSnippet;
    } else {
      trimmed = cleanedText.slice(0, Math.max(0, MAX_SUMMARY_LENGTH)).trim();
      
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
    }
    
    // Build structured summary
    let structuredSummary: StructuredUrlSummary = {
      summary: trimmed,
      details: eventDetails,
    };
    
    // Apply fallback extraction for JS-heavy pages (only fills missing fields)
    const fallbackResult = applyFallbackExtraction($, html, trimmed, eventDetails);
    structuredSummary = {
      summary: fallbackResult.summary || trimmed, // Use fallback if it's better
      details: fallbackResult.details,
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

