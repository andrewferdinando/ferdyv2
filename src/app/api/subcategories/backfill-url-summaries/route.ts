import { NextRequest, NextResponse } from 'next/server';
import { backfillSubcategoryUrlSummaries } from '@/server/subcategories/backfillUrlSummaries';

/**
 * POST /api/subcategories/backfill-url-summaries
 * 
 * Backfill URL summaries for existing subcategories that have a URL but no summary.
 * This is an admin-only operation.
 * 
 * Query params:
 * - brandId (optional): Filter to a specific brand
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId') || undefined;

    // Fire-and-forget: void the promise so the client isn't blocked
    // Errors are logged inside backfillSubcategoryUrlSummaries
    const result = await backfillSubcategoryUrlSummaries(brandId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Backfill failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      processed: result.processed || 0,
      errors: result.errors || 0,
      message: `Processed ${result.processed || 0} subcategories${result.errors ? ` with ${result.errors} errors` : ''}`
    });
  } catch (err) {
    console.error('[backfill-url-summaries API] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

