import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as cheerio from "cheerio";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { generatePostCopyFromContext, type PostCopyPayload } from "@/lib/postCopy";

// Force dynamic rendering - this route must run at request time
export const dynamic = 'force-dynamic';

// Lazy initialization - only creates client when needed
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

// Schema for brand_summarize payload
const brandSummarizeSchema = z.object({
  task: z.literal("brand_summarize"),
  payload: z.object({
    brandId: z.string().uuid(),
  }),
});

// Schema for post_copy payload
const postCopySchema = z.object({
  task: z.literal("post_copy"),
  payload: z.object({
    brandId: z.string().uuid(),
    prompt: z.string().min(1),
    platform: z.enum(["instagram", "facebook", "tiktok", "linkedin"]).optional(),
    draftId: z.string().uuid().optional(),
    variants: z.number().int().min(1).max(3).optional(),
    max_tokens: z.number().int().min(1).optional(),
    subcategory: z.object({
      name: z.string().optional(),
      url: z.string().optional(),
      description: z.string().optional(),
      frequency_type: z.string().optional(),
      url_page_summary: z.string().nullable().optional(),
      default_copy_length: z.enum(["short", "medium", "long"]).optional(),
    }).optional(),
    schedule: z.object({
      frequency: z.string(),
      event_date: z.string().optional(),
      days_until_event: z.number().optional(),
    }).optional(),
    scheduledFor: z.string().optional(),
    tone_override: z.string().optional(),
    length: z.enum(["short", "medium", "long"]).optional(),
    emoji: z.enum(["auto", "none"]).optional(),
    hashtags: z.object({
      mode: z.enum(["auto", "none", "list"]),
      list: z.array(z.string()).optional(),
    }).optional(),
    cta: z.string().optional(),
  }),
});

// Schema for the expected JSON response from OpenAI
const brandSummarySchema = z.object({
  name: z.string().optional(),
  what_they_sell: z.string().optional(),
  target_audience: z.string().optional(),
  tone_of_voice: z.string().optional(),
  brand_values: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  price_positioning: z.string().optional(),
  key_offers: z.array(z.string()).optional(),
  social_links_if_found: z.record(z.string(), z.string()).optional(),
  source_url: z.string().optional(),
});

// Fetch and extract text from a website
async function extractWebsiteText(url: string): Promise<string> {
  try {
    // Ensure URL has protocol
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    
    const response = await fetch(fullUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FerdyBot/1.0; +https://ferdy.app)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    const title = $("title").first().text().trim() || $("h1").first().text().trim();
    
    // Extract meta description
    const metaDescription = $('meta[name="description"]').attr("content") || 
                           $('meta[property="og:description"]').attr("content") || "";

    // Remove script, style, and other non-content elements
    $("script, style, nav, footer, header, aside, .nav, .footer, .header, .sidebar").remove();

    // Extract main body text
    let bodyText = "";
    
    // Try to find main content areas
    const mainContent = $("main, article, .main, .content, .page-content, #content").first();
    if (mainContent.length > 0) {
      bodyText = mainContent.text();
    } else {
      // Fallback to body
      bodyText = $("body").text();
    }

    // Clean up text (remove extra whitespace)
    bodyText = bodyText
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    // Combine all text
    let combinedText = [title, metaDescription, bodyText]
      .filter(Boolean)
      .join("\n\n");

    // Limit to 15,000 characters
    if (combinedText.length > 15000) {
      combinedText = combinedText.substring(0, 15000) + "...";
    }

    return combinedText || "Unable to extract content from website.";
  } catch (error) {
    throw new Error(`Error extracting website text: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Generate brand summary using OpenAI
async function generateBrandSummary(websiteText: string, websiteUrl: string): Promise<z.infer<typeof brandSummarySchema>> {
  const client = getClient();

  const prompt = `Analyze the following website content and provide a structured JSON summary of the brand.

Website URL: ${websiteUrl}

Extracted Content:
${websiteText}

Please analyze this content and provide a JSON object with the following structure:
{
  "name": "The brand name",
  "what_they_sell": "Brief description of products/services",
  "target_audience": "Who they target",
  "tone_of_voice": "The brand's communication style",
  "brand_values": ["value1", "value2", "value3"],
  "locations": ["location1", "location2"] or empty array if not specified,
  "price_positioning": "budget, mid-range, premium, or luxury",
  "key_offers": ["offer1", "offer2", "offer3"],
  "social_links_if_found": {"platform": "url"} or empty object,
  "source_url": "${websiteUrl}"
}

Return ONLY valid JSON, no additional text.`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a brand analyst. Analyze website content and return structured JSON summaries. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    // Parse and validate the JSON
    const parsed = JSON.parse(content);
    const validated = brandSummarySchema.parse(parsed);

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid JSON structure from OpenAI: ${error.issues.map((e) => e.message).join(", ")}`);
    }
    throw error;
  }
}

export async function GET(req: NextRequest) {
  // Simple test you can run in a browser
  const task = new URL(req.url).searchParams.get("task");
  if (task === "ping") return NextResponse.json({ ok: true });
  return NextResponse.json({ error: "Use ?task=ping to test" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
  const body = await req.json().catch(() => ({}));
    
    // Handle ping task
  if (body?.task === "ping") {
      const client = getClient();
    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Reply with the single word: PONG" },
        { role: "user", content: "Say it" }
      ],
      temperature: 0
    });
    const text = r.choices[0]?.message?.content?.trim() || "";
    return NextResponse.json({ ok: text === "PONG", text });
  }

    // Handle brand_summarize task
    if (body?.task === "brand_summarize") {
      // Validate payload
      const validationResult = brandSummarizeSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid payload", details: validationResult.error.issues },
          { status: 400 }
        );
      }

      const { brandId } = validationResult.data.payload;

      // Fetch brand from Supabase
      const { data: brand, error: brandError } = await supabaseAdmin
        .from("brands")
        .select("id, name, website_url")
        .eq("id", brandId)
        .single();

      if (brandError || !brand) {
        return NextResponse.json(
          { error: "Brand not found", details: brandError?.message },
          { status: 404 }
        );
      }

      if (!brand.website_url) {
        return NextResponse.json(
          { error: "Brand does not have a website URL" },
          { status: 400 }
        );
      }

      try {
        // Update status to pending (if status tracking exists)
        await supabaseAdmin
          .from("brands")
          .update({ brand_summary_status: "pending" })
          .eq("id", brandId);

        // Extract website text
        const websiteText = await extractWebsiteText(brand.website_url);

        // Generate summary using OpenAI
        const summary = await generateBrandSummary(websiteText, brand.website_url);

        // Save to Supabase
        const { error: updateError } = await supabaseAdmin
          .from("brands")
          .update({
            brand_summary: summary,
            brand_summary_status: "complete",
            brand_summary_updated_at: new Date().toISOString(),
          })
          .eq("id", brandId);

        if (updateError) {
          throw new Error(`Failed to save summary: ${updateError.message}`);
        }

        return NextResponse.json({
          ok: true,
          message: "Brand summary generated successfully",
          summary,
        });
      } catch (error) {
        // Update status to failed
        try {
          await supabaseAdmin
            .from("brands")
            .update({
              brand_summary_status: "failed",
              brand_summary_updated_at: new Date().toISOString(),
            })
            .eq("id", brandId);
        } catch {
          // Ignore errors when updating status
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json(
          { error: "Failed to generate brand summary", details: errorMessage },
          { status: 500 }
        );
      }
    }

    // Handle post_copy task
    if (body?.task === "post_copy") {
      // Validate payload
      const validationResult = postCopySchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid payload", details: validationResult.error.issues },
          { status: 400 }
        );
      }

      // Build PostCopyPayload from validated input
      const payload: PostCopyPayload = {
        brandId: validationResult.data.payload.brandId,
        prompt: validationResult.data.payload.prompt,
        platform: validationResult.data.payload.platform,
        draftId: validationResult.data.payload.draftId,
        variants: validationResult.data.payload.variants,
        max_tokens: validationResult.data.payload.max_tokens,
        subcategory: validationResult.data.payload.subcategory,
        schedule: validationResult.data.payload.schedule,
        scheduledFor: validationResult.data.payload.scheduledFor,
        tone_override: validationResult.data.payload.tone_override,
        length: validationResult.data.payload.length,
        emoji: validationResult.data.payload.emoji,
        hashtags: validationResult.data.payload.hashtags,
        cta: validationResult.data.payload.cta,
      };

      try {
        // Use the reusable generator
        const client = getClient();
        const variants = await generatePostCopyFromContext(supabaseAdmin, client, payload);

        // If draftId provided, save first variant
        if (payload.draftId) {
          try {
            await supabaseAdmin
              .from("drafts")
              .update({
                copy: variants[0],
                copy_status: "complete",
                copy_model: "gpt-4o-mini",
                copy_meta: {
                  platform: payload.platform || "instagram",
                  prompt: payload.prompt,
                  ...(payload.subcategory && { subcategory: payload.subcategory }),
                  ...(payload.schedule && { schedule: payload.schedule }),
                  ...(payload.tone_override && { tone_override: payload.tone_override }),
                  ...(payload.length && { length: payload.length }),
                  ...(payload.emoji && { emoji: payload.emoji }),
                  ...(payload.hashtags && { hashtags: payload.hashtags }),
                  ...(payload.cta && { cta: payload.cta }),
                },
              })
              .eq("id", payload.draftId);
          } catch {
            // Gracefully handle if copy_status/copy_model/copy_meta columns don't exist
            // Just update copy field
            await supabaseAdmin
              .from("drafts")
              .update({ copy: variants[0] })
              .eq("id", payload.draftId);
          }
        }

        return NextResponse.json({ ok: true, variants });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to generate post copy";
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 }
        );
      }
    }

  return NextResponse.json({ error: "Unknown task" }, { status: 400 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "OpenAI API error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
