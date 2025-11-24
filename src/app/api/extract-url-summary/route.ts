import { NextRequest, NextResponse } from 'next/server';
import { extractUrlSummary } from '@/server/subcategories/extractUrlSummary';

/**
 * GET /api/extract-url-summary?url=<url>
 * 
 * Extracts URL summary from an arbitrary URL and returns the structured summary.
 * Used for event occurrences to extract summaries from occurrence-specific URLs.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    try {
      const summary = await extractUrlSummary(url);
      return NextResponse.json(summary);
    } catch (err) {
      console.error('[extract-url-summary API] Error extracting summary:', err);
      // Return empty summary on error rather than failing
      return NextResponse.json({
        summary: '',
        details: {
          venue: null,
          date: null,
          time: null,
          price: null,
          format: null,
          hosts: null,
          key_points: null,
        },
      });
    }
  } catch (err) {
    console.error('[extract-url-summary API] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 }
    );
  }
}

