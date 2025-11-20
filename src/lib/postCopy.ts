import OpenAI from "openai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

// Type helper for Supabase client - accepts any valid Supabase client type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdminClient = SupabaseClient<any, "public", any>;

// Schema for the expected JSON response from OpenAI brand summary
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

export type PostCopyPayload = {
  brandId: string;
  draftId?: string;
  platform?: "instagram" | "facebook" | "tiktok" | "linkedin";
  prompt: string;
  subcategory?: { 
    name?: string; 
    url?: string;
    description?: string;
    frequency_type?: string;
  };
  schedule?: { frequency: string; event_date?: string; days_until_event?: number };
  scheduledFor?: string; // UTC timestamp when the post is scheduled
  tone_override?: string;
  length?: "short" | "medium" | "long";
  emoji?: "auto" | "none";
  hashtags?: { mode: "auto" | "none" | "list"; list?: string[] };
  cta?: string;
  variants?: number; // 1-3
  max_tokens?: number; // default 120
};

// Helper functions
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  tries = 3,
  delayMs = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (e: unknown) {
    const error = e as { status?: number; code?: string };
    if (tries > 1 && (error?.status === 429 || error?.code === "rate_limit_exceeded")) {
      await sleep(delayMs);
      return withRetry(fn, tries - 1, delayMs * 2);
    }
    throw e;
  }
}

export async function generatePostCopyFromContext(
  supabaseAdmin: SupabaseAdminClient,
  client: OpenAI,
  payload: PostCopyPayload
): Promise<string[]> {
  const { brandId, prompt, variants = 1, max_tokens = 120, draftId } = payload;

  // Determine if this is an event-based post (only date/date_range should be treated as events)
  const isEventBased =
    payload.subcategory?.frequency_type === "date" ||
    payload.subcategory?.frequency_type === "date_range";

  // 1) Load brand data (including new ai_summary column and brand fields)
  const { data: brand, error: brandError } = await supabaseAdmin
    .from("brands")
    .select("brand_summary, ai_summary, website_url, country_code, timezone")
    .eq("id", brandId)
    .single();

  if (brandError || !brand) {
    throw new Error(`Brand not found: ${brandError?.message || "Unknown error"}`);
  }

  // 2) Load brand post information (post tone, typical post length)
  let brandPostInfo: {
    post_tone: string | null;
    avg_char_length: number | null;
    avg_word_count: number | null;
  } | null = null;
  
  try {
    const { data: postInfo } = await supabaseAdmin
      .from("brand_post_information")
      .select("post_tone, avg_char_length, avg_word_count")
      .eq("brand_id", brandId)
      .maybeSingle();
    
    if (postInfo) {
      brandPostInfo = {
        post_tone: postInfo.post_tone,
        avg_char_length: postInfo.avg_char_length,
        avg_word_count: postInfo.avg_word_count,
      };
    }
  } catch {
    // Gracefully skip if table doesn't exist or query fails
    brandPostInfo = null;
  }

  // 3) Parse brand summary (legacy format)
  let brandSummary: z.infer<typeof brandSummarySchema> | null = null;
  if (brand.brand_summary) {
    try {
      brandSummary = brandSummarySchema.parse(brand.brand_summary);
    } catch {
      brandSummary = null;
    }
  }

  // 3) Fetch recent 3 copies for anti-repeat (brand-wide)
  let recentLines: string[] = [];
  try {
    const { data: recentDrafts } = await supabaseAdmin
      .from("drafts")
      .select("copy")
      .eq("brand_id", brandId)
      .not("copy", "is", null)
      .order("created_at", { ascending: false })
      .limit(3);

    if (recentDrafts && recentDrafts.length > 0) {
      recentLines = recentDrafts
        .map((d) => d.copy)
        .filter((c): c is string => typeof c === "string" && c.trim().length > 0);
    }
  } catch {
    // Gracefully skip anti-repeat if column doesn't exist or query fails
    recentLines = [];
  }

  const recentLinesJoined = recentLines.length > 0 ? recentLines.join("\n") : "";

  // 4) Calculate days_until_event ONLY for event-based posts
  let daysUntilEvent: string | number = "n/a";
  
  // Only calculate days until event for event-based posts (date/date_range)
  if (isEventBased) {
    // First check if days_until_event was explicitly provided
    const providedDaysUntil = payload.schedule?.days_until_event;
    if (providedDaysUntil !== undefined && typeof providedDaysUntil === "number") {
      daysUntilEvent = providedDaysUntil;
    } else if (payload.schedule?.event_date) {
      // Calculate from event_date
      try {
        const eventDate = new Date(payload.schedule.event_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);
        const diffTime = eventDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysUntilEvent = diffDays >= 0 ? diffDays : "n/a";
      } catch {
        daysUntilEvent = "n/a";
      }
    } else if (payload.scheduledFor) {
      // Calculate from scheduledFor for event-based posts only
      try {
        const scheduledDate = new Date(payload.scheduledFor);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        scheduledDate.setHours(0, 0, 0, 0);
        const diffTime = scheduledDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysUntilEvent = diffDays >= 0 ? diffDays : "n/a";
      } catch {
        daysUntilEvent = "n/a";
      }
    }
  }
  // For non-event posts (daily/weekly/monthly), daysUntilEvent stays "n/a"

  // 5) Build brand context with new fields
  const brandContextParts: string[] = [];
  
  // Brand AI Summary (new field - preferred over legacy brand_summary)
  if (brand.ai_summary && typeof brand.ai_summary === "string" && brand.ai_summary.trim()) {
    brandContextParts.push(`- Brand Summary: ${brand.ai_summary.trim()}`);
  } else if (brandSummary) {
    // Fallback to legacy brand_summary
    if (brandSummary.name) brandContextParts.push(`- Name: ${brandSummary.name}`);
    if (brandSummary.what_they_sell)
      brandContextParts.push(`- What they sell: ${brandSummary.what_they_sell}`);
    if (brandSummary.target_audience)
      brandContextParts.push(`- Target audience: ${brandSummary.target_audience}`);
  }
  
  // Post tone (from brand_post_information)
  const postTone = payload.tone_override || brandPostInfo?.post_tone || brandSummary?.tone_of_voice || null;
  if (postTone) {
    brandContextParts.push(`- Post Tone: ${postTone}`);
  }
  
  // Typical post length
  if (brandPostInfo && brandPostInfo.avg_char_length !== null && brandPostInfo.avg_word_count !== null) {
    const charRange = Math.round(brandPostInfo.avg_char_length);
    const wordRange = Math.round(brandPostInfo.avg_word_count);
    // Provide a range (±20% for character count, ±15% for word count)
    const charMin = Math.round(charRange * 0.8);
    const charMax = Math.round(charRange * 1.2);
    const wordMin = Math.round(wordRange * 0.85);
    const wordMax = Math.round(wordRange * 1.15);
    brandContextParts.push(`- Typical Post Length: ${charMin}-${charMax} characters, ${wordMin}-${wordMax} words`);
  }
  
  // Brand fields
  if (brand.website_url) {
    brandContextParts.push(`- Website: ${brand.website_url}`);
  }
  if (brand.country_code) {
    brandContextParts.push(`- Country: ${brand.country_code}`);
  }
  if (brand.timezone) {
    brandContextParts.push(`- Timezone: ${brand.timezone}`);
  }
  
  // Legacy brand summary fields (if no ai_summary)
  if (!brand.ai_summary && brandSummary) {
    if (brandSummary.brand_values && brandSummary.brand_values.length > 0) {
      brandContextParts.push(`- Brand values: ${brandSummary.brand_values.join(", ")}`);
    }
    if (brandSummary.key_offers && brandSummary.key_offers.length > 0) {
      brandContextParts.push(`- Key offers or services: ${brandSummary.key_offers.join(", ")}`);
    }
    if (brandSummary.price_positioning) {
      brandContextParts.push(`- Price positioning: ${brandSummary.price_positioning}`);
    }
  }

  // 6) Build subcategory context with description and frequency_type
  const subcategoryContextParts: string[] = [];
  if (payload.subcategory) {
    if (payload.subcategory.name) {
      subcategoryContextParts.push(`- Subcategory Name: ${payload.subcategory.name}`);
    }
    if (payload.subcategory.description) {
      subcategoryContextParts.push(`- Description: ${payload.subcategory.description}`);
    }
    if (payload.subcategory.url) {
      subcategoryContextParts.push(`- URL: ${payload.subcategory.url}`);
    }
    if (payload.subcategory.frequency_type) {
      subcategoryContextParts.push(`- Frequency Type: ${payload.subcategory.frequency_type}`);
    }
  }

  // 7) Build schedule/post timing context
  const scheduleContextParts: string[] = [];
  if (payload.schedule) {
    scheduleContextParts.push(`- Frequency: ${payload.schedule.frequency || ""}`);
    if (payload.schedule.event_date) {
      scheduleContextParts.push(`- Event Date: ${payload.schedule.event_date}`);
    }
    if (daysUntilEvent !== "n/a") {
      scheduleContextParts.push(`- Days Until Event: ${daysUntilEvent}`);
    }
  }
  if (payload.scheduledFor) {
    try {
      const scheduledDate = new Date(payload.scheduledFor);
      scheduleContextParts.push(`- Post Scheduled For: ${scheduledDate.toISOString().split('T')[0]}`);
    } catch {
      // Skip if date parsing fails
    }
  }

  // 8) Build subcategory summary line for primary emphasis
  const subcategorySummaryLine =
    payload.subcategory && (payload.subcategory.name || payload.subcategory.description)
      ? `PRIMARY TOPIC:\n- This post must be about the subcategory "${payload.subcategory.name || ""}" described as: "${payload.subcategory.description || ""}". Use this subcategory as the main focus of the post.\n\n`
      : "";

  // 9) Build the enhanced USER prompt string
  const userPrompt = `${subcategorySummaryLine}### BRAND CONTEXT
${brandContextParts.length > 0 ? brandContextParts.join("\n") : "- No brand context available"}

${subcategoryContextParts.length > 0 ? `### SUBCATEGORY CONTEXT\n${subcategoryContextParts.join("\n")}\n` : ""}${scheduleContextParts.length > 0 ? `### POST TIMING\n${scheduleContextParts.join("\n")}\n` : ""}### RECENT POSTS (DO NOT REPEAT)
${recentLinesJoined || "(none - this is the first post)"}

### POST OBJECTIVE
"${prompt}"

### WRITING RULES
1. **Style & Variation**:
   - DO NOT output formulaic copy or repeat the same template structure
   - Vary sentence structure, pacing, and opening phrases across posts
   - Use different sentence lengths and rhythm patterns
   - Avoid repeating phrases or structures from recent posts shown above
   - Stay consistent with the brand tone and personality provided above

2. **Length & Format**:
   - Target length: ${payload.length || "short"} (short ≈ 1–2 sentences, medium ≈ 3–5, long ≈ 6–8)
   ${brandPostInfo && brandPostInfo.avg_char_length !== null && brandPostInfo.avg_word_count !== null 
     ? `- Fit within typical post length for this brand (${Math.round(brandPostInfo.avg_char_length * 0.8)}-${Math.round(brandPostInfo.avg_char_length * 1.2)} characters, ${Math.round(brandPostInfo.avg_word_count * 0.85)}-${Math.round(brandPostInfo.avg_word_count * 1.15)} words)`
     : "- Match the requested length"}

3. **Context Integration**:
   - Naturally integrate brand summary information when relevant
   - The content of the post MUST align with the SUBCATEGORY CONTEXT above (name, description, and URL).
   - Make sure the topic, examples, and language clearly relate to this subcategory.
   - Do NOT ignore the subcategory details; they are more important than generic brand information.
   - ${isEventBased
     ? `This IS an event or date-based promo post. Use the event date and Days Until Event (if provided) to add natural urgency when appropriate (e.g., "3 days to go", "Final weekend", "Happening this Friday"), but vary the wording - avoid repeating the same phrases.`
     : `This is NOT an event or date-based promo post. DO NOT treat the scheduled date as a special event, and DO NOT use countdown or urgency phrases like "in 3 days", "this weekend", or "only X days to go" unless explicitly asked in the POST OBJECTIVE.`}

4. **Accuracy**:
   - DO NOT hallucinate products, prices, or promotions not provided in the context
   - Only reference information from the brand context and subcategory provided
   - Use country, timezone, and URL context if appropriate but don't force it

5. **Formatting**:
   - Emojis: ${payload.emoji || "auto"} ${payload.emoji === "none" ? "(use zero emojis)" : "(use naturally and sparingly if auto)"}
   - Hashtags:
     ${payload.hashtags?.mode === "none"
       ? `- You MUST NOT include any hashtags in the output.`
       : ""}
     ${payload.hashtags?.mode === "auto"
       ? `- You MAY add up to 3–5 relevant hashtags at the end of the post. Do not over-use them.`
       : ""}
     ${payload.hashtags?.mode === "list" && payload.hashtags?.list
       ? `- You MUST use ONLY the following hashtags, exactly as written, and you MUST NOT invent any new hashtags:\n       ${payload.hashtags.list.slice(0, 5).join(" ")}\n       - Place them together at the end of the post.`
       : ""}
   - CTA: ${payload.cta || "none"}
   - Output plain text only (no markdown, no explanations)`;

  // 10) Enhanced SYSTEM message
  const systemMessage = `You are a professional social media copywriter specializing in creating engaging, brand-specific social media content.

Always follow this priority, in order:
1) Respect hard constraints (no hashtags vs fixed list of hashtags, no emojis when requested, no markdown).
2) Align the content with the SUBCATEGORY CONTEXT and POST OBJECTIVE.
3) Stay true to the brand's tone and typical post length.
4) Vary your writing style to avoid formulaic patterns.

Your task:
- Write natural, human, engaging social media copy
- Stay true to the brand's voice and tone
- Vary your writing style to avoid formulaic patterns
- Never repeat the same sentence structure or opening phrases across posts
- Integrate context naturally without forcing information
- Be specific and concrete - avoid generic fluff

Output ONLY the final post text. No explanations, no markdown, no additional commentary.`;

  // 11) Log the prompt for debugging (temporarily - can be removed later)
  if (draftId) {
    console.log(`[postCopy] Generated prompt for draft ${draftId}:\n${userPrompt}\n`);
  }

  // 12) Call OpenAI with retry logic
  const completion = await withRetry(() =>
    client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85, // Slightly increased for more variation
      n: clamp(variants ?? 1, 1, 3),
      max_tokens: max_tokens ?? 120,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt },
      ],
    })
  );

  // 13) Extract and return variants
  const results = completion.choices
    .map((c) => c.message?.content?.trim() || "")
    .filter(Boolean);

  if (results.length === 0) {
    throw new Error("No copy variants generated");
  }

  return results;
}
