import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { processBatchCopyGeneration, type DraftCopyInput } from "@/lib/generateCopyBatch";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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
      .select('id, frequency, subcategory_id, start_date, end_date')
      .eq('brand_id', brandId)
      .eq('is_active', true);

    // Fetch subcategories for name/url/description/frequency_type/url_page_summary
    const subcategoryIds = scheduleRules?.map(r => r.subcategory_id).filter(Boolean) as string[] || [];
    const { data: subcategories } = await supabaseAdmin
      .from('subcategories')
      .select('id, name, url, detail, frequency_type, url_page_summary')
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
          
          // Use subcategory.frequency_type if available, otherwise derive from rule
          // subcategory.frequency_type is the source of truth for EVENT vs PRODUCT/SERVICE mode
          let frequencyType: string | undefined = subcategory?.frequency_type ?? undefined;
          if (!frequencyType && rule?.frequency) {
            // Fallback: derive from rule frequency if subcategory doesn't have frequency_type
            if (rule.frequency === 'specific') {
              // 'specific' frequency means date-based
              // If end_date exists and is different from start_date, it's a date_range
              if (rule.start_date && rule.end_date) {
                const startDateStr = new Date(rule.start_date).toISOString().split('T')[0];
                const endDateStr = new Date(rule.end_date).toISOString().split('T')[0];
                frequencyType = startDateStr !== endDateStr ? 'date_range' : 'date';
              } else {
                frequencyType = 'date';
              }
            } else {
              frequencyType = rule.frequency; // 'daily', 'weekly', or 'monthly'
            }
          }

          // Build schedule object based on event vs non-event
          // For events (frequency_type = 'date' or 'date_range'): use rule.start_date/end_date as event dates
          // For non-events (daily/weekly/monthly): no event_date in schedule
          const isEvent = frequencyType === 'date' || frequencyType === 'date_range';
          let schedule: { frequency: string; event_date?: string; start_date?: string; end_date?: string } = {
            frequency: rule?.frequency ?? target?.frequency ?? "weekly",
          };

          if (isEvent && rule) {
            // Event-based posts: use the actual event date(s) from the rule
            if (frequencyType === 'date_range' && rule.start_date && rule.end_date) {
              // Date range: use both start_date and end_date
              schedule.start_date = new Date(rule.start_date).toISOString().split('T')[0];
              schedule.end_date = new Date(rule.end_date).toISOString().split('T')[0];
            } else if (rule.start_date) {
              // Single date: use event_date
              schedule.event_date = new Date(rule.start_date).toISOString().split('T')[0];
            }
          }
          // For non-event posts, schedule only contains frequency (no event_date)

          return {
            draftId: d.id,
            subcategory: {
              name: subcategory?.name ?? "",
              url: subcategory?.url ?? "",
              description: subcategory?.detail ?? undefined,
              frequency_type: frequencyType,
              url_page_summary: subcategory?.url_page_summary ?? null,
            },
            schedule,
            scheduledFor: d.scheduled_for ?? undefined, // This is when the post is scheduled, NOT the event date
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
        // Map to DraftCopyInput format (include all new fields)
        const draftsInput: DraftCopyInput[] = payload.drafts.map(d => ({
          draftId: d.draftId,
          subcategory: d.subcategory,
          schedule: d.schedule ? {
            frequency: d.schedule.frequency,
            event_date: d.schedule.event_date,
          } : undefined,
          scheduledFor: d.scheduledFor,
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
