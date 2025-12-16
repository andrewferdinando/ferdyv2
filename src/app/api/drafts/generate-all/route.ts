/**
 * API Route: Generate drafts for all active brands (Nightly Cron Job)
 * 
 * This route is called by Vercel Cron nightly to keep the next 30 days of drafts generated.
 * It calls the shared draft generation utility (single source of truth) for each active brand.
 * 
 * Security: Requires CRON_SECRET header to prevent unauthorized access.
 * Input: None (fetches all active brands automatically)
 * Output: Summary of brands processed and total drafts created/skipped
 * 
 * This is the primary automatic draft generation mechanism - no manual steps required.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { generateDraftsForBrand } from "@/lib/server/draftGeneration";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Generate drafts for all active brands
 * Secured with CRON_SECRET header check
 * 
 * NOTE: This is the primary automatic draft generation mechanism.
 * No manual steps, monthly pushes, or user actions are required.
 */
async function handleGenerateAll(req: NextRequest) {
  try {
    console.log('[api/drafts/generate-all] Received request');

    // Verify CRON_SECRET header
    const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '') || 
                      req.headers.get('x-cron-secret') || 
                      req.headers.get('cron-secret');
    
    const expectedSecret = process.env.CRON_SECRET;
    
    if (!expectedSecret) {
      console.error('[api/drafts/generate-all] CRON_SECRET not configured');
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }

    if (!cronSecret || cronSecret !== expectedSecret) {
      console.warn('[api/drafts/generate-all] Invalid or missing cron secret');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all active brands
    const { data: brands, error: brandsError } = await supabaseAdmin
      .from('brands')
      .select('id')
      .eq('status', 'active');

    if (brandsError) {
      console.error('[api/drafts/generate-all] Error fetching brands:', brandsError);
      return NextResponse.json(
        { error: "Failed to fetch brands", details: brandsError.message },
        { status: 500 }
      );
    }

    if (!brands || brands.length === 0) {
      console.log('[api/drafts/generate-all] No active brands found');
      return NextResponse.json({
        brandsProcessed: 0,
        totalTargetsFound: 0,
        totalDraftsCreated: 0,
        totalDraftsSkipped: 0,
        totalCopyGenerated: 0
      });
    }

    console.log(`[api/drafts/generate-all] Processing ${brands.length} active brands`);

    // Process each brand
    let brandsProcessed = 0;
    let totalTargetsFound = 0;
    let totalDraftsCreated = 0;
    let totalDraftsSkipped = 0;
    let totalCopyGenerated = 0;

    for (const brand of brands) {
      try {
        console.log(`[api/drafts/generate-all] Processing brand ${brand.id}`);
        const result = await generateDraftsForBrand(brand.id);
        
        brandsProcessed++;
        totalTargetsFound += result.targetsFound;
        totalDraftsCreated += result.draftsCreated;
        totalDraftsSkipped += result.draftsSkipped;
        totalCopyGenerated += result.copyGenerationCount;
        
        console.log(`[api/drafts/generate-all] Brand ${brand.id} completed:`, result);
      } catch (error) {
        console.error(`[api/drafts/generate-all] Error processing brand ${brand.id}:`, error);
        // Continue with next brand even if one fails
        continue;
      }
    }

    const summary = {
      brandsProcessed,
      totalTargetsFound,
      totalDraftsCreated,
      totalDraftsSkipped,
      totalCopyGenerated
    };

    console.log('[api/drafts/generate-all] Summary:', summary);

    return NextResponse.json(summary);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error('[api/drafts/generate-all] Unexpected error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleGenerateAll(req);
}

export async function POST(req: NextRequest) {
  return handleGenerateAll(req);
}

