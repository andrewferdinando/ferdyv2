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

    // Fire-and-forget: don't await, but ensure promise stays alive
    // Store the promise to prevent garbage collection
    const refreshPromise = refreshSubcategoryUrlSummary(subcategoryId).catch(err => {
      console.error('[refresh-url-summary API] Error in refresh function:', err);
      return null; // Return value to prevent unhandled rejection
    });
    
    // Use waitUntil if available (Vercel/Next.js feature to keep function alive)
    if (typeof (globalThis as any).waitUntil === 'function') {
      (globalThis as any).waitUntil(refreshPromise);
    }

    // Return success immediately (don't block client)
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

