import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * @deprecated This route is deprecated. Use /api/drafts/generate instead.
 * This route is kept for backward compatibility but should not be used.
 * It will be removed in a future version.
 */
export async function POST(req: NextRequest) {
  // Return deprecation notice
  console.warn('[api/drafts/push] DEPRECATED: This route is deprecated. Use /api/drafts/generate instead.');
  return NextResponse.json(
    { 
      error: "This endpoint is deprecated. Please use /api/drafts/generate instead.",
      deprecated: true
    },
    { status: 410 } // 410 Gone
  );
}
