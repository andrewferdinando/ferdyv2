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
  subcategory?: {
    name?: string;
    url?: string;
  };
  schedule?: {
    frequency: string;
    event_date?: string;
  };
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

  // Process each draft
  console.log(`Processing ${drafts.length} drafts for brand ${brandId}`);
  for (const draft of drafts) {
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
      const payload: PostCopyPayload = {
        brandId,
        draftId: draft.draftId,
        prompt: draft.prompt,
        platform: "instagram", // Default, can be inferred from draft.channel if available
        subcategory: draft.subcategory,
        schedule: draft.schedule,
        tone_override: draft.options?.tone_override,
        length: draft.options?.length,
        emoji: draft.options?.emoji,
        hashtags: draft.options?.hashtags,
        cta: draft.options?.cta,
        variants: 1, // Always 1 for background jobs
        max_tokens: draft.options?.max_tokens,
      };

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
      if (draft !== drafts[drafts.length - 1]) {
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

  return { processed, skipped, failed };
}

