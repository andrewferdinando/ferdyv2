import { NextRequest, NextResponse } from 'next/server';
import { refreshSubcategoryUrlSummary } from '@/server/subcategories/refreshUrlSummary';

/**
 * POST /api/subcategories/[subcategoryId]/refresh-url-summary
 * 
 * Refreshes the URL page summary for a subcategory by fetching and parsing the URL.
 * This is a fire-and-forget operation - errors are logged but don't affect the response.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subcategoryId: string }> }
) {
  try {
    const { subcategoryId } = await params;

    if (!subcategoryId) {
      return NextResponse.json(
        { error: 'Subcategory ID is required' },
        { status: 400 }
      );
    }

    // Fire-and-forget: void the promise so the client isn't blocked
    // Errors are logged inside refreshSubcategoryUrlSummary
    void refreshSubcategoryUrlSummary(subcategoryId);

    // Return success immediately
    return NextResponse.json({ 
      success: true,
      message: 'URL summary refresh initiated' 
    });
  } catch (err) {
    console.error('[refresh-url-summary API] Unexpected error:', err);
    // Still return success to avoid breaking the save flow
    return NextResponse.json({ 
      success: true,
      message: 'URL summary refresh initiated (with errors)' 
    });
  }
}

