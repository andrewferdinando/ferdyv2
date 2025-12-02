import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Query parameter schema
const statusQuerySchema = z.object({
  brandId: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { error: "Missing brandId query parameter" },
        { status: 400 }
      );
    }

    // Validate input
    const validationResult = statusQuerySchema.safeParse({ brandId });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid brandId", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { brandId: validatedBrandId } = validationResult.data;

    // Call the status RPC function
    const { data, error } = await supabaseAdmin.rpc(
      'rpc_push_to_drafts_status',
      { p_brand_id: validatedBrandId }
    );

    if (error) {
      console.error('[api/drafts/push/status] RPC error:', error);
      return NextResponse.json(
        { error: "Failed to fetch push status", details: error.message },
        { status: 500 }
      );
    }

    // The RPC returns a single row
    const status = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (!status) {
      return NextResponse.json({
        targetMonth: null,
        targetMonthName: null,
        pushDate: null,
        hasRun: false,
      });
    }

    // Return the status in the expected format
    return NextResponse.json({
      targetMonth: status.target_month ? new Date(status.target_month).toISOString().split('T')[0] : null,
      targetMonthName: status.target_month_name || null,
      pushDate: status.push_date ? new Date(status.push_date).toISOString().split('T')[0] : null,
      hasRun: status.has_run || false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error('[api/drafts/push/status] Error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

