import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { processBatchCopyGeneration, type DraftCopyInput } from "@/lib/generateCopyBatch";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper function to calculate days until event
function daysUntil(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.max(0, Math.ceil((d.getTime() - today.getTime()) / 86400000));
}

// Request body schema
const pushDraftsSchema = z.object({
  brandId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Validate input
    const validationResult = pushDraftsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { brandId } = validationResult.data;

    // Call the RPC function to create drafts
    console.log(`Calling rpc_push_framework_to_drafts for brand ${brandId}`);
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      'rpc_push_framework_to_drafts',
      { p_brand_id: brandId }
    );

    if (rpcError) {
      console.error('RPC error:', rpcError);
      return NextResponse.json(
        { error: "Failed to create drafts", details: rpcError.message },
        { status: 500 }
      );
    }

    console.log('RPC result:', { rpcResult, type: typeof rpcResult });

    // Determine how many drafts were created
    const draftCount = typeof rpcResult === 'number' ? rpcResult : (Array.isArray(rpcResult) ? rpcResult.length : 0);

    if (draftCount === 0) {
      return NextResponse.json({
        ok: true,
        message: "No drafts created",
        draftCount: 0,
      });
    }

    // Fetch the newly created drafts
    const { data: insertedDrafts, error: fetchError } = await supabaseAdmin
      .from('drafts')
      .select('id, brand_id, scheduled_for, schedule_source, copy')
      .eq('brand_id', brandId)
      .eq('schedule_source', 'framework')
      .gte('created_at', new Date(Date.now() - 120000).toISOString()) // Last 2 minutes
      .order('created_at', { ascending: false })
      .limit(draftCount);

    if (fetchError || !insertedDrafts || insertedDrafts.length === 0) {
      // Return success even if we can't fetch them - the RPC succeeded
      return NextResponse.json({
        ok: true,
        message: "Drafts created, but couldn't fetch details for copy generation",
        draftCount,
      });
    }

    // Fetch framework targets to map scheduled_for -> subcategory_id (same as client does)
    const { data: targets, error: targetsError } = await supabaseAdmin
      .rpc('rpc_framework_targets', { p_brand_id: brandId });
    
    if (targetsError) {
      console.error('Error fetching framework targets:', targetsError);
      // Continue without targets - drafts will still be created but without subcategory mapping
    }

    // Fetch schedule rules to get frequency and subcategory mapping
    const { data: scheduleRules } = await supabaseAdmin
      .from('schedule_rules')
      .select('id, frequency, subcategory_id')
      .eq('brand_id', brandId)
      .eq('is_active', true);

    // Fetch subcategories for name/url
    const subcategoryIds = scheduleRules?.map(r => r.subcategory_id).filter(Boolean) as string[] || [];
    const { data: subcategories } = await supabaseAdmin
      .from('subcategories')
      .select('id, name, url')
      .in('id', subcategoryIds);

    const subcategoriesMap = new Map(
      (subcategories || []).map(sc => [sc.id, sc])
    );

    // Match drafts to subcategories via scheduled_for (with 5-second tolerance, same as client)
    interface FrameworkTarget {
      subcategory_id: string;
      scheduled_at: string;
      frequency: string;
    }

    // Build payload for generate-copy endpoint
    interface DraftRow {
      id: string;
      brand_id: string;
      scheduled_for: string | null;
      schedule_source: string | null;
      copy: string | null;
    }

    const payload = {
      brandId,
      drafts: insertedDrafts
        .filter((d): d is DraftRow => {
          const copy = d.copy;
          return (!copy || copy.trim().length === 0 || copy === 'Post copy coming soon…') && d.scheduled_for !== null;
        })
        .map((d) => {
          // Match draft to target via scheduled_for (same logic as client)
          // We've already filtered out null scheduled_for above, so this is safe
          const draftTime = new Date(d.scheduled_for!).getTime();
          const target = (targets as FrameworkTarget[] | null)?.find((t) => {
            const targetTime = new Date(t.scheduled_at).getTime();
            return Math.abs(targetTime - draftTime) < 5000; // 5 second tolerance
          });

          const subcategoryId = target?.subcategory_id;
          const subcategory = subcategoryId ? subcategoriesMap.get(subcategoryId) : null;
          const rule = scheduleRules?.find(r => r.subcategory_id === subcategoryId);
          const eventDate = d.scheduled_for ? new Date(d.scheduled_for).toISOString().split('T')[0] : undefined;

          return {
            draftId: d.id,
            subcategory: {
              name: subcategory?.name ?? "",
              url: subcategory?.url ?? "",
            },
            schedule: {
              frequency: rule?.frequency ?? target?.frequency ?? "weekly",
              event_date: eventDate,
            },
            prompt: `Write copy for this post`,
            options: {
              length: "short" as const,
              emoji: "none" as const,
              hashtags: { mode: "auto" as const },
            },
          };
        }),
    };

    // Only trigger if there are drafts that need copy
    if (payload.drafts.length > 0) {
      try {
        console.log(`Triggering copy generation for ${payload.drafts.length} drafts`);
        
        // Call the batch processing function directly (no HTTP fetch needed)
        // Map to DraftCopyInput format (exclude days_until_event from schedule)
        const draftsInput: DraftCopyInput[] = payload.drafts.map(d => ({
          draftId: d.draftId,
          subcategory: d.subcategory,
          schedule: d.schedule ? {
            frequency: d.schedule.frequency,
            event_date: d.schedule.event_date,
          } : undefined,
          prompt: d.prompt,
          options: d.options,
        }));

        const result = await processBatchCopyGeneration(brandId, draftsInput);
        console.log("Copy generation completed:", result);

        return NextResponse.json({
          ok: true,
          message: "Drafts created and copy generation completed",
          draftCount,
          copyGenerationTriggered: true,
          copyJobResult: result,
        });
      } catch (err) {
        console.error("Failed to generate copy:", err);
        // Still return success - drafts were created, just copy generation failed
        return NextResponse.json({
          ok: true,
          message: "Drafts created, but copy generation failed",
          draftCount,
          copyGenerationTriggered: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Drafts created",
      draftCount,
      copyGenerationTriggered: false,
      reason: "All drafts already have copy",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
