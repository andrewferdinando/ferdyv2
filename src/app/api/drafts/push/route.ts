import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { processBatchCopyGeneration, type DraftCopyInput } from "@/lib/generateCopyBatch";
import { sendMonthlyDraftsReady } from "@/lib/emails/send";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Request body schema
const pushDraftsSchema = z.object({
  brandId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    console.log('[api/drafts/push] Received request');
    const body = await req.json().catch(() => ({}));

    // Validate input
    const validationResult = pushDraftsSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('[api/drafts/push] Invalid payload:', validationResult.error.issues);
      return NextResponse.json(
        { error: "Invalid payload", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { brandId } = validationResult.data;
    console.log('[api/drafts/push] Called for brandId:', brandId);

    // Debug: Check active schedule_rules before calling RPC
    const { data: activeRules, error: rulesError } = await supabaseAdmin
      .from('schedule_rules')
      .select('id, subcategory_id, frequency, is_active, brand_id')
      .eq('brand_id', brandId)
      .eq('is_active', true);
    
    if (rulesError) {
      console.error('[api/drafts/push] Error fetching schedule_rules:', rulesError);
    } else {
      console.log('[api/drafts/push] Found', activeRules?.length || 0, 'active schedule_rules for brand:', brandId);
      if (activeRules && activeRules.length > 0) {
        console.log('[api/drafts/push] First 3 schedule_rules:', activeRules.slice(0, 3).map(r => ({
          id: r.id,
          subcategory_id: r.subcategory_id,
          frequency: r.frequency
        })));
      }
    }

    // Debug: Check framework targets before calling RPC
    const { data: targetsBefore, error: targetsBeforeError } = await supabaseAdmin.rpc(
      'rpc_framework_targets',
      { p_brand_id: brandId }
    );
    
    if (targetsBeforeError) {
      console.error('[api/drafts/push] Error fetching framework targets:', targetsBeforeError);
    } else {
      console.log('[api/drafts/push] Framework targets returned:', targetsBefore?.length || 0, 'targets');
      if (targetsBefore && targetsBefore.length > 0) {
        // Group by subcategory_id to see which subcategories have targets
        const targetsBySubcategory = (targetsBefore as any[]).reduce((acc, t) => {
          const subId = t.subcategory_id || 'no-subcategory';
          acc[subId] = (acc[subId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('[api/drafts/push] Targets by subcategory:', targetsBySubcategory);
        console.log('[api/drafts/push] First 3 targets:', (targetsBefore as any[]).slice(0, 3).map(t => ({
          scheduled_at: t.scheduled_at,
          subcategory_id: t.subcategory_id,
          frequency: t.frequency
        })));
      }
    }

    // Call the RPC function to create drafts
    console.log(`[api/drafts/push] Calling rpc_push_to_drafts_now for brand ${brandId}`);
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      'rpc_push_to_drafts_now',
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

    // Fetch the newly created drafts (include subcategory_id for asset selection)
    const { data: insertedDrafts, error: fetchError } = await supabaseAdmin
      .from('drafts')
      .select('id, brand_id, scheduled_for, schedule_source, copy, subcategory_id, channel')
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
      .select('id, frequency, subcategory_id, start_date, end_date, url')
      .eq('brand_id', brandId)
      .eq('is_active', true);

    // Fetch subcategories for name/url/description/url_page_summary/default_copy_length
    // Note: frequency_type is NOT in subcategories table - we derive it from rule.frequency
    const subcategoryIds = scheduleRules?.map(r => r.subcategory_id).filter(Boolean) as string[] || [];
    const { data: subcategories, error: subcategoryError } = await supabaseAdmin
      .from('subcategories')
      .select('id, name, url, detail, url_page_summary, subcategory_type, settings, default_copy_length')
      .in('id', subcategoryIds);

    if (subcategoryError) {
      console.error('[push] Subcategory query error:', subcategoryError);
    }

    console.log("[push] Subcategory IDs:", subcategoryIds);
    console.log("[push] Subcategory rows:", JSON.stringify(subcategories, null, 2));
    
    // Log one sample subcategory to verify new fields are present
    if (subcategories && subcategories.length > 0) {
      const sampleSubcategory = subcategories[0];
      console.log("[push] Sample subcategory with new fields:", {
        id: sampleSubcategory.id,
        name: sampleSubcategory.name,
        subcategory_type: sampleSubcategory.subcategory_type || 'unspecified',
        settings: sampleSubcategory.settings || {}
      });
    }

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
      subcategory_id: string | null;
      channel: string | null;
    }

    // Filter drafts that need copy generation
    const draftsNeedingCopy = insertedDrafts.filter((d) => {
      const copy = d.copy;
      return (!copy || copy.trim().length === 0 || copy === 'Post copy coming soon…') && d.scheduled_for !== null;
    });

    // Load post_jobs to find the specific occurrence (schedule_rule) for each draft
    const draftIds = draftsNeedingCopy.map(d => d.id);
    let postJobs: Array<{ id: string; draft_id: string; schedule_rule_id: string | null }> = [];
    
    if (draftIds.length > 0) {
      const { data: postJobsData } = await supabaseAdmin
        .from('post_jobs')
        .select('id, draft_id, schedule_rule_id')
        .in('draft_id', draftIds);
      
      postJobs = postJobsData || [];
    }

    // Build lookup maps to find the specific occurrence for each draft
    type ScheduleRule = {
      id: string;
      frequency: string;
      subcategory_id: string | null;
      start_date: string | null;
      end_date: string | null;
      url: string | null;
    };

    const scheduleRuleById = new Map<string, ScheduleRule>(
      (scheduleRules ?? []).map(r => [r.id, r])
    );

    // Build ruleByDraftId map: draft_id -> schedule_rule
    const ruleByDraftId = new Map<string, ScheduleRule>()
    for (const job of postJobs) {
      if (job.schedule_rule_id) {
        const rule = scheduleRuleById.get(job.schedule_rule_id)
        if (rule) {
          ruleByDraftId.set(job.draft_id, rule)
        }
      }
    }

    // Variation angles for round-robin assignment
    const VARIATION_ANGLES = [
      "Explain what this is and who it's for.",
      "Focus on the key benefits and outcomes.",
      "Highlight what people can expect on the day / during the programme.",
      "Emphasise the experience, atmosphere, and community/networking aspect.",
      "Give a clear 'why now' or urgency angle (without being pushy).",
    ];

    // Group drafts by subcategory_id + schedule_rule_id for variation hint assignment
    const variationIndexByGroup = new Map<string, number>();
    const draftsWithGroupKeys = draftsNeedingCopy
      .filter((d): d is DraftRow => d.scheduled_for !== null)
      .map((d) => {
        const draftTime = new Date(d.scheduled_for!).getTime();
        const target = (targets as FrameworkTarget[] | null)?.find((t) => {
          const targetTime = new Date(t.scheduled_at).getTime();
          return Math.abs(targetTime - draftTime) < 5000; // 5 second tolerance
        });
        const subcategoryId = target?.subcategory_id;
        const ruleFromDraft = ruleByDraftId.get(d.id);
        const rule = ruleFromDraft ?? scheduleRules?.find(r => r.subcategory_id === subcategoryId);
        
        // Build group key: subcategory_id|schedule_rule_id
        const groupKey = `${subcategoryId ?? 'no-sub'}|${rule?.id ?? 'no-rule'}`;
        
        return { draft: d, groupKey, rule, subcategoryId };
      });

    const payload = {
      brandId,
      drafts: draftsWithGroupKeys.map(({ draft: d, groupKey, rule, subcategoryId: subcategoryIdFromGroup }) => {
          // Get variation hint for this draft (round-robin within group)
          const index = variationIndexByGroup.get(groupKey) ?? 0;
          const variation_hint = VARIATION_ANGLES[index % VARIATION_ANGLES.length];
          // Increment for next draft in same group
          variationIndexByGroup.set(groupKey, index + 1);

          const subcategory = subcategoryIdFromGroup ? subcategoriesMap.get(subcategoryIdFromGroup) : null;
          
          // Normalize rule.frequency into frequencyType for AI payload
          // schedule_rules.frequency can be: "daily" | "weekly" | "monthly" | "specific"
          // We map to: "daily" | "weekly" | "monthly" | "date" | "date_range"
          let frequencyType: "daily" | "weekly" | "monthly" | "date" | "date_range";
          
          if (!rule) {
            frequencyType = "monthly"; // Default fallback
          } else if (rule.frequency === "specific") {
            // "specific" frequency means date-based
            // Check if it's a date range (start_date and end_date both set and different)
            if (rule.start_date && rule.end_date) {
              // Compare dates (normalize to date strings to compare just the date part)
              const startDateStr = new Date(rule.start_date).toISOString().split('T')[0];
              const endDateStr = new Date(rule.end_date).toISOString().split('T')[0];
              frequencyType = startDateStr !== endDateStr ? "date_range" : "date";
            } else {
              frequencyType = "date";
            }
          } else {
            // daily / weekly / monthly pass through
            frequencyType = rule.frequency as "daily" | "weekly" | "monthly";
          }

          // Build schedule object based on event vs non-event
          // For events (frequency_type = 'date' or 'date_range'): use rule.start_date/end_date as event dates
          // For non-events (daily/weekly/monthly): no event_date in schedule
          const isEvent = frequencyType === 'date' || frequencyType === 'date_range';
          // Get target for frequency fallback
          const draftTime = new Date(d.scheduled_for!).getTime();
          const target = (targets as FrameworkTarget[] | null)?.find((t) => {
            const targetTime = new Date(t.scheduled_at).getTime();
            return Math.abs(targetTime - draftTime) < 5000; // 5 second tolerance
          });

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

          // Prefer occurrence URL (from schedule_rule.url), then subcategory URL
          const url =
            (rule?.url && rule.url.trim().length > 0 ? rule.url : null) ??
            (subcategory?.url && subcategory.url.trim().length > 0 ? subcategory.url : null) ??
            '';

          const mappedSubcategory = {
            name: subcategory?.name ?? '',
            url,
            description: subcategory?.detail ?? undefined,
            frequency_type: frequencyType,
            url_page_summary: subcategory?.url_page_summary ?? null,
            default_copy_length: subcategory?.default_copy_length ?? "medium",
          };

          // Debug log for copy length
          console.log('[push] Copy length mapping:', {
            draftId: d.id,
            subcategoryId: subcategoryIdFromGroup,
            subcategoryName: subcategory?.name,
            default_copy_length_from_db: subcategory?.default_copy_length,
            mapped_default_copy_length: mappedSubcategory.default_copy_length,
          });

          // Log draft rule + subcategory mapping for debugging
          console.log("[push] Draft rule + subcategory mapping:", JSON.stringify({
            draftId: d.id,
            ruleId: rule?.id ?? null,
            subcategoryId: subcategoryIdFromGroup ?? null,
            ruleSubcategoryId: rule?.subcategory_id ?? null,
            subcategoryFromRule: rule ? { id: rule.subcategory_id, frequency: rule.frequency, start_date: rule.start_date, end_date: rule.end_date } : null,
            subcategoryFromDB: subcategory ? { id: subcategory.id, name: subcategory.name, url: subcategory.url, detail: subcategory.detail } : null,
            subcategoryMapped: mappedSubcategory,
            frequencyType,
            variation_hint,
          }, null, 2));

          // Debug log for URL mapping
          console.log('[push] URL mapping', {
            draftId: d.id,
            scheduleRuleId: rule?.id ?? null,
            ruleUrl: rule?.url ?? null,
            subcategoryUrl: subcategory?.url ?? null,
            finalUrl: url,
          });

          return {
            draftId: d.id,
            subcategory: mappedSubcategory,
            subcategory_type: subcategory?.subcategory_type ?? null,
            subcategory_settings: subcategory?.settings ?? null,
            schedule,
            scheduledFor: d.scheduled_for ?? undefined, // This is when the post is scheduled, NOT the event date
            prompt: `Write copy for this post`,
            variation_hint: variation_hint,
            options: {
              // length is intentionally omitted - will use default_copy_length from subcategory via precedence:
              // payload.length (explicit override) > subcategory.default_copy_length > "medium"
              // emoji is intentionally omitted - defaults to "auto" which follows brand examples
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
        const draftsInput: DraftCopyInput[] = payload.drafts.map(d => {
          // Find subcategoryId from the original draft mapping
          const originalDraftMapping = draftsWithGroupKeys.find(item => item.draft.id === d.draftId);
          const subcategoryId = originalDraftMapping?.subcategoryId ?? null;
          
          return {
            draftId: d.draftId,
            subcategoryId: subcategoryId ?? undefined,
            subcategory: d.subcategory,
            subcategory_type: (d as any).subcategory_type ?? null,
            subcategory_settings: (d as any).subcategory_settings ?? null,
            schedule: d.schedule ? {
              frequency: d.schedule.frequency,
              event_date: d.schedule.event_date,
            } : undefined,
            scheduledFor: d.scheduledFor,
            prompt: d.prompt,
            variation_hint: (d as any).variation_hint ?? null,
            options: d.options,
          };
        });

        const result = await processBatchCopyGeneration(brandId, draftsInput);
        console.log("Copy generation completed:", result);

        // Send email notification to brand admins
        try {
          await notifyDraftsReady(brandId, draftCount);
        } catch (emailError) {
          console.error("Failed to send draft notification emails:", emailError);
          // Don't fail the request if email fails
        }

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

/**
 * Send email notification to brand admins when monthly drafts are ready
 */
async function notifyDraftsReady(brandId: string, draftCount: number) {
  console.log(`[notifyDraftsReady] Sending notifications for brand ${brandId}, ${draftCount} drafts`);
  
  // Get brand details
  const { data: brand, error: brandError } = await supabaseAdmin
    .from('brands')
    .select('name, group_id, status')
    .eq('id', brandId)
    .single();
  
  if (brandError || !brand || brand.status !== 'active') {
    console.error('[notifyDraftsReady] Brand not found or inactive:', brandError);
    return;
  }
  
  // Get admin and editor emails for the brand (both roles can approve drafts)
  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from('brand_memberships')
    .select('user_id, role')
    .eq('brand_id', brandId)
    .in('role', ['admin', 'editor'])
    .eq('status', 'active');
  
  if (membershipsError || !memberships || memberships.length === 0) {
    console.error('[notifyDraftsReady] No active admins/editors found:', membershipsError);
    return;
  }
  
  console.log(`[notifyDraftsReady] Found ${memberships.length} admins/editors`);
  
  // Get user emails from auth
  const adminEmails: string[] = [];
  for (const membership of memberships) {
    try {
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(membership.user_id);
      if (userError) {
        console.error(`[notifyDraftsReady] Error fetching user ${membership.user_id}:`, userError);
        continue;
      }
      if (user?.email) {
        adminEmails.push(user.email);
      }
    } catch (err) {
      console.error(`[notifyDraftsReady] Exception fetching user ${membership.user_id}:`, err);
    }
  }
  
  if (adminEmails.length === 0) {
    console.error('[notifyDraftsReady] No valid email addresses found');
    return;
  }
  
  console.log(`[notifyDraftsReady] Sending to ${adminEmails.length} recipients`);
  
  // Get current month for email
  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Get app URL from environment
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.ferdy.io';
  const approvalLink = `${appUrl}/brands/${brandId}/drafts`;
  
  // Send email to each admin/editor
  for (const email of adminEmails) {
    try {
      await sendMonthlyDraftsReady({
        to: email,
        brandName: brand.name,
        draftCount,
        approvalLink,
        month,
      });
      console.log(`[notifyDraftsReady] Email sent to ${email}`);
    } catch (err) {
      console.error(`[notifyDraftsReady] Failed to send email to ${email}:`, err);
      // Continue sending to other recipients even if one fails
    }
  }
}
