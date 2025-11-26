import { supabaseAdmin } from "@/lib/supabase-server";
import OpenAI from "openai";
import { generatePostCopyFromContext, type PostCopyPayload } from "@/lib/postCopy";

// Helper to sleep between iterations
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Lazy initialization - only creates client when needed
// Note: OPENAI_API_KEY must be set in Vercel environment variables
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

// Type for draft input
export type DraftCopyInput = {
  draftId: string;
  subcategoryId?: string; // Optional subcategory ID for grouping
  subcategory?: {
    name?: string;
    url?: string;
    description?: string;
    frequency_type?: string;
    url_page_summary?: string | null;
    default_copy_length?: "short" | "medium" | "long";
  };
  subcategory_type?: string | null;
  subcategory_settings?: Record<string, any> | null;
  schedule?: {
    frequency: string;
    event_date?: string;
  };
  scheduledFor?: string; // UTC timestamp when the post is scheduled
  prompt: string;
  options?: {
    tone_override?: string;
    length?: "short" | "medium" | "long";
    emoji?: "auto" | "none";
    hashtags?: {
      mode: "auto" | "none" | "list";
      list?: string[];
    };
    cta?: string;
    variants?: number;
    max_tokens?: number;
  };
};

// Helper to group array by key
function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of array) {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
}

// Shared batch processing function
export async function processBatchCopyGeneration(
  brandId: string,
  drafts: DraftCopyInput[]
): Promise<{ processed: number; skipped: number; failed: number }> {
  // Generate job_run_id for tracking
  const jobRunId = crypto.randomUUID();

  const client = getClient();
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  // Group drafts by subcategory for variation tracking
  // Use subcategory ID if available, otherwise fall back to name
  const draftsBySubcategory = groupBy(drafts, (draft) => {
    // Try to get a stable key per subcategory - prefer ID, then name
    const subcategoryId = draft.subcategoryId || draft.subcategory?.name || "unknown";
    return subcategoryId;
  });

  console.log(`Processing ${drafts.length} drafts for brand ${brandId}`);
  console.log(`[generateCopyBatch] Grouped into ${Object.keys(draftsBySubcategory).length} subcategories`);

  // Process each subcategory group
  for (const [subcategoryKey, draftsInSubcategory] of Object.entries(draftsBySubcategory)) {
    console.log(`[generateCopyBatch] Processing ${draftsInSubcategory.length} drafts for subcategory: ${subcategoryKey}`);
    
    // Process each draft within this subcategory
    for (let index = 0; index < draftsInSubcategory.length; index++) {
      const draft = draftsInSubcategory[index];
      const variationIndex = index; // 0-based
      const variationTotal = draftsInSubcategory.length;
      
      try {
      // Check if copy_status is already "complete" - skip if so
      const { data: existingDraft, error: fetchDraftError } = await supabaseAdmin
        .from("drafts")
        .select("copy_status, copy")
        .eq("id", draft.draftId)
        .single();

      if (fetchDraftError) {
        console.error(`Error fetching draft ${draft.draftId}:`, fetchDraftError);
        throw new Error(`Failed to fetch draft: ${fetchDraftError.message}`);
      }

      // Skip if already complete (check both copy_status and copy field)
      // Also check if copy is just the placeholder text
      const hasRealCopy = existingDraft?.copy && 
        existingDraft.copy.trim().length > 0 && 
        existingDraft.copy !== 'Post copy coming soon…';
      if (
        existingDraft?.copy_status === "complete" ||
        hasRealCopy
      ) {
        console.log(`Skipping draft ${draft.draftId} - already has copy`);
        skipped++;
        continue;
      }

      console.log(`Generating copy for draft ${draft.draftId}`);

      // Set copy_status to "pending"
      try {
        await supabaseAdmin
          .from("drafts")
          .update({ copy_status: "pending" })
          .eq("id", draft.draftId);
      } catch {
        // Gracefully handle if copy_status column doesn't exist
      }

      // Build PostCopyPayload
      // Note: length precedence is: payload.length (explicit) > subcategory.default_copy_length > "medium"
      const payload: PostCopyPayload = {
        brandId,
        draftId: draft.draftId,
        prompt: draft.prompt,
        platform: "instagram", // Default, can be inferred from draft.channel if available
        subcategory: draft.subcategory ? {
          ...draft.subcategory,
          default_copy_length: draft.subcategory.default_copy_length ?? "medium",
        } : undefined,
        subcategory_type: draft.subcategory_type as any ?? null,
        subcategory_settings: draft.subcategory_settings ?? null,
        schedule: draft.schedule,
        scheduledFor: draft.scheduledFor,
        tone_override: draft.options?.tone_override,
        length: draft.options?.length, // Explicit override takes precedence over subcategory.default_copy_length
        emoji: draft.options?.emoji,
        hashtags: draft.options?.hashtags,
        cta: draft.options?.cta,
        variants: 1, // Always 1 for background jobs
        max_tokens: draft.options?.max_tokens,
        variation_hint: (draft as any).variation_hint ?? null, // Pass through variation_hint if present
        variation_index: variationIndex, // 0-based index within subcategory
        variation_total: variationTotal, // Total drafts for this subcategory
      };

      // Log payload before calling generatePostCopyFromContext (for debugging)
      console.log("COPY PAYLOAD:", JSON.stringify(payload, null, 2));
      console.log("[generateCopyBatch] Copy length debug:", {
        draftId: draft.draftId,
        explicitLength: draft.options?.length,
        subcategoryDefaultCopyLength: draft.subcategory?.default_copy_length,
        effectiveLength: payload.length || payload.subcategory?.default_copy_length || "medium",
        subcategoryName: draft.subcategory?.name,
      });

      // Generate copy (with n=1)
      const variants = await generatePostCopyFromContext(
        supabaseAdmin,
        client,
        payload
      );

      if (variants.length === 0) {
        throw new Error("No variants generated");
      }

      // Save result to drafts
      try {
        const { error: updateError } = await supabaseAdmin
          .from("drafts")
          .update({
            copy: variants[0],
            copy_status: "complete",
            copy_model: "gpt-4o-mini",
            copy_meta: {
              job_run_id: jobRunId,
              platform: payload.platform,
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
          .eq("id", draft.draftId);

        if (updateError) {
          console.log(`Update with metadata failed for draft ${draft.draftId}, trying simple update:`, updateError);
          // Gracefully handle if copy_status/copy_model/copy_meta columns don't exist
          // Just update copy field
          const { error: simpleUpdateError } = await supabaseAdmin
            .from("drafts")
            .update({ copy: variants[0] })
            .eq("id", draft.draftId);
          
          if (simpleUpdateError) {
            throw new Error(`Failed to update draft: ${simpleUpdateError.message}`);
          }
        }
        
        console.log(`Successfully saved copy for draft ${draft.draftId}`);
      } catch (updateErr) {
        throw new Error(`Failed to save copy: ${updateErr instanceof Error ? updateErr.message : "Unknown error"}`);
      }

        processed++;

        // Sleep between iterations to avoid rate spikes
        // Only sleep if not the last draft in the entire batch
        const isLastSubcategory = subcategoryKey === Object.keys(draftsBySubcategory)[Object.keys(draftsBySubcategory).length - 1];
        const isLastInSubcategory = index === draftsInSubcategory.length - 1;
        if (!(isLastSubcategory && isLastInSubcategory)) {
          await sleep(150);
        }
      } catch (error) {
        failed++;

        // Set copy_status to "failed" and add error to copy_meta
        try {
          await supabaseAdmin
            .from("drafts")
            .update({
              copy_status: "failed",
              copy_meta: {
                job_run_id: jobRunId,
                error: error instanceof Error ? error.message : "Unknown error",
              },
            })
            .eq("id", draft.draftId);
        } catch {
          // Gracefully handle if copy_status/copy_meta columns don't exist
          // Try to update with minimal error info
          try {
            await supabaseAdmin
              .from("drafts")
              .update({
                copy: `[Error: ${error instanceof Error ? error.message : "Unknown error"}]`,
              })
              .eq("id", draft.draftId);
          } catch {
            // Ignore if update fails entirely
          }
        }
      }
    }
  }

  return { processed, skipped, failed };
}

