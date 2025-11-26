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
    default_copy_length?: "short" | "medium" | "long";
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
const buildTypeSpecificGuidance = (
  type: SubcategoryType | null | undefined,
  settings: Record<string, any> | null | undefined
): string | null => {
  if (!type || type === "other" || type === "unspecified") {
    return "Use general best judgement based on the description and URL summary.";
  }

  const guidance: string[] = [];
  const s = settings || {};
  const daysUntil = typeof s._days_until_event === "number" ? s._days_until_event : null;
  const frequency = s._frequency ?? null;

  switch (type) {
    case "event_series": {
      guidance.push(
        "This subcategory is typically used for events or one-off dates. Focus on what the occasion is, who it suits, when and where it happens, and what the experience will feel like."
      );

      if (daysUntil != null) {
        if (daysUntil >= 14) {
          guidance.push(
            `Days until this event: ${daysUntil}. Treat this as an awareness/intro post and explain what the event is and why it's worth adding to the calendar.`
          );
        } else if (daysUntil >= 7) {
          guidance.push(
            `Days until this event: ${daysUntil}. People may be planning. Give clear practical details (date, time, venue) plus one or two strong reasons to attend.`
          );
        } else if (daysUntil >= 1) {
          guidance.push(
            `Days until this event: ${daysUntil}. The event is close. Make this feel like a clear reminder with natural urgency (e.g. "coming up soon", "last chance to grab tickets").`
          );
        } else if (daysUntil === 0) {
          guidance.push(
            "The event is happening today. Use \"happening today\" style language and focus on last-minute motivation and how to join."
          );
        }
      }

      if (Array.isArray(s.default_lead_times) && s.default_lead_times.length > 0) {
        const times = s.default_lead_times.join(", ");
        guidance.push(
          `Default lead times for this event are ${times} days before each date. Make sure the tone fits how close this post is to the event.`
        );
      }

      guidance.push(
        "Across posts for this subcategory, rotate angles such as: the overall experience, one specific feature or session, who it's perfect for, and reasons to book now."
      );
      break;
    }

    case "service_or_programme": {
      guidance.push(
        "This subcategory is typically used for a product, service, class or programme. Focus on outcomes and benefits, not just features."
      );
      guidance.push(
        "Make it clear who this is for, what problem it helps with, and what changes once someone signs up or buys."
      );

      if (Array.isArray(s.highlight_points) && s.highlight_points.length > 0) {
        const pointsList = s.highlight_points.join(", ");
        guidance.push(
          `For each post, pick ONE of these highlight points to focus on: ${pointsList}.`
        );
      }

      if (frequency === "weekly") {
        guidance.push(
          "If this runs weekly, you can reference the ongoing rhythm (e.g. \"every week\", \"your regular session\")."
        );
      } else if (frequency === "monthly") {
        guidance.push(
          "If this runs monthly, you can reference it as a regular monthly check-in or touchpoint."
        );
      }

      guidance.push(
        "Across posts, rotate angles such as: a single key benefit, a common objection and how this offering solves it, or a typical customer scenario."
      );
      break;
    }

    case "promo_or_offer": {
      guidance.push(
        "This subcategory is typically used for short-term promos or offers. Be very clear about what the offer is, who it's for, and how it works."
      );

      if (s.promo_length_days != null) {
        guidance.push(
          `This promo usually runs for around ${s.promo_length_days} days. Use natural urgency that fits that length (not over the top).`
        );
      }
      if (s.auto_expire) {
        guidance.push(
          "Assume the offer ends automatically at the end of the promo period. As it gets close to the end, it's fine to mention that it's \"ending soon\"."
        );
      }

      guidance.push(
        "Make the value obvious (e.g. price saving, bonus, convenience) and avoid vague hype. Across posts, rotate angles like: the core saving, who gets the most value, and a simple last-chance reminder near the end."
      );
      break;
    }

    case "dynamic_schedule": {
      guidance.push(
        "This subcategory is typically used for a rotating schedule or timetable. Keep the copy clear, factual and easy to scan."
      );
      if (s.url_refresh_frequency === "weekly") {
        guidance.push(
          "Treat each post as a weekly update. Mention what's happening this week and how people can take part or check the schedule."
        );
      } else if (s.url_refresh_frequency === "daily") {
        guidance.push(
          "Treat each post as a daily update. Highlight what's happening today instead of listing everything."
        );
      }
      guidance.push(
        "Across posts, rotate between highlighting specific days, special items on the schedule, and simple reminders that the schedule changes regularly."
      );
      break;
    }

    case "content_series": {
      guidance.push(
        "This subcategory is typically used for a recurring content series. Each post should feel like one instalment in that series, not a standalone promo."
      );

      if (s.number_of_items != null) {
        guidance.push(
          `There are about ${s.number_of_items} items in this series. Imagine rotating through them over time so each one is featured regularly.`
        );
      }
      guidance.push(
        "Focus each post on one idea or item and make it clear why it's useful or interesting for the audience."
      );
      break;
    }

    default: {
      guidance.push(
        "Use general best judgement based on the description and URL summary."
      );
      break;
    }
  }

  return guidance.length > 0 ? guidance.join("\n\n") : null;
};

function stripHashtags(text: string): string {
  // Remove standalone hashtag tokens (more robust pattern)
  return text
    // Remove hashtags at start of line or after whitespace
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "$1")
    // Collapse multiple spaces/tabs, but DO NOT touch newlines
    .replace(/[ \t]{2,}/g, " ")
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

  // 3) Load post_tone from brand_post_information
  let brandPostInfo: { 
    post_tone: string | null;
  } | null = null;
  
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

  // 4) Extract tone and compute effective length from override + category default
  const tone =
    payload.tone_override ||
    brandPostInfo?.post_tone ||
    "clear, friendly and professional";
  
  // Normalize copy length to lowercase to handle any case variations from DB
  const normalizeCopyLength = (value: string | undefined | null): "short" | "medium" | "long" | null => {
    if (!value) return null;
    const normalized = value.toLowerCase().trim();
    if (normalized === "short" || normalized === "medium" || normalized === "long") {
      return normalized as "short" | "medium" | "long";
    }
    return null;
  };

  const effectiveLength: "short" | "medium" | "long" =
    normalizeCopyLength(payload.length) ||
    normalizeCopyLength(payload.subcategory?.default_copy_length) ||
    "medium";
  
  const lengthLabel = effectiveLength;

  // Debug log for copy length resolution
  if (draftId) {
    console.log(`[postCopy] Copy length resolution for draft ${draftId}:`, {
      explicitLength: payload.length,
      subcategoryDefaultCopyLength: payload.subcategory?.default_copy_length,
      effectiveLength,
      subcategoryName: payload.subcategory?.name,
      rawPayloadSubcategory: JSON.stringify(payload.subcategory),
    });
    
    if (effectiveLength === "short") {
      console.log(`[postCopy] ⚠️ SHORT COPY MODE - Model should produce exactly ONE sentence`);
    }
  }

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
- Follow the specified length guidelines (short/medium/long) exactly.
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
${effectiveLength === "short" ? `⚠️⚠️⚠️ CRITICAL INSTRUCTION - READ FIRST ⚠️⚠️⚠️

YOU ARE WRITING SHORT COPY. This means you MUST write EXACTLY ONE SENTENCE ONLY.

- ONE sentence total
- On a single line (no line breaks)
- No paragraphs
- No multiple sentences
- Just one complete sentence, period.

DO NOT write 2 sentences.
DO NOT write 3 sentences.
DO NOT create paragraphs.
DO NOT add line breaks.

ONE SENTENCE ONLY. That is the ONLY requirement for SHORT copy.

---
` : ""}### PRIMARY TOPIC (SUBCATEGORY)

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
Target length: ${lengthLabel.toUpperCase()}

${effectiveLength === "short" 
  ? `⚠️ CRITICAL REQUIREMENT: Write EXACTLY ONE SENTENCE ONLY. No line breaks. No paragraphs. Just one sentence.`
  : effectiveLength === "medium" 
  ? `Target: around 3–5 sentences split into 2–3 short paragraphs.`
  : `Target: around 6–8 sentences split into 2–4 short paragraphs.`}

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

LENGTH & STRUCTURE

${effectiveLength === "short" 
  ? `YOU ARE WRITING SHORT COPY. This means:
- You MUST write exactly ONE sentence only.
- The sentence must be on a single line (no line breaks).
- Do NOT write multiple sentences.
- Do NOT create paragraphs.
- One sentence, period. That's it.`
  : effectiveLength === "medium"
  ? `You are writing MEDIUM length copy:
- Write around 3–5 sentences total.
- Split into 2–3 short paragraphs.
- Paragraphs MUST be separated by a blank line.
- Never produce one giant block of text.`
  : `You are writing LONG length copy:
- Write around 6–8 sentences total.
- Split into 2–4 short paragraphs.
- Paragraphs MUST be separated by a blank line.
- Never produce one giant block of text.`}

OTHER RULES

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
  const typeGuidance = buildTypeSpecificGuidance(
    payload.subcategory_type ?? null,
    {
      ...(payload.subcategory_settings ?? {}),
      _days_until_event: payload.schedule?.days_until_event ?? null,
      _frequency: payload.schedule?.frequency ?? null,
    }
  );
  return typeGuidance ? `### TYPE-SPECIFIC GUIDANCE

${typeGuidance}

` : '';
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
  // Preserve newlines/paragraphs while normalizing whitespace
  const results = rawResults
    .map((text) => {
      let cleaned = stripHashtags(text);

      cleaned = cleaned
        // collapse multiple spaces/tabs, but DO NOT touch newlines
        .replace(/[ \t]{2,}/g, " ")
        // normalise excessive blank lines (3+ becomes 2)
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      return cleaned;
    })
    .filter(Boolean);

  if (results.length === 0) {
    throw new Error("No copy variants generated");
  }

  return results;
}
