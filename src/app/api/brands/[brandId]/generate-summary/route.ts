/**
 * API endpoint to trigger AI summary generation for a brand
 * 
 * This endpoint can be called:
 * 1. By the database trigger after brand creation (via HTTP)
 * 2. Manually from the Super Admin UI
 * 
 * It's designed to be fire-and-forget - it returns immediately
 * and processes in the background.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateBrandSummaryForBrand } from '@/server/brands/generateBrandSummary';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for summary generation (OpenAI can be slow)

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await context.params;

    if (!brandId || typeof brandId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid brand ID' },
        { status: 400 }
      );
    }

    // Optional: Check for internal auth token (CRON_SECRET) if provided
    // But allow the request to proceed even without it for manual triggers
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
    const isInternalCall = expectedToken && authHeader === expectedToken;

    console.log(`[API /brands/${brandId}/generate-summary] Received request to generate summary (internal: ${!!isInternalCall})`);

    // Actually await the summary generation so we can catch and report errors
    // This is still reasonably fast (< 30s) and provides better feedback
    try {
      await generateBrandSummaryForBrand(brandId);
      
      console.log(`[API /brands/${brandId}/generate-summary] Successfully generated summary`);
      
      return NextResponse.json({
        ok: true,
        message: 'AI summary generated successfully',
      });
    } catch (err) {
      console.error(`[API /brands/${brandId}/generate-summary] Error generating summary:`, err);
      
      // Check if it's a database error (columns might not exist)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('column') || errorMessage.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Database columns not found. Please run the migration: add_ai_summary_to_brands.sql',
            details: errorMessage
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to generate summary',
          details: errorMessage
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API /brands/[brandId]/generate-summary] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to start summary generation' },
      { status: 500 }
    );
  }
}

