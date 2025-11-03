import OpenAI from "openai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  subcategory?: { name?: string; url?: string };
  schedule?: { frequency: string; event_date?: string; days_until_event?: number };
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
  supabaseAdmin: SupabaseClient<any, "public", any>,
  client: OpenAI,
  payload: PostCopyPayload
): Promise<string[]> {
  const { brandId, platform = "instagram", prompt, variants = 1, max_tokens = 120 } = payload;

  // 1) Load brand summary
  const { data: brand, error: brandError } = await supabaseAdmin
    .from("brands")
    .select("brand_summary")
    .eq("id", brandId)
    .single();

  if (brandError || !brand) {
    throw new Error(`Brand not found: ${brandError?.message || "Unknown error"}`);
  }

  // 2) Parse brand summary
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

  // 4) Calculate days_until_event if schedule.event_date is provided
  let daysUntilEvent: string | number = payload.schedule?.days_until_event ?? "n/a";
  if (payload.schedule?.event_date && daysUntilEvent === "n/a") {
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
  }

  // 5) Build brand context
  const brandContextParts: string[] = [];
  if (brandSummary?.name) brandContextParts.push(`- Name: ${brandSummary.name}`);
  if (brandSummary?.what_they_sell)
    brandContextParts.push(`- What they sell: ${brandSummary.what_they_sell}`);
  if (brandSummary?.target_audience)
    brandContextParts.push(`- Target audience: ${brandSummary.target_audience}`);
  if (payload.tone_override || brandSummary?.tone_of_voice) {
    brandContextParts.push(
      `- Tone of voice: ${payload.tone_override || brandSummary?.tone_of_voice || ""}`
    );
  }
  if (brandSummary?.brand_values && brandSummary.brand_values.length > 0) {
    brandContextParts.push(`- Brand values: ${brandSummary.brand_values.join(", ")}`);
  }
  if (brandSummary?.key_offers && brandSummary.key_offers.length > 0) {
    brandContextParts.push(`- Key offers or services: ${brandSummary.key_offers.join(", ")}`);
  }
  if (brandSummary?.price_positioning) {
    brandContextParts.push(`- Price positioning: ${brandSummary.price_positioning}`);
  }

  // 6) Build subcategory context
  const subcategoryContextParts: string[] = [];
  if (payload.subcategory) {
    subcategoryContextParts.push(
      `- Subcategory name: ${payload.subcategory.name || ""}`
    );
    subcategoryContextParts.push(`- Subcategory URL: ${payload.subcategory.url || ""}`);
  }

  // 7) Build schedule context
  const scheduleContextParts: string[] = [];
  if (payload.schedule) {
    scheduleContextParts.push(`- Frequency: ${payload.schedule.frequency || ""}`);
    scheduleContextParts.push(`- Event date: ${payload.schedule.event_date || "none"}`);
    scheduleContextParts.push(`- Days until event: ${daysUntilEvent}`);
  }

  // 8) Build hashtags instruction
  let hashtagsInstruction = payload.hashtags?.mode || "auto";
  if (payload.hashtags?.mode === "list" && payload.hashtags?.list) {
    hashtagsInstruction = `list: ${payload.hashtags.list.slice(0, 5).join(", ")}`;
  }

  // 9) Build the USER prompt string
  const userPrompt = `Brand context:
${brandContextParts.length > 0 ? brandContextParts.join("\n") : "- No brand context available"}

${subcategoryContextParts.length > 0 ? `Subcategory context:\n${subcategoryContextParts.join("\n")}\n` : ""}${scheduleContextParts.length > 0 ? `Schedule context:\n${scheduleContextParts.join("\n")}\n` : ""}Recent lines used for this brand (do NOT repeat phrases/structure):
${recentLinesJoined || "(none)"}

Post objective:
- "${prompt}"

Tone & length:
- Tone: ${payload.tone_override || "match brand tone"}
- Length: ${payload.length || "short"}  // short ≈ 1–2 sentences, medium ≈ 3–5, long ≈ 6–8

Writing instructions:
1. Adapt closely to the brand and subcategory context.
2. If frequency is daily/weekly/monthly → product/service tone.
3. If frequency is a single date/date-range and we are within 3 days before event_date → write as a countdown (e.g., "Only 3 days to go until ${payload.subcategory?.name || "the event"}!").
4. Keep copy specific, concrete, and human. Avoid fluff.
5. Emojis: ${payload.emoji || "auto"} (if "none", use zero emojis).
6. Hashtags: ${hashtagsInstruction}
   - If "auto": add up to 3–5 relevant hashtags at the end.
   - If "list": use only from this list (max 5): ${payload.hashtags?.list?.slice(0, 5).join(", ") || "[]"}
   - If "none": add no hashtags.
7. CTA: ${payload.cta || "none"}
8. Output plain text only.`;

  // 10) SYSTEM message (fixed)
  const systemMessage =
    "You are a professional social media copywriter for brands.\nAlways follow instructions carefully.\nOutput only the final post text (no explanations).\nAvoid repetition across similar posts.";

  // 11) Call OpenAI with retry logic
  const completion = await withRetry(() =>
    client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      n: clamp(variants ?? 1, 1, 3),
      max_tokens: max_tokens ?? 120,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt },
      ],
    })
  );

  // 12) Extract and return variants
  const results = completion.choices
    .map((c) => c.message?.content?.trim() || "")
    .filter(Boolean);

  if (results.length === 0) {
    throw new Error("No copy variants generated");
  }

  return results;
}
