import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";

// Type helper for Supabase client - accepts any valid Supabase client type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdminClient = SupabaseClient<any, "public", any>;

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
    category_name?: string; // e.g. "Functions"
  };
  schedule?: { 
    frequency?: string; 
    event_date?: string; 
    start_date?: string;
    end_date?: string;
    days_until_event?: number;
  };
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

function stripHashtags(text: string): string {
  // Remove any words starting with # and clean up extra spaces
  return text
    .replace(/(^|\s)#([^\s#]+)/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

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

  // 1) Determine if this is an event-based post
  const isEvent =
    payload.subcategory?.frequency_type === "date" ||
    payload.subcategory?.frequency_type === "date_range";

  // 2) Build simple event timing string (optional)
  let eventTiming: string | null = null;
  if (isEvent) {
    if (payload.schedule?.start_date && payload.schedule?.end_date) {
      eventTiming = `Event Dates: ${payload.schedule.start_date} to ${payload.schedule.end_date}`;
    } else if (payload.schedule?.event_date) {
      eventTiming = `Event Date: ${payload.schedule.event_date}`;
    }
  }

  // 3) Load post_tone, avg_word_count, avg_char_length from brand_post_information
  let brandPostInfo: { 
    post_tone: string | null;
    avg_word_count: number | null;
    avg_char_length: number | null;
  } | null = null;
  
  try {
    const { data: postInfo } = await supabaseAdmin
      .from("brand_post_information")
      .select("post_tone, avg_word_count, avg_char_length")
      .eq("brand_id", brandId)
      .maybeSingle();
    
    if (postInfo) {
      brandPostInfo = {
        post_tone: postInfo.post_tone,
        avg_word_count: postInfo.avg_word_count,
        avg_char_length: postInfo.avg_char_length,
      };
    }
  } catch {
    // Gracefully skip if table doesn't exist or query fails
    brandPostInfo = null;
  }

  // 4) Extract data for prompt
  const subName = payload.subcategory?.name || "";
  const subDesc = payload.subcategory?.description || "";
  const subUrl = payload.subcategory?.url || "";
  const tone = payload.tone_override || brandPostInfo?.post_tone || "friendly, clear";
  const length = payload.length || "short";
  
  // 5) Build length hint based on brand's avg_word_count
  let lengthHint = "";
  if (brandPostInfo?.avg_word_count != null) {
    const w = Math.round(brandPostInfo.avg_word_count);
    const min = Math.max(5, Math.round(w * 0.8));
    const max = Math.round(w * 1.2);
    lengthHint = `${min}–${max} words (brand typical)`;
  }
  
  // Map length to label
  const lengthLabel = length === "short" 
    ? "short (≈ 1–2 sentences)" 
    : length === "medium" 
    ? "medium (≈ 3–5 sentences)" 
    : "long (≈ 6–8 sentences)";

  // 6) Optional: Fetch subcategory-specific recent posts (same brand + same subcategory only)
  let recentSubcategoryPosts: string[] = [];
  if (draftId) {
    try {
      // First, get the subcategory_id from the draft
      const { data: draft } = await supabaseAdmin
        .from("drafts")
        .select("subcategory_id")
        .eq("id", draftId)
        .maybeSingle();
      
      if (draft?.subcategory_id) {
        // Fetch last 3 posts for same brand AND same subcategory (excluding current draft)
        const { data: recentDrafts } = await supabaseAdmin
          .from("drafts")
          .select("copy")
          .eq("brand_id", brandId)
          .eq("subcategory_id", draft.subcategory_id)
          .neq("id", draftId) // Exclude current draft
          .not("copy", "is", null)
          .order("created_at", { ascending: false })
          .limit(3);

        if (recentDrafts && recentDrafts.length > 0) {
          recentSubcategoryPosts = recentDrafts
            .map((d) => d.copy)
            .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
            .map((c) => c.trim());
        }
      }
    } catch {
      // Gracefully skip if query fails
      recentSubcategoryPosts = [];
    }
  }

  // 7) Build new SYSTEM message with hard no-cross-brand rule
  const systemMessage = `You are a professional social media copywriter.

Your #1 priority — above everything else — is:
NEVER reference, imply, or reuse ANY information, wording, features, facilities, examples, details, or patterns from ANY other brand, subcategory, or previous content.

You MUST:
- Base ALL facts ONLY on the subcategory description provided.
- Use the brand's tone of voice.
- Match roughly the brand's typical word count.
- Be specific and concrete when details exist.
- Be general when the description is general.
- Produce natural, human, non-generic copy.

You MUST NOT:
- Invent facilities or capacities that were not provided.
- Add descriptions of venues, spaces, seating, menus, locations, or anything not explicitly in the subcategory.
- Use template phrases like "Don't miss out…" unless truly appropriate.
- Include ANY hashtags (Ferdy handles them separately).
- Apologise, ask for more info, or say details are missing.
- Copy patterns or ideas from earlier posts, earlier brands, or other subcategories.

Subcategory details are ALWAYS the highest priority source of truth.
Brand tone affects writing style, NOT content.`;

  // 8) Build new USER prompt
  const userPrompt = `
### PRIMARY TOPIC (SUBCATEGORY)

Name: ${subName || "(not provided)"}
Description: ${subDesc || "(not provided)"}
URL: ${subUrl || "(not provided)"}

ONLY write about THIS subcategory.  
Do NOT reference anything from any other brand or any other subcategory — EVER.

### BRAND STYLE

Tone of voice: ${tone}
Target length: ${lengthLabel}${lengthHint ? `, ${lengthHint}` : ""}

### POST TYPE

${isEvent ? "EVENT MODE" : "PRODUCT/SERVICE MODE"}

- EVENT MODE:
  - Treat this as a specific event, promotion, or time-based item.
  - Use light, natural urgency ("coming up", "happening soon").
  - You MAY reference the event date(s) shown below.
  - DO NOT invent countdown numbers.
  - DO NOT add event details not included in the subcategory description.

- PRODUCT/SERVICE MODE:
  - Describe ONLY the programme, product, service, or feature in the subcategory.
  - No event-style urgency unless explicitly stated in the objective.

${isEvent && eventTiming ? `### EVENT TIMING\n${eventTiming}\n` : ""}${recentSubcategoryPosts.length > 0 ? `### PREVIOUS COPY FOR THIS SUBCATEGORY (DO NOT REPEAT)

${recentSubcategoryPosts.map((line) => `- "${line}"`).join("\n")}

` : ""}### POST OBJECTIVE

${payload.prompt}

### WRITING RULES

- Use ONLY details present in the subcategory description.
- NEVER reference another brand or subcategory.
- No invented details.
- No hashtags.
- No apologies.
- No generic filler lines.
- Keep copy natural, human, and specific.
- Respect brand tone and length.

Write the final post text below.  
Plain text only. No markdown. No explanations.
`.trim();

  // 9) Log the prompt for debugging
  if (draftId) {
    console.log(`[postCopy] Generated prompt for draft ${draftId}:\n${userPrompt}\n`);
  }

  // 10) Call OpenAI with retry logic
  const completion = await withRetry(() =>
    client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.65,
      n: clamp(variants ?? 1, 1, 3),
      max_tokens: max_tokens ?? 120,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt },
      ],
    })
  );

  // 11) Extract and return variants, stripping any stray hashtags
  const rawResults = completion.choices
    .map((c) => c.message?.content?.trim() || "")
    .filter(Boolean);

  // Post-process: strip any hashtags that might have slipped through (safety measure)
  // Also normalize whitespace
  const results = rawResults
    .map((text) => {
      // Remove hashtags as a safety measure
      let cleaned = stripHashtags(text);
      // Normalize whitespace
      cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
      return cleaned;
    })
    .filter(Boolean);

  if (results.length === 0) {
    throw new Error("No copy variants generated");
  }

  return results;
}
