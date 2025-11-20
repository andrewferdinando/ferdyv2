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

  // 3) Load only post_tone from brand_post_information
  let brandPostInfo: { post_tone: string | null } | null = null;
  
  try {
    const { data: postInfo } = await supabaseAdmin
      .from("brand_post_information")
      .select("post_tone")
      .eq("brand_id", brandId)
      .maybeSingle();
    
    if (postInfo) {
      brandPostInfo = {
        post_tone: postInfo.post_tone,
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
  const hashtagsMode = payload.hashtags?.mode || "none";
  const hashtagsList = payload.hashtags?.list?.slice(0, 5) ?? [];

  // 5) Build new SYSTEM message
  const systemMessage = `You are a social media copywriter.

Your job is to write copy that is:
- accurate to the subcategory details provided,
- specific and concrete,
- aligned with the brand tone,
- clear and human,
- not generic filler.

You may NOT invent features, facilities, numbers, or benefits that were not provided.
You may NOT reuse patterns from other brands or subcategories.
You may NOT assume the brand has facilities, rooms, events, or spaces unless explicitly given.

Always treat the SUBCATEGORY section as the primary and most important information.
Brand tone is secondary and used only for voice and phrasing.`;

  // 6) Build new USER prompt
  const userPrompt = `
### PRIMARY TOPIC (SUBCATEGORY)

Name: ${subName || "(not provided)"}
Description: ${subDesc || "(not provided)"}
URL: ${subUrl || "(not provided)"}

This post must be ONLY about this specific subcategory.
Do NOT include information from any other subcategory, even if it sounds related.

### BRAND TONE

${tone}

### POST OBJECTIVE

${payload.prompt}

### POST TYPE

${isEvent ? "EVENT MODE" : "PRODUCT/SERVICE MODE"}

- EVENT MODE:
  Write with light urgency (e.g. "coming up", "happening soon", "don't miss it").
  You MAY reference the event date or date range exactly as provided, if available.
  Do NOT invent countdown numbers or extra dates.
  Use ONLY details from the subcategory description.

- PRODUCT/SERVICE MODE:
  Describe or promote the product, service, programme, feature, or offer based ONLY on the subcategory description.
  Do NOT use event-style urgency or countdown language unless explicitly asked in the post objective.

${isEvent && eventTiming ? `### EVENT TIMING

${eventTiming}

` : ""}### REQUIREMENTS

- Use ONLY details that are present in the subcategory description (and event timing, if provided).
- Do NOT invent facilities, capacities, features, or benefits that are not in the description.
- Stay aligned with the brand tone above.
- Keep the copy specific and concrete, not generic.
- Do NOT use information from other brands or subcategories.
- If the description is general, keep the copy general without adding imagined detail.
- Target length: ${length} (short ≈ 1–2 sentences, medium ≈ 3–5, long ≈ 6–8).

### HASHTAGS

Hashtags mode: ${hashtagsMode}
${hashtagsMode === "none"
  ? "- Do NOT include any hashtags in the output."
  : ""}
${hashtagsMode === "list" && hashtagsList.length
  ? `- Include ONLY these hashtags at the end of the post, and do NOT invent any new ones:\n  ${hashtagsList.join(" ")}`
  : ""}
${hashtagsMode === "auto"
  ? "- You may add 2–4 simple, relevant hashtags at the end of the post."
  : ""}

Write the final post copy below. Output plain text only, no markdown, no explanations.
`.trim();

  // 7) Log the prompt for debugging
  if (draftId) {
    console.log(`[postCopy] Generated prompt for draft ${draftId}:\n${userPrompt}\n`);
  }

  // 8) Call OpenAI with retry logic
  const completion = await withRetry(() =>
    client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      n: clamp(variants ?? 1, 1, 3),
      max_tokens: max_tokens ?? 120,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt },
      ],
    })
  );

  // 9) Extract and return variants, stripping any stray hashtags
  const rawResults = completion.choices
    .map((c) => c.message?.content?.trim() || "")
    .filter(Boolean);

  // Post-process to strip any hashtags if mode is "none"
  const results = hashtagsMode === "none"
    ? rawResults.map(stripHashtags).filter(Boolean)
    : rawResults;

  if (results.length === 0) {
    throw new Error("No copy variants generated");
  }

  return results;
}
