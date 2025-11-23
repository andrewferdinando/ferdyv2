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
    url_page_summary?: string | null;
    category_name?: string; // e.g. "Functions"
  };
  schedule?: { 
    frequency?: string; 
    event_date?: string; 
    start_date?: string;
    end_date?: string;
    days_until_event?: number;
  };
  scheduledFor?: string; // UTC timestamp when the post is scheduled (NOT used in prompts)
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
  // Remove standalone hashtag tokens (more robust pattern)
  return text
    // Remove hashtags at start of line or after whitespace
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "$1")
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

  // 1) Determine if this is an event-based post (date/date_range = events, daily/weekly/monthly = products/services)
  const isEvent =
    payload.subcategory?.frequency_type === "date" ||
    payload.subcategory?.frequency_type === "date_range";

  // 2) Build event timing ONLY from true event fields, NOT from scheduledFor
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

  // 4) Extract tone and length with brand defaults
  const tone =
    payload.tone_override ||
    brandPostInfo?.post_tone ||
    "clear, friendly and professional";
  
  const length = payload.length || "medium"; // "short" | "medium" | "long"
  
  // 5) Build length hint based on brand's avg_word_count
  let lengthHint = "";
  if (brandPostInfo?.avg_word_count != null) {
    const w = Math.round(brandPostInfo.avg_word_count);
    const min = Math.max(5, Math.round(w * 0.8));
    const max = Math.round(w * 1.2);
    lengthHint = `${min}–${max} words (brand typical)`;
  }
  
  const lengthLabel = length; // Keep as-is (short/medium/long)

  // 6) Extract subcategory data including url_page_summary
  const subName = payload.subcategory?.name || "";
  const subDesc = payload.subcategory?.description || "";
  const subUrl = payload.subcategory?.url || "";
  const urlSummary = payload.subcategory?.url_page_summary?.trim() || "";

  // 7) Build new SYSTEM message with hard no-cross-brand rule + no scheduled date + no hashtags
  const systemMessage = `You are a professional social media copywriter.

Your #1 priority:
- NEVER reference, imply, or reuse ANY information, wording, features, facilities, examples, details, or patterns from ANY other brand, subcategory, or previous content.

You MUST:
- Base ALL factual content ONLY on the current subcategory description and (if provided) the extracted URL summary and event timing.
- Use the brand's tone of voice.
- Match roughly the brand's typical word count.
- Be specific and concrete when details exist.
- Be general when the description is general.

You MUST NOT:
- Invent facilities, capacities, products, offers, or benefits that are not mentioned.
- Use the scheduled post date in the copy under any circumstances.
- Include ANY hashtags in the output (Ferdy will add them separately).
- Apologise, ask for more info, or say you don't have enough detail.

Subcategory details are ALWAYS the highest priority source of truth.
Brand tone affects writing style, NOT factual content.`;

  // 8) Build new USER prompt with subcat + URL summary + event rules
  const userPrompt = `
### PRIMARY TOPIC (SUBCATEGORY)

Name: ${subName || "(not provided)"}
Description: ${subDesc || "(not provided)"}
URL: ${subUrl || "(not provided)"}

ONLY write about THIS subcategory.  
Do NOT reference anything from any other brand or any other subcategory.

${
  urlSummary
    ? `### EXTRA CONTEXT FROM SUBCATEGORY URL

This text was extracted from the page at the URL above. Use it as extra factual detail, but only if it clearly refers to this same subcategory:

${urlSummary}

`
    : ""
}### BRAND STYLE

Tone of voice: ${tone}
Target length: ${lengthLabel}${lengthHint ? `, ${lengthHint}` : ""}

### POST TYPE

${isEvent ? "EVENT MODE" : "PRODUCT/SERVICE MODE"}

- PRODUCT/SERVICE MODE (daily/weekly/monthly etc.):
  - Focus on explaining or promoting the programme, product, service, or offer described in the subcategory.
  - Do NOT treat the scheduled post date as important.
  - Do NOT mention any specific dates unless they explicitly appear in the subcategory description, the extracted URL text, or the POST OBJECTIVE.

- EVENT MODE (frequency_type = date/date_range):
  - Treat this as something time-specific. It might be:
    - a physical in-person event (e.g. networking night, workshop, open day),
    - an online event (e.g. webinar, live stream),
    - a time-bound promo, sale, launch, or special offer.
  - Infer which it is from the subcategory description and URL summary.
  - If it clearly describes a physical or online event, focus on the experience, who it's for, and what will happen.
  - If it clearly describes a sale/promo/offer (e.g. "sale", "discount", "% off", "special offer", "launch", "early-bird pricing"), focus on the offer and its value, not on people "attending" something.
  - Use light, natural urgency (e.g. "coming up", "happening soon", "last chance", "don't miss this offer") that fits the context.
  - You MAY reference the event date or date range exactly as provided in EVENT TIMING.
  - You MUST ignore the scheduled post date; it is NOT the event or promo date.

For multiple posts about the same event or promo:
- Each post must highlight a different angle (experience, value, what to expect, who it's for, atmosphere, benefits, why attend / why buy).
- Avoid repeating the same opening line or sentence structure.

${isEvent && eventTiming ? `### EVENT TIMING

${eventTiming}

` : ""}### POST OBJECTIVE

${payload.prompt}

### WRITING RULES

- Use ONLY details from:
  - the subcategory description, and
  - the extracted URL summary (if provided), and
  - EVENT TIMING (if provided for date/date_range).
- Never use the scheduled post date in the copy.
- Never reference another brand or subcategory.
- Do not invent extra facilities, capacities, or features.
- Avoid generic filler (e.g. "Don't miss out on this exciting event") unless clearly warranted by the context.
- Use short paragraphs separated by blank lines.
- Aim for 2–4 short paragraphs depending on post length.
- Never produce a single large block of text.
- No hashtags.
- No apologies.
- Keep the copy natural, human, and specific.

### VARIATION RULES

- Write each post with a different angle, structure, and opening sentence.
- For posts from the same subcategory, avoid repeating the same phrasing.
- You may focus each post on different aspects (e.g., benefits, what to expect, who it's for, key features, experience, value).
- Reword sentences and reorder ideas so each post feels fresh and unique.

Write the final post text only.  
Plain text, no headings, no markdown, no explanations.
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

  // Post-process: strip any hashtags that might have slipped through (final safety net)
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
