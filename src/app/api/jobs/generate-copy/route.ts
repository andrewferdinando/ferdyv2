import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import OpenAI from "openai";
import { generatePostCopyFromContext, type PostCopyPayload } from "@/lib/postCopy";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Lazy initialization - only creates client when needed
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

// Helper to sleep between iterations
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Request body schema
const generateCopySchema = z.object({
  brandId: z.string().uuid(),
  drafts: z.array(
    z.object({
      draftId: z.string().uuid(),
      subcategory: z
        .object({
          name: z.string().optional(),
          url: z.string().optional(),
        })
        .optional(),
      schedule: z
        .object({
          frequency: z.string(),
          event_date: z.string().optional(),
        })
        .optional(),
      prompt: z.string().min(1),
      options: z
        .object({
          tone_override: z.string().optional(),
          length: z.enum(["short", "medium", "long"]).optional(),
          emoji: z.enum(["auto", "none"]).optional(),
          hashtags: z
            .object({
              mode: z.enum(["auto", "none", "list"]),
              list: z.array(z.string()).optional(),
            })
            .optional(),
          cta: z.string().optional(),
          variants: z.number().int().min(1).max(3).optional(),
          max_tokens: z.number().int().min(1).optional(),
        })
        .optional(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Validate input
    const validationResult = generateCopySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { brandId, drafts } = validationResult.data;

    // Generate job_run_id for tracking
    const jobRunId = crypto.randomUUID();

    const client = getClient();
    let processed = 0;
    let skipped = 0;
    let failed = 0;

    // Process each draft
    for (const draft of drafts) {
      try {
        // Check if copy_status is already "complete" - skip if so
        const { data: existingDraft } = await supabaseAdmin
          .from("drafts")
          .select("copy_status, copy")
          .eq("id", draft.draftId)
          .single();

        // Skip if already complete (check both copy_status and copy field)
        if (
          existingDraft?.copy_status === "complete" ||
          (existingDraft?.copy && existingDraft.copy.trim().length > 0)
        ) {
          skipped++;
          continue;
        }

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
          await supabaseAdmin
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
        } catch {
          // Gracefully handle if copy_status/copy_model/copy_meta columns don't exist
          // Just update copy field
          await supabaseAdmin
            .from("drafts")
            .update({ copy: variants[0] })
            .eq("id", draft.draftId);
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

    return NextResponse.json({
      ok: true,
      processed,
      skipped,
      failed,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
