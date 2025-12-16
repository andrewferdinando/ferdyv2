import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * @deprecated This route is deprecated. Draft generation is now automatic via /api/drafts/generate-all cron job.
 * This route is kept for backward compatibility but should not be used.
 * It will be removed in a future version.
 */
export async function GET(req: NextRequest) {
  // Return deprecation notice
  console.warn('[api/drafts/push/status] DEPRECATED: This route is deprecated. Draft generation is now automatic.');
  return NextResponse.json(
    { 
      error: "This endpoint is deprecated. Draft generation is now automatic via nightly cron job.",
      deprecated: true,
      targetMonthName: null,
      pushDate: null,
      hasRun: false,
      lastRunAt: null
    },
    { status: 410 } // 410 Gone
  );
}
