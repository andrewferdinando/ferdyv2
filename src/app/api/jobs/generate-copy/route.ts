import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processBatchCopyGeneration } from "@/lib/generateCopyBatch";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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
          description: z.string().optional(),
          frequency_type: z.string().optional(),
          url_page_summary: z.string().nullable().optional(),
          default_copy_length: z.enum(["short", "medium", "long"]).optional(),
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

    // Use the shared batch processing function
    const result = await processBatchCopyGeneration(brandId, drafts);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
