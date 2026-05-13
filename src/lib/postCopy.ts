import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
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
  subcategory_type?: SubcategoryType | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subcategory_settings?: Record<string, any> | null;
  schedule?: {
    frequency?: string;
    event_date?: string;
    start_date?: string;
    end_date?: string;
    days_until_event?: number;
  };
  scheduledFor?: string;
  tone_override?: string;
  length?: "short" | "medium" | "long";
  emoji?: "auto" | "none";
  hashtags?: { mode: "auto" | "none" | "list"; list?: string[] };
  cta?: string;
  variants?: number;
  max_tokens?: number;
  variation_hint?: string | null;
  variation_index?: number;
  variation_total?: number;
  previous_copies?: string[];
  occurrenceNotes?: string;
};

// ---------------------------------------------------------------------------
// Anthropic client
// ---------------------------------------------------------------------------

const COPY_MODEL = "claude-sonnet-4-6";

let anthropicSingleton: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (anthropicSingleton) return anthropicSingleton;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  anthropicSingleton = new Anthropic({ apiKey });
  return anthropicSingleton;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const getHumanReadableSubcategoryType = (
  type: SubcategoryType | null | undefined
): string => {
  if (!type) return "Other";
  switch (type) {
    case "event_series":
      return "Events";
    case "service_or_programme":
      return "Products / Services";
    case "promo_or_offer":
      return "Promos";
    case "dynamic_schedule":
      return "Schedules";
    case "content_series":
      return "Content Pillar (legacy)";
    case "other":
    case "unspecified":
    default:
      return "Other";
  }
};

const formatSettingsHints = (
  type: SubcategoryType | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any> | null | undefined
): string | null => {
  if (!type || !settings || Object.keys(settings).length === 0) return null;

  const hints: string[] = [];

  switch (type) {
    case "event_series":
      if (
        settings.default_lead_times &&
        Array.isArray(settings.default_lead_times) &&
        settings.default_lead_times.length > 0
      ) {
        const times = settings.default_lead_times.join(", ");
        hints.push(`Default lead times: ${times} days before each date.`);
      }
      break;

    case "content_series":
      if (settings.number_of_items != null) {
        hints.push(`Number of items in this series: ${settings.number_of_items}.`);
      }
      break;

    case "dynamic_schedule":
      if (settings.url_refresh_frequency) {
        hints.push(`Ferdy should refresh this schedule: ${settings.url_refresh_frequency}.`);
      }
      break;

    case "service_or_programme":
      if (
        settings.highlight_points &&
        Array.isArray(settings.highlight_points) &&
        settings.highlight_points.length > 0
      ) {
        const points = settings.highlight_points.join(", ");
        hints.push(`Highlight points: ${points}.`);
      }
      break;

    case "promo_or_offer":
      if (settings.promo_length_days != null) {
        hints.push(`Promo length: ${settings.promo_length_days} days.`);
      }
      if (settings.auto_expire) {
        hints.push(`Auto-expires after promo length.`);
      }
      break;
  }

  return hints.length > 0 ? hints.join(" ") : null;
};

const buildTypeSpecificGuidance = (
  type: SubcategoryType | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any> | null | undefined
): string | null => {
  if (!type || type === "other" || type === "unspecified") return null;

  const guidance: string[] = [];
  const s = settings || {};
  const daysUntil = typeof s._days_until_event === "number" ? s._days_until_event : null;
  const frequency = s._frequency ?? null;

  switch (type) {
    case "event_series": {
      guidance.push(
        "This is an event or date-anchored category. Focus on what the occasion is, who it suits, when and where it happens, and what the experience will feel like."
      );

      if (daysUntil != null) {
        if (daysUntil >= 14) {
          guidance.push(
            `Days until this event: ${daysUntil}. This is an awareness post — explain what the event is and why it's worth adding to the calendar.`
          );
        } else if (daysUntil >= 7) {
          guidance.push(
            `Days until this event: ${daysUntil}. People are planning. Give clear practical details (date, time, venue) plus one or two strong reasons to come.`
          );
        } else if (daysUntil >= 1) {
          guidance.push(
            `Days until this event: ${daysUntil}. The event is close. Frame this as a clear reminder with natural urgency.`
          );
        } else if (daysUntil === 0) {
          guidance.push(
            'The event is today. Use "happening today" language and focus on last-minute motivation and how to join.'
          );
        }
      }

      if (Array.isArray(s.default_lead_times) && s.default_lead_times.length > 0) {
        guidance.push(
          `Lead-time pattern: ${s.default_lead_times.join(", ")} days before each date. Match the tone to how close this post is.`
        );
      }
      break;
    }

    case "service_or_programme": {
      guidance.push(
        "This is a product, service, class, or programme. Focus on outcomes and what changes once someone signs up — not just features."
      );

      if (Array.isArray(s.highlight_points) && s.highlight_points.length > 0) {
        guidance.push(
          `Pick ONE of these highlight points to focus on for this post: ${s.highlight_points.join(", ")}.`
        );
      }

      if (frequency === "weekly") {
        guidance.push('If it runs weekly, you can reference the ongoing rhythm ("every week", "your regular session").');
      } else if (frequency === "monthly") {
        guidance.push("If it runs monthly, you can frame it as a regular monthly touchpoint.");
      }
      break;
    }

    case "promo_or_offer": {
      guidance.push(
        "This is a short-term promo or offer. Be clear about what the offer is, who it's for, and how it works."
      );

      if (s.promo_length_days != null) {
        guidance.push(`The promo runs ~${s.promo_length_days} days. Use urgency that fits that length — not over the top.`);
      }
      if (s.auto_expire) {
        guidance.push('The offer ends automatically. Near the end, it\'s fine to mention "ending soon".');
      }
      break;
    }

    case "dynamic_schedule": {
      guidance.push("This is a rotating schedule or timetable. Keep the copy clear, factual, and easy to scan.");
      if (s.url_refresh_frequency === "weekly") {
        guidance.push('Treat each post as a weekly update — what\'s happening this week and how to take part.');
      } else if (s.url_refresh_frequency === "daily") {
        guidance.push("Treat each post as a daily update — highlight what's happening today.");
      }
      break;
    }

    case "content_series": {
      guidance.push("This is a recurring content series. Each post should feel like one instalment in the series, not a standalone promo.");
      if (s.number_of_items != null) {
        guidance.push(`There are about ${s.number_of_items} items in this series. Focus each post on one item.`);
      }
      break;
    }
  }

  return guidance.length > 0 ? guidance.join("\n\n") : null;
};

function detectEmojiUsageLevel(
  examples: string[]
): "none" | "low" | "medium" | "high" {
  if (!examples || examples.length === 0) return "none";
  const emojiRegex = /\p{Extended_Pictographic}/u;
  let count = 0;
  for (const ex of examples) {
    if (emojiRegex.test(ex)) count++;
  }
  const ratio = count / examples.length;
  if (ratio === 0) return "none";
  if (ratio < 0.2) return "low";
  if (ratio < 0.5) return "medium";
  return "high";
}

function stripHashtags(text: string): string {
  return text
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "$1")
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
    // Anthropic and OpenAI both surface .status === 429 on rate-limit errors.
    if (tries > 1 && (error?.status === 429 || error?.code === "rate_limit_exceeded")) {
      await sleep(delayMs);
      return withRetry(fn, tries - 1, delayMs * 2);
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate post copy from the structured payload.
 *
 * Strategy is simple by design:
 *
 *   1. ACCURACY — every fact comes from the subcategory description, the
 *      extracted URL summary, or the event timing. The system prompt makes
 *      that the model's #1 priority via positive framing.
 *
 *   2. BRAND VOICE — when example posts exist on brand_post_information,
 *      we pass the most recent 3 directly to Claude with "match this voice".
 *      No intermediate tone-profile summarisation — Claude is good at
 *      picking up rhythm and personality from raw samples.
 *
 * Architectural rules preserved:
 *   - Hashtags are added downstream, never inline.
 *   - The scheduled UTC date never appears in the copy.
 *   - No cross-brand contamination.
 *   - Length targets (short / medium / long) and variant counts respected.
 *
 * The `openaiClient` parameter is kept in the signature for backward
 * compatibility with callers (generateCopyBatch.ts). It's currently unused —
 * the model call goes through the Anthropic SDK.
 */
export async function generatePostCopyFromContext(
  supabaseAdmin: SupabaseAdminClient,
  openaiClient: OpenAI,
  payload: PostCopyPayload
): Promise<string[]> {
  const {
    brandId,
    prompt,
    variants = 1,
    max_tokens,
    draftId,
    variation_index,
    variation_total,
  } = payload;

  // 1) Emoji mode
  const emojiMode = payload.emoji ?? "auto";
  const allowEmojis = emojiMode === "auto";

  // 2) Event vs product/service determination
  const isEvent =
    payload.subcategory?.frequency_type === "date" ||
    payload.subcategory?.frequency_type === "date_range";

  let eventTiming: string | null = null;
  if (isEvent) {
    if (payload.schedule?.start_date && payload.schedule?.end_date) {
      eventTiming = `Event Dates: ${payload.schedule.start_date} to ${payload.schedule.end_date}`;
    } else if (payload.schedule?.event_date) {
      eventTiming = `Event Date: ${payload.schedule.event_date}`;
    }
  }

  // 3) Load brand voice examples
  let brandPostInfo: {
    post_tone: string | null;
    fb_post_examples: string[] | null;
    ig_post_examples: string[] | null;
  } | null = null;

  try {
    const { data: postInfo } = await supabaseAdmin
      .from("brand_post_information")
      .select("post_tone, fb_post_examples, ig_post_examples")
      .eq("brand_id", brandId)
      .maybeSingle();

    if (postInfo) {
      brandPostInfo = {
        post_tone: postInfo.post_tone,
        fb_post_examples: postInfo.fb_post_examples ?? [],
        ig_post_examples: postInfo.ig_post_examples ?? [],
      };
    }
  } catch {
    brandPostInfo = null;
  }

  const fbExamples = brandPostInfo?.fb_post_examples ?? [];
  const igExamples = brandPostInfo?.ig_post_examples ?? [];
  const allExamples = [...fbExamples, ...igExamples].filter(
    (e) => typeof e === "string" && e.trim().length > 0
  );

  // Take the 3 most recent examples to pass directly to Claude.
  // Order in the DB array is treated as recency.
  const recentExamples = allExamples.slice(0, 3);

  const emojiUsageLevel = detectEmojiUsageLevel(allExamples);
  type EmojiRequirement = "none" | "optional_one" | "required_one_at_end";
  let emojiRequirement: EmojiRequirement = "none";
  if (allowEmojis) {
    if (emojiUsageLevel === "high") emojiRequirement = "required_one_at_end";
    else if (emojiUsageLevel === "medium") emojiRequirement = "optional_one";
    else emojiRequirement = "none";
  }

  // 4) Length normalisation
  const normalizeCopyLength = (
    value: string | undefined | null
  ): "short" | "medium" | "long" | null => {
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

  // 5) Subcategory data
  const subName = payload.subcategory?.name || "";
  const subDesc = payload.subcategory?.description || "";
  const subUrl = payload.subcategory?.url || "";

  // Parse url_page_summary (structured JSON or plain text)
  let urlSummaryText = "";
  let eventDetails: EventDetails | null = null;

  const urlSummaryRaw = payload.subcategory?.url_page_summary?.trim() || "";
  if (urlSummaryRaw) {
    try {
      const parsed = JSON.parse(urlSummaryRaw);
      if (parsed && typeof parsed === "object" && "summary" in parsed && "details" in parsed) {
        const structured = parsed as StructuredUrlSummary;
        urlSummaryText = structured.summary || "";
        eventDetails = structured.details || null;
      } else {
        urlSummaryText = urlSummaryRaw;
      }
    } catch {
      urlSummaryText = urlSummaryRaw;
    }
  }

  // 6) Build system + user prompts
  const variationIndex = variation_index ?? 0;
  const variationTotal = variation_total ?? 1;
  const toneOverride = payload.tone_override?.trim() || null;

  const systemMessage = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    subName,
    subDesc,
    subUrl,
    urlSummaryText,
    eventDetails,
    recentExamples,
    toneOverride,
    isEvent,
    eventTiming,
    occurrenceNotes: payload.occurrenceNotes,
    prompt,
    effectiveLength,
    emojiRequirement,
    allowEmojis,
    subcategoryType: payload.subcategory_type ?? null,
    subcategorySettings: payload.subcategory_settings ?? null,
    daysUntilEvent: payload.schedule?.days_until_event ?? null,
    frequency: payload.schedule?.frequency ?? null,
    variationIndex,
    variationTotal,
    variationHint: payload.variation_hint ?? null,
    previousCopies: payload.previous_copies ?? [],
  });

  if (draftId) {
    console.log(
      `[postCopy] Generating draft ${draftId} via ${COPY_MODEL} (length=${effectiveLength}, emoji=${emojiRequirement}, variants=${variants}, examples=${recentExamples.length})`
    );
  }

  // 7) Scale max_tokens by length
  const effectiveMaxTokens =
    max_tokens ?? (effectiveLength === "short" ? 200 : effectiveLength === "medium" ? 500 : 800);

  // 8) Call Anthropic. For multi-variant requests, run parallel calls so each
  //    response can independently vary — matches OpenAI's n parameter behaviour.
  const variantCount = clamp(variants ?? 1, 1, 3);
  const anthropic = getAnthropic();

  const runOne = () =>
    withRetry(() =>
      anthropic.messages.create({
        model: COPY_MODEL,
        max_tokens: effectiveMaxTokens,
        temperature: 0.7,
        system: systemMessage,
        messages: [{ role: "user", content: userPrompt }],
      })
    );

  const responses = await Promise.all(
    Array.from({ length: variantCount }, () => runOne())
  );

  // 9) Extract and post-process
  const rawResults = responses
    .map((r) => {
      const block = r.content.find((b) => b.type === "text");
      return block && "text" in block ? block.text.trim() : "";
    })
    .filter(Boolean);

  const results = rawResults
    .map((text) => {
      let cleaned = stripHashtags(text);
      cleaned = cleaned
        .replace(/[ \t]{2,}/g, " ")
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

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  return `You write social media post copy for a specific small business.

Two things matter most:

1. ACCURACY. Every fact in the post must come from the category description, the URL summary, or the event timing provided in the prompt. If a detail isn't in the source material, leave it out — don't fill gaps with assumptions, invented features, or generic claims.

2. VOICE. When example posts from the brand are provided, match their tone, rhythm, and personality. Write like you're the next post in their feed. Don't copy their exact phrases — write fresh content with the same voice.

Style notes:
- Conversational, warm, never over-polished
- Sentence length should vary
- Avoid corporate filler ("synergy", "leverage", "elevate", "curated experience", "delve", "indeed", "moreover")
- Avoid clichés ("we're so excited to share", "look no further", "your one-stop shop", "join us as we", "in today's fast-paced world")
- Don't repeat the brand name in every sentence
- NZ/AU spelling (favourite, organised, colour) unless the brand examples use US spelling

Output the post copy only — no preamble, no headings, no markdown, no hashtags (those are added separately by Ferdy). Plain text, ready to publish.`;
}

type UserPromptArgs = {
  subName: string;
  subDesc: string;
  subUrl: string;
  urlSummaryText: string;
  eventDetails: EventDetails | null;
  recentExamples: string[];
  toneOverride: string | null;
  isEvent: boolean;
  eventTiming: string | null;
  occurrenceNotes?: string;
  prompt: string;
  effectiveLength: "short" | "medium" | "long";
  emojiRequirement: "none" | "optional_one" | "required_one_at_end";
  allowEmojis: boolean;
  subcategoryType: SubcategoryType | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subcategorySettings: Record<string, any> | null;
  daysUntilEvent: number | null;
  frequency: string | null;
  variationIndex: number;
  variationTotal: number;
  variationHint: string | null;
  previousCopies: string[];
};

function buildUserPrompt(a: UserPromptArgs): string {
  const sections: string[] = [];

  // ----- CATEGORY -----
  sections.push(
    `### CATEGORY

Name: ${a.subName || "(not provided)"}
Description: ${a.subDesc || "(not provided)"}${a.subUrl ? `\nURL: ${a.subUrl}` : ""}

Only write about THIS category. Don't reference any other brand or category.`
  );

  // ----- SERIES TYPE -----
  if (a.subcategoryType) {
    const settingsHint = formatSettingsHints(a.subcategoryType, a.subcategorySettings);
    sections.push(
      `### SERIES TYPE

This category is set up as: ${getHumanReadableSubcategoryType(a.subcategoryType)}.${settingsHint ? `\n${settingsHint}` : ""}`
    );
  }

  // ----- URL SUMMARY -----
  if (a.urlSummaryText || a.eventDetails) {
    const lines: string[] = [
      "### EXTRA FACTS FROM THE CATEGORY URL",
      "",
      "These were extracted from the category's own URL. Treat as verified facts — weave specifics into the copy.",
    ];
    if (a.urlSummaryText) lines.push("", a.urlSummaryText);
    if (a.eventDetails) {
      const ed = a.eventDetails;
      const detailLines: string[] = [];
      if (ed.venue) detailLines.push(`Venue: ${ed.venue}`);
      if (ed.date) detailLines.push(`Date: ${ed.date}`);
      if (ed.time) detailLines.push(`Time: ${ed.time}`);
      if (ed.price) detailLines.push(`Price/Tickets: ${ed.price}`);
      if (ed.format) detailLines.push(`Format: ${ed.format}`);
      if (ed.hosts && ed.hosts.length > 0) detailLines.push(`Hosts: ${ed.hosts.join(", ")}`);
      if (ed.key_points && ed.key_points.length > 0) {
        detailLines.push("Key points:", ...ed.key_points.map((p) => `- ${p}`));
      }
      if (detailLines.length > 0) lines.push("", ...detailLines);
    }
    sections.push(lines.join("\n"));
  }

  // ----- BRAND VOICE -----
  if (a.toneOverride) {
    sections.push(`### BRAND VOICE\n\n${a.toneOverride}`);
  } else if (a.recentExamples.length > 0) {
    sections.push(
      `### BRAND VOICE — match this

Below are recent posts from this brand. Match their tone, rhythm, and personality. Write like the next post in this feed — same voice, fresh content. Don't copy their exact phrases.

${a.recentExamples.map((ex, i) => `${i + 1}) ${ex.trim()}`).join("\n\n")}`
    );
  } else {
    sections.push(
      `### BRAND VOICE

No example posts from this brand yet. Default to a warm, professional tone suitable for a general NZ small-business audience. Conversational but not overly casual.`
    );
  }

  // ----- POST TYPE / EVENT TIMING -----
  if (a.isEvent) {
    const eventLines: string[] = [
      "### POST TYPE",
      "",
      "This is an EVENT post — time-specific. It might be a physical event, an online event, a launch, or a time-bound promo. Infer which from the description and URL details.",
      "",
      "- If a venue or 'physical' format → mention it naturally; focus on experience and what will happen.",
      "- If 'online' format → use accessibility/virtual framing.",
      '- If a promo or price → make the value obvious; use natural urgency ("happening soon", "ending Sunday").',
      "- If time/date appears in URL details → reference it naturally.",
      "",
      "You MAY reference the event date or date range provided in EVENT TIMING. Never reference the scheduled post date — only the event's own date.",
    ];
    if (a.eventTiming) {
      eventLines.push("", "### EVENT TIMING", "", a.eventTiming);
    }
    if (a.occurrenceNotes) {
      eventLines.push("", "### ADDITIONAL CONTEXT FOR THIS EVENT", "", a.occurrenceNotes);
    }
    sections.push(eventLines.join("\n"));
  } else {
    sections.push(
      `### POST TYPE

This is a PRODUCT/SERVICE post (recurring, not date-anchored). Focus on explaining or promoting what the category describes. Don't mention any specific dates unless they appear in the description, URL summary, or post objective.`
    );
  }

  // ----- TYPE-SPECIFIC GUIDANCE -----
  const typeGuidance = buildTypeSpecificGuidance(a.subcategoryType, {
    ...(a.subcategorySettings ?? {}),
    _days_until_event: a.daysUntilEvent,
    _frequency: a.frequency,
  });
  if (typeGuidance) {
    sections.push(`### TYPE-SPECIFIC GUIDANCE\n\n${typeGuidance}`);
  }

  // ----- POST OBJECTIVE -----
  sections.push(`### POST OBJECTIVE\n\n${a.prompt}`);

  // ----- LENGTH -----
  const lengthBlock =
    a.effectiveLength === "short"
      ? "Short: 1 sentence. On a single line, no paragraphs."
      : a.effectiveLength === "medium"
      ? "Medium: 3-5 sentences, split into 2-3 short paragraphs separated by a blank line."
      : "Long: 6-8 sentences, split into 2-4 short paragraphs separated by a blank line.";
  sections.push(`### LENGTH\n\n${lengthBlock}`);

  // ----- EMOJI -----
  let emojiBlock = "";
  if (!a.allowEmojis || a.emojiRequirement === "none") {
    emojiBlock = "This brand rarely uses emojis. Don't add any.";
  } else if (a.emojiRequirement === "optional_one") {
    emojiBlock =
      "This brand sometimes uses emojis. Include at most one, at the end of a sentence, only if it feels natural.";
  } else {
    emojiBlock =
      "This brand uses emojis often. Include exactly one emoji at the very end of the post. Match the style of the brand examples.";
  }
  sections.push(`### EMOJI\n\n${emojiBlock}`);

  // ----- VARIATION -----
  if (a.variationTotal > 1) {
    sections.push(
      `### VARIATION

This is post ${a.variationIndex + 1} of ${a.variationTotal} for this category. Each post should explore a different angle — one might lean into a customer benefit, another into a specific detail from the brief, another into a moment or scene. Vary the opening style and structure.

Don't reuse the same first 2-3 words as previous posts in this set.`
    );
  }

  if (a.previousCopies.length > 0) {
    sections.push(
      `### DON'T REPEAT THESE

Previous posts for this same category:

${a.previousCopies.map((c, i) => `${i + 1}) "${c}"`).join("\n")}

Write something fresh — different opening, different angle, different specifics from the brief.`
    );
  }

  if (a.variationHint) {
    sections.push(`### ANGLE FOR THIS POST\n\n${a.variationHint}`);
  }

  // ----- CLOSING -----
  sections.push("Write the post copy now. Plain text only.");

  return sections.join("\n\n");
}
