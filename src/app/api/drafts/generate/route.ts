/**
 * API Route: Generate drafts for a specific brand
 * 
 * This route calls the shared draft generation utility (single source of truth).
 * Input: brandId only (no date overrides, no user options)
 * Output: Summary of drafts created/skipped and copy generated
 * 
 * Used for:
 * - Manual generation for a specific brand (via API call)
 * - Automatic generation via nightly cron (via /api/drafts/generate-all)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateDraftsForBrand } from "@/lib/server/draftGeneration";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Request schema - accept brandId from query or body
// NOTE: Only brandId is required - no date overrides or user options
const generateDraftsSchema = z.object({
  brandId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  console.log('[API] /api/drafts/generate HIT');
  try {
    console.log('[api/drafts/generate] Received request');
    
    // Try to get brandId from query params first, then body
    const { searchParams } = new URL(req.url);
    const queryBrandId = searchParams.get('brandId');
    
    let body: any = {};
    try {
      body = await req.json().catch(() => ({}));
    } catch {
      // Body might be empty, that's okay
    }

    // Use brandId from query or body
    const brandId = queryBrandId || body.brandId;

    // Validate input
    const validationResult = generateDraftsSchema.safeParse({ brandId });
    if (!validationResult.success) {
      console.error('[api/drafts/generate] Invalid payload:', validationResult.error.issues);
      return NextResponse.json(
        { error: "Invalid payload", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { brandId: validatedBrandId } = validationResult.data;
    console.log('[api/drafts/generate] Called for brandId:', validatedBrandId);

    // Use shared utility function
    const result = await generateDraftsForBrand(validatedBrandId);

    return NextResponse.json(result);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error('[api/drafts/generate] Unexpected error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
