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

    // Fire-and-forget: Generate summary in the background
    // We don't await this - return immediately
    generateBrandSummaryForBrand(brandId).catch((err) => {
      console.error(`[API /brands/${brandId}/generate-summary] Error generating summary:`, err);
    });

    return NextResponse.json({
      ok: true,
      message: 'AI summary generation started',
    });
  } catch (error) {
    console.error('[API /brands/[brandId]/generate-summary] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to start summary generation' },
      { status: 500 }
    );
  }
}

