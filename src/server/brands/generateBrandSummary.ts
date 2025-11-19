/**
 * Server-side helper to generate AI summary for a brand based on its website
 * 
 * This function:
 * 1. Fetches the brand from Supabase (including website_url)
 * 2. Fetches and extracts text from the homepage
 * 3. Calls OpenAI to generate a 2-3 paragraph summary
 * 4. Saves the summary back to the database
 * 
 * This should be called as fire-and-forget after brand creation.
 * Errors are logged but do not throw to avoid breaking signup flows.
 */

import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { supabaseAdmin } from '@/lib/supabase-server';

// Initialize OpenAI client (reusing existing pattern)
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
}

/**
 * Extract usable text content from HTML
 * Removes script/style tags and common navigation/footer elements
 */
async function extractWebsiteText(url: string): Promise<string> {
  try {
    // Normalize URL - ensure it has a protocol
    const normalizedUrl = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;

    // Fetch the page with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FerdyBot/1.0; +https://ferdy.app)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract title
      const title = $('title').first().text().trim() || $('h1').first().text().trim();
      
      // Extract meta description
      const metaDescription = 
        $('meta[name="description"]').attr('content') || 
        $('meta[property="og:description"]').attr('content') || 
        '';

      // Remove non-content elements
      $('script, style, nav, footer, header, aside, .nav, .footer, .header, .sidebar').remove();

      // Extract main body text - try to find main content areas first
      let bodyText = '';
      const mainContent = $('main, article, .main, .content, .page-content, #content').first();
      if (mainContent.length > 0) {
        bodyText = mainContent.text();
      } else {
        // Fallback to body
        bodyText = $('body').text();
      }

      // Clean up text (remove extra whitespace, normalize line breaks)
      bodyText = bodyText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      // Combine all text parts
      const combinedText = [title, metaDescription, bodyText]
        .filter(Boolean)
        .join('\n\n');

      // Limit to ~15,000 characters to stay within token limits
      if (combinedText.length > 15000) {
        return combinedText.substring(0, 15000) + '...';
      }

      return combinedText || 'Unable to extract content from website.';
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: website took too long to respond');
      }
      throw new Error(`Error fetching website: ${error.message}`);
    }
    throw new Error('Unknown error fetching website');
  }
}

/**
 * Generate brand summary using OpenAI
 */
async function generateSummaryWithOpenAI(websiteText: string, brandName: string, websiteUrl: string): Promise<string> {
  const client = getOpenAIClient();

  const prompt = `You are analysing the homepage of a brand called "${brandName}".

Website URL: ${websiteUrl}

Based on the following HTML/text content from their homepage, summarise the brand in a way that's useful for social-media copywriting.

Include: what they sell or offer, who they serve, their tone/positioning, and any key value propositions or themes.

Output in 2-3 short paragraphs in plain text, no markdown. Focus on actionable insights for writing engaging social media content.

Here is the page content:

${websiteText}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a brand analyst specializing in social media copywriting. Analyze brand websites and provide concise, actionable summaries that help writers understand the brand\'s voice, audience, and key messaging.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, factual summaries
      max_tokens: 500, // Limit to ~2-3 paragraphs
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    return content;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown error calling OpenAI');
  }
}

/**
 * Main function to generate brand summary
 * 
 * This function:
 * 1. Loads the brand from Supabase
 * 2. Validates website_url exists
 * 3. Fetches and extracts homepage text
 * 4. Generates AI summary
 * 5. Saves to database
 * 
 * All errors are caught and logged, but not thrown (fire-and-forget pattern)
 */
export async function generateBrandSummaryForBrand(brandId: string): Promise<void> {
  try {
    // 1. Load brand from Supabase
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('id, name, website_url')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      console.error(`[generateBrandSummary] Brand not found: ${brandId}`, brandError);
      return; // Don't throw - this is fire-and-forget
    }

    // 2. Validate website_url exists
    if (!brand.website_url || !brand.website_url.trim()) {
      console.warn(`[generateBrandSummary] Brand ${brandId} (${brand.name}) has no website_url, skipping AI summary generation`);
      return; // Not an error - some brands may not have websites
    }

    // 3. Fetch and extract homepage text
    let websiteText: string;
    try {
      websiteText = await extractWebsiteText(brand.website_url);
    } catch (error) {
      console.error(`[generateBrandSummary] Failed to fetch website for brand ${brandId}:`, error);
      // Don't throw - just log and return
      return;
    }

    // 4. Generate AI summary
    let summary: string;
    try {
      summary = await generateSummaryWithOpenAI(websiteText, brand.name, brand.website_url);
    } catch (error) {
      console.error(`[generateBrandSummary] Failed to generate AI summary for brand ${brandId}:`, error);
      // Don't throw - just log and return
      return;
    }

    // 5. Save to database
    const { error: updateError } = await supabaseAdmin
      .from('brands')
      .update({
        ai_summary: summary,
        ai_summary_last_generated_at: new Date().toISOString(),
      })
      .eq('id', brandId);

    if (updateError) {
      console.error(`[generateBrandSummary] Failed to save AI summary for brand ${brandId}:`, updateError);
      // Don't throw - just log
      return;
    }

    console.log(`[generateBrandSummary] Successfully generated and saved AI summary for brand ${brandId} (${brand.name})`);
  } catch (error) {
    // Catch-all for any unexpected errors
    console.error(`[generateBrandSummary] Unexpected error for brand ${brandId}:`, error);
    // Don't throw - this is fire-and-forget
  }
}

