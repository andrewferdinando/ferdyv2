import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SubcategoryType } from "@/types/subcategories";

// Types for structured URL summary (matches refreshUrlSummary.ts)
interface EventDetails {
  venue: string | null;
  date: string | null;
  time: string | null;
  price: string | null;
  format: "physical" | "online" | "promo" | null;
  hosts: string[] | null;
  key_points: string[] | null;
}

interface StructuredUrlSummary {
  summary: string;
  details: EventDetails;
}

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
    url_page_summary?: string | null; // Can be structured JSON or plain text (backward compatible)
    category_name?: string; // e.g. "Functions"
  };
  subcategory_type?: SubcategoryType | null; // Type of subcategory (Events, Products / Services, Promos, etc.)
  subcategory_settings?: Record<string, any> | null; // Type-specific settings
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
  variation_hint?: string | null; // Optional hint to guide AI toward a specific angle for this post
};

// Helper functions
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Helper to map SubcategoryType to human-readable label
const getHumanReadableSubcategoryType = (type: SubcategoryType | null | undefined): string => {
  if (!type) return 'Other'
  switch (type) {
    case 'event_series':
      return 'Events'
    case 'service_or_programme':
      return 'Products / Services'
    case 'promo_or_offer':
      return 'Promos'
    case 'dynamic_schedule':
      return 'Schedules'
    case 'content_series':
      return 'Content Pillar (legacy)'
    case 'other':
    case 'unspecified':
    default:
      return 'Other'
  }
}

// Helper to format settings hints for the prompt
const formatSettingsHints = (type: SubcategoryType | null | undefined, settings: Record<string, any> | null | undefined): string | null => {
  if (!type || !settings || Object.keys(settings).length === 0) return null
  
  const hints: string[] = []
  
  switch (type) {
    case 'event_series':
      if (settings.default_lead_times && Array.isArray(settings.default_lead_times) && settings.default_lead_times.length > 0) {
        const times = settings.default_lead_times.join(', ')
        hints.push(`Default lead times: ${times} days before each date.`)
      }
      break
      
    case 'content_series':
      if (settings.number_of_items != null) {
        hints.push(`Number of items in this series: ${settings.number_of_items}.`)
      }
      break
      
    case 'dynamic_schedule':
      if (settings.url_refresh_frequency) {
        hints.push(`Ferdy should refresh this schedule: ${settings.url_refresh_frequency}.`)
      }
      break
      
    case 'service_or_programme':
      if (settings.highlight_points && Array.isArray(settings.highlight_points) && settings.highlight_points.length > 0) {
        const points = settings.highlight_points.join(', ')
        hints.push(`Highlight points: ${points}.`)
      }
      break
      
    case 'promo_or_offer':
      if (settings.promo_length_days != null) {
        hints.push(`Promo length: ${settings.promo_length_days} days.`)
      }
      if (settings.auto_expire) {
        hints.push(`Auto-expires after promo length.`)
      }
      break
  }
  
  return hints.length > 0 ? hints.join(' ') : null
}

// Helper to build type-specific guidance section for the prompt
const buildTypeSpecificGuidance = (type: SubcategoryType | null | undefined, settings: Record<string, any> | null | undefined): string | null => {
  if (!type || (type === 'other' || type === 'unspecified')) {
    return 'Use general best judgement based on description and URL summary.'
  }

  const guidance: string[] = []

  switch (type) {
    case 'event_series':
      guidance.push('Focus on time-specific value, what the attendee can expect, and who this event suits.')
      if (settings?.default_lead_times && Array.isArray(settings.default_lead_times) && settings.default_lead_times.length > 0) {
        guidance.push('Adjust tone based on how close the post is to the event:\n- Far from event → informative\n- Mid-range → helpful context\n- Close to event → light urgency')
      }
      break

    case 'service_or_programme':
      guidance.push('Focus on benefits, outcomes, who this is for, and real value.')
      if (settings?.highlight_points && Array.isArray(settings.highlight_points) && settings.highlight_points.length > 0) {
        const pointsList = settings.highlight_points.join(', ')
        guidance.push(`Choose ONE of these points to highlight in this post: ${pointsList}`)
      }
      break

    case 'promo_or_offer':
      guidance.push('Treat this as a time-bound promo. Prioritise clarity, value, and urgency.')
      if (settings?.promo_length_days != null) {
        guidance.push(`This promo typically lasts ${settings.promo_length_days} days.`)
      }
      if (settings?.auto_expire) {
        guidance.push('If the promo is close to ending, natural urgency is appropriate.')
      }
      break

    case 'dynamic_schedule':
      guidance.push('This subcategory uses a rotating schedule. Keep copy clear and factual.')
      if (settings?.url_refresh_frequency === 'weekly') {
        guidance.push('Treat this as a weekly update.')
      } else if (settings?.url_refresh_frequency === 'daily') {
        guidance.push('Treat this as a daily refresh.')
      }
      break

    case 'content_series':
      guidance.push('This is a recurring content series (legacy). Each post should highlight ONE angle or item.')
      if (settings?.number_of_items != null) {
        guidance.push(`Rotate through the ${settings.number_of_items} items over time.`)
      }
      break
  }

  return guidance.length > 0 ? guidance.join('\n\n') : null
}

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
  
  // Parse url_page_summary - handle both structured JSON and plain text (backward compatible)
  let structuredSummary: StructuredUrlSummary | null = null;
  let urlSummaryText = "";
  let eventDetails: EventDetails | null = null;
  
  const urlSummaryRaw = payload.subcategory?.url_page_summary?.trim() || "";
  if (urlSummaryRaw) {
    try {
      // Try to parse as JSON (new structured format)
      const parsed = JSON.parse(urlSummaryRaw);
      if (parsed && typeof parsed === 'object' && 'summary' in parsed && 'details' in parsed) {
        structuredSummary = parsed as StructuredUrlSummary;
        urlSummaryText = structuredSummary.summary || "";
        eventDetails = structuredSummary.details || null;
      } else {
        // Not valid structured format, treat as plain text
        urlSummaryText = urlSummaryRaw;
      }
    } catch {
      // Not JSON, treat as plain text (backward compatibility)
      urlSummaryText = urlSummaryRaw;
    }
  }

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

${payload.subcategory_type || payload.subcategory_settings
    ? `### SERIES TYPE

${payload.subcategory_type ? `This subcategory is set up as: ${getHumanReadableSubcategoryType(payload.subcategory_type)}.\n` : ""}${(() => {
        const settingsHint = formatSettingsHints(payload.subcategory_type ?? null, payload.subcategory_settings ?? null)
        return settingsHint ? `${settingsHint}\n` : ""
      })()}`
    : ""
}

${
  urlSummaryText || eventDetails
    ? `### EXTRA CONTEXT FROM SUBCATEGORY URL

This text was extracted from the page at the URL above. Use it as extra factual detail, but only if it clearly refers to this same subcategory:

${urlSummaryText ? `${urlSummaryText}\n\n` : ""}${eventDetails && (
      eventDetails.venue ||
      eventDetails.date ||
      eventDetails.time ||
      eventDetails.price ||
      eventDetails.format ||
      (eventDetails.hosts && eventDetails.hosts.length > 0) ||
      (eventDetails.key_points && eventDetails.key_points.length > 0)
    )
      ? `### URL DETAILS (if available)
${eventDetails.venue ? `Venue: ${eventDetails.venue}\n` : ""}${eventDetails.date ? `Date: ${eventDetails.date}\n` : ""}${eventDetails.time ? `Time: ${eventDetails.time}\n` : ""}${eventDetails.price ? `Price/Tickets: ${eventDetails.price}\n` : ""}${eventDetails.format ? `Event Format: ${eventDetails.format}\n` : ""}${eventDetails.hosts && eventDetails.hosts.length > 0
          ? `Hosts/Speakers: ${eventDetails.hosts.join(", ")}\n`
          : ""}${eventDetails.key_points && eventDetails.key_points.length > 0
          ? `Key Points:\n${eventDetails.key_points.map((p: string) => `- ${p}`).join("\n")}\n`
          : ""}
`
      : ""
    }`
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
  - Infer which it is from the subcategory description, URL summary, and URL details (format, venue, etc).
  - If venue exists or format is "physical" → mention it naturally and focus on the experience, who it's for, and what will happen.
  - If format is "online" → use accessibility/virtual angle and mention online/virtual format naturally.
  - If format is "promo" or price/tickets exist → shift to offer-focused language and mention pricing naturally.
  - If time/date exists in URL details → reference it naturally in context.
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

${payload.variation_hint ? `### VARIATION FOCUS FOR THIS POST

For this specific post, prioritise this angle:

${payload.variation_hint}

` : ''}${(() => {
  const typeGuidance = buildTypeSpecificGuidance(payload.subcategory_type ?? null, payload.subcategory_settings ?? null)
  return typeGuidance ? `### TYPE-SPECIFIC GUIDANCE

${typeGuidance}

` : ''
})()}Write the final post text only.  
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
