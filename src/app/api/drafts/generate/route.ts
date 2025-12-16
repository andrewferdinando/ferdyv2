import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { processBatchCopyGeneration, type DraftCopyInput } from "@/lib/generateCopyBatch";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Request schema - accept brandId from query or body
const generateDraftsSchema = z.object({
  brandId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    console.log('[api/drafts/generate] Received request');
    
    // Try to get brandId from query params first, then body
    const { searchParams } = new URL(req.url);
    const queryBrandId = searchParams.get('brandId');
    
    let body: any = {};
    try {
      body = await req.json().catch(() => ({}));
    } catch {
      // Body might be empty, that's okay
    }

    // Use brandId from query or body
    const brandId = queryBrandId || body.brandId;

    // Validate input
    const validationResult = generateDraftsSchema.safeParse({ brandId });
    if (!validationResult.success) {
      console.error('[api/drafts/generate] Invalid payload:', validationResult.error.issues);
      return NextResponse.json(
        { error: "Invalid payload", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { brandId: validatedBrandId } = validationResult.data;
    console.log('[api/drafts/generate] Called for brandId:', validatedBrandId);

    // Calculate 30-day window from now (UTC)
    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + 30);
    
    const windowStartStr = now.toISOString();
    const windowEndStr = windowEnd.toISOString();
    
    console.log('[api/drafts/generate] Looking ahead 30 days:', {
      start: windowStartStr,
      end: windowEndStr
    });

    // Fetch active schedule_rules for the brand
    const { data: scheduleRules, error: rulesError } = await supabaseAdmin
      .from('schedule_rules')
      .select('id, subcategory_id, channels, brand_id')
      .eq('brand_id', validatedBrandId)
      .eq('is_active', true);

    if (rulesError) {
      console.error('[api/drafts/generate] Error fetching schedule_rules:', rulesError);
      return NextResponse.json(
        { error: "Failed to fetch schedule rules", details: rulesError.message },
        { status: 500 }
      );
    }

    if (!scheduleRules || scheduleRules.length === 0) {
      console.log('[api/drafts/generate] No active schedule rules found');
      return NextResponse.json({
        targetsFound: 0,
        draftsCreated: 0,
        draftsSkipped: 0
      });
    }

    console.log('[api/drafts/generate] Found', scheduleRules.length, 'active schedule rules');

    // Fetch framework targets
    const { data: targets, error: targetsError } = await supabaseAdmin.rpc(
      'rpc_framework_targets',
      { p_brand_id: validatedBrandId }
    );

    if (targetsError) {
      console.error('[api/drafts/generate] Error fetching framework targets:', targetsError);
      return NextResponse.json(
        { error: "Failed to fetch framework targets", details: targetsError.message },
        { status: 500 }
      );
    }

    if (!targets || targets.length === 0) {
      console.log('[api/drafts/generate] No framework targets found');
      return NextResponse.json({
        targetsFound: 0,
        draftsCreated: 0,
        draftsSkipped: 0
      });
    }

    // Filter targets within the 30-day window
    const targetsInWindow = (targets as any[]).filter((target: any) => {
      const scheduledAt = new Date(target.scheduled_at);
      return scheduledAt >= now && scheduledAt <= windowEnd;
    });

    console.log('[api/drafts/generate] Found', targetsInWindow.length, 'targets within 30-day window');

    // Get brand timezone
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('timezone')
      .eq('id', validatedBrandId)
      .single();

    if (brandError || !brand) {
      console.error('[api/drafts/generate] Error fetching brand:', brandError);
      return NextResponse.json(
        { error: "Failed to fetch brand", details: brandError?.message },
        { status: 500 }
      );
    }

    const brandTimezone = brand.timezone || 'Pacific/Auckland';
    console.log('[api/drafts/generate] Using brand timezone:', brandTimezone);

    // Build a map of schedule_rule_id -> channels for quick lookup
    const ruleChannelsMap = new Map<string, string[]>();
    for (const rule of scheduleRules) {
      if (rule.channels && Array.isArray(rule.channels) && rule.channels.length > 0) {
        // Normalize channels (instagram -> instagram_feed, linkedin -> linkedin_profile)
        const normalizedChannels = rule.channels.map((ch: string) => {
          if (ch === 'instagram') return 'instagram_feed';
          if (ch === 'linkedin') return 'linkedin_profile';
          return ch;
        });
        ruleChannelsMap.set(rule.id, normalizedChannels);
      } else {
        // Default to instagram_feed if no channels specified
        ruleChannelsMap.set(rule.id, ['instagram_feed']);
      }
    }

    let draftsCreated = 0;
    let draftsSkipped = 0;
    const createdDraftIds: string[] = []; // Track created draft IDs for copy generation

    // Process each target
    for (const target of targetsInWindow) {
      try {
        const scheduledAt = new Date(target.scheduled_at);
        const scheduledAtISO = scheduledAt.toISOString();
        
        // Check if draft already exists
        const { data: existingDraft, error: checkError } = await supabaseAdmin
          .from('drafts')
          .select('id')
          .eq('brand_id', validatedBrandId)
          .eq('subcategory_id', target.subcategory_id)
          .eq('scheduled_for', scheduledAtISO)
          .eq('schedule_source', 'framework')
          .maybeSingle();

        if (checkError) {
          console.error('[api/drafts/generate] Error checking existing draft:', checkError);
          continue; // Skip this target on error
        }

        if (existingDraft) {
          console.log('[api/drafts/generate] Draft already exists, skipping:', {
            subcategory_id: target.subcategory_id,
            scheduled_for: scheduledAtISO
          });
          draftsSkipped++;
          continue;
        }

        // Get channels for this schedule rule
        const channels = ruleChannelsMap.get(target.schedule_rule_id) || ['instagram_feed'];
        const firstChannel = channels[0];

        // Attempt to pick an asset for this schedule rule
        let assetId: string | null = null;
        try {
          const { data: pickedAsset, error: assetError } = await supabaseAdmin.rpc(
            'rpc_pick_asset_for_rule',
            { p_schedule_rule_id: target.schedule_rule_id }
          );
          
          if (assetError) {
            // If function doesn't exist or other error, continue without asset
            if (assetError.code === '42883' || assetError.message?.includes('does not exist')) {
              console.log('[api/drafts/generate] rpc_pick_asset_for_rule not available, continuing without asset');
            } else {
              console.warn('[api/drafts/generate] Error picking asset:', assetError);
            }
          } else if (pickedAsset && typeof pickedAsset === 'string') {
            assetId = pickedAsset;
            console.log('[api/drafts/generate] Picked asset:', assetId);
          }
        } catch (error) {
          // Catch any other errors and continue without asset
          console.warn('[api/drafts/generate] Exception picking asset:', error);
        }

        // Calculate target_month (first day of the month)
        const targetMonth = new Date(scheduledAt);
        targetMonth.setDate(1);
        targetMonth.setHours(0, 0, 0, 0);
        const targetMonthStr = targetMonth.toISOString().split('T')[0];

        // Calculate scheduled_local (convert UTC to brand timezone)
        // Format: YYYY-MM-DDTHH:mm:ss in the brand's timezone
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: brandTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        const parts = formatter.formatToParts(scheduledAt);
        const year = parts.find(p => p.type === 'year')!.value;
        const month = parts.find(p => p.type === 'month')!.value;
        const day = parts.find(p => p.type === 'day')!.value;
        const hour = parts.find(p => p.type === 'hour')!.value;
        const minute = parts.find(p => p.type === 'minute')!.value;
        const second = parts.find(p => p.type === 'second')!.value;
        const scheduledLocal = `${year}-${month}-${day}T${hour}:${minute}:${second}`;

        // Create draft
        const { data: newDraft, error: draftError } = await supabaseAdmin
          .from('drafts')
          .insert({
            brand_id: validatedBrandId,
            post_job_id: null, // Will be set after creating post_jobs
            channel: firstChannel,
            scheduled_for: scheduledAtISO,
            scheduled_for_nzt: (() => {
              const nztFormatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Pacific/Auckland',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              });
              const nztParts = nztFormatter.formatToParts(scheduledAt);
              const nztYear = nztParts.find(p => p.type === 'year')!.value;
              const nztMonth = nztParts.find(p => p.type === 'month')!.value;
              const nztDay = nztParts.find(p => p.type === 'day')!.value;
              const nztHour = nztParts.find(p => p.type === 'hour')!.value;
              const nztMinute = nztParts.find(p => p.type === 'minute')!.value;
              const nztSecond = nztParts.find(p => p.type === 'second')!.value;
              return `${nztYear}-${nztMonth}-${nztDay}T${nztHour}:${nztMinute}:${nztSecond}`;
            })(),
            schedule_source: 'framework',
            publish_status: 'draft',
            approved: false,
            subcategory_id: target.subcategory_id,
            asset_ids: assetId ? [assetId] : []
          })
          .select()
          .single();

        if (draftError) {
          console.error('[api/drafts/generate] Error creating draft:', draftError);
          continue; // Skip this target on error
        }

        console.log('[api/drafts/generate] Created draft:', newDraft.id);
        createdDraftIds.push(newDraft.id);

        // Create post_jobs for each channel
        let firstPostJobId: string | null = null;
        for (const channel of channels) {
          const { data: postJob, error: jobError } = await supabaseAdmin
            .from('post_jobs')
            .insert({
              brand_id: validatedBrandId,
              schedule_rule_id: target.schedule_rule_id,
              draft_id: newDraft.id,
              channel: channel,
              target_month: targetMonthStr,
              scheduled_at: scheduledAtISO,
              scheduled_local: scheduledLocal,
              scheduled_tz: brandTimezone,
              status: 'pending'
            })
            .select()
            .single();

          if (jobError) {
            console.error('[api/drafts/generate] Error creating post_job:', jobError);
            // Continue with other channels even if one fails
            continue;
          }

          if (!firstPostJobId) {
            firstPostJobId = postJob.id;
          }
        }

        // Update draft with first post_job_id
        if (firstPostJobId) {
          await supabaseAdmin
            .from('drafts')
            .update({ post_job_id: firstPostJobId })
            .eq('id', newDraft.id);
        }

        draftsCreated++;

      } catch (error) {
        console.error('[api/drafts/generate] Error processing target:', error);
        // Continue with next target
        continue;
      }
    }

    console.log('[api/drafts/generate] Summary:', {
      targetsFound: targetsInWindow.length,
      draftsCreated,
      draftsSkipped
    });

    // Trigger copy generation for newly-created drafts
    if (createdDraftIds.length > 0) {
      try {
        console.log('[api/drafts/generate] Triggering copy generation for', createdDraftIds.length, 'drafts');

        // Fetch the created drafts with their details
        const { data: createdDrafts, error: fetchError } = await supabaseAdmin
          .from('drafts')
          .select('id, brand_id, scheduled_for, schedule_source, copy, subcategory_id, channel')
          .in('id', createdDraftIds);

        if (fetchError || !createdDrafts || createdDrafts.length === 0) {
          console.warn('[api/drafts/generate] Could not fetch created drafts for copy generation');
        } else {
          // Fetch schedule rules with full details
          const { data: fullScheduleRules } = await supabaseAdmin
            .from('schedule_rules')
            .select('id, frequency, subcategory_id, start_date, end_date, url')
            .eq('brand_id', validatedBrandId)
            .eq('is_active', true);

          // Fetch subcategories
          const subcategoryIds = Array.from(new Set(
            createdDrafts.map(d => d.subcategory_id).filter(Boolean) as string[]
          ));
          
          const { data: subcategories } = await supabaseAdmin
            .from('subcategories')
            .select('id, name, url, detail, url_page_summary, subcategory_type, settings, default_copy_length, default_hashtags')
            .in('id', subcategoryIds);

          const subcategoriesMap = new Map(
            (subcategories || []).map(sc => [sc.id, sc])
          );

          // Build lookup maps
          const scheduleRuleById = new Map(
            (fullScheduleRules || []).map(r => [r.id, r])
          );

          // Build ruleByDraftId map via post_jobs
          const { data: postJobs } = await supabaseAdmin
            .from('post_jobs')
            .select('draft_id, schedule_rule_id')
            .in('draft_id', createdDraftIds);

          const ruleByDraftId = new Map<string, any>();
          for (const job of postJobs || []) {
            if (job.schedule_rule_id) {
              const rule = scheduleRuleById.get(job.schedule_rule_id);
              if (rule) {
                ruleByDraftId.set(job.draft_id, rule);
              }
            }
          }

          // Build DraftCopyInput[] array
          const draftsInput: DraftCopyInput[] = createdDrafts
            .filter(d => !d.copy || d.copy.trim().length === 0 || d.copy === 'Post copy coming soon…')
            .map(d => {
              const rule = ruleByDraftId.get(d.id);
              const subcategory = d.subcategory_id ? subcategoriesMap.get(d.subcategory_id) : null;

              // Normalize rule.frequency into frequencyType
              let frequencyType: "daily" | "weekly" | "monthly" | "date" | "date_range";
              if (!rule) {
                frequencyType = "monthly";
              } else if (rule.frequency === "specific") {
                if (rule.start_date && rule.end_date) {
                  const startDateStr = new Date(rule.start_date).toISOString().split('T')[0];
                  const endDateStr = new Date(rule.end_date).toISOString().split('T')[0];
                  frequencyType = startDateStr !== endDateStr ? "date_range" : "date";
                } else {
                  frequencyType = "date";
                }
              } else {
                frequencyType = rule.frequency as "daily" | "weekly" | "monthly";
              }

              // Build schedule object
              const isEvent = frequencyType === 'date' || frequencyType === 'date_range';
              let schedule: { frequency: string; event_date?: string; start_date?: string; end_date?: string } = {
                frequency: rule?.frequency ?? "weekly",
              };

              if (isEvent && rule) {
                if (frequencyType === 'date_range' && rule.start_date && rule.end_date) {
                  schedule.start_date = new Date(rule.start_date).toISOString().split('T')[0];
                  schedule.end_date = new Date(rule.end_date).toISOString().split('T')[0];
                } else if (rule.start_date) {
                  schedule.event_date = new Date(rule.start_date).toISOString().split('T')[0];
                }
              }

              // Prefer occurrence URL (from schedule_rule.url), then subcategory URL
              const url =
                (rule?.url && rule.url.trim().length > 0 ? rule.url : null) ??
                (subcategory?.url && subcategory.url.trim().length > 0 ? subcategory.url : null) ??
                '';

              return {
                draftId: d.id,
                subcategoryId: d.subcategory_id ?? undefined,
                subcategory: subcategory ? {
                  name: subcategory.name ?? '',
                  url,
                  description: subcategory.detail ?? undefined,
                  frequency_type: frequencyType,
                  url_page_summary: subcategory.url_page_summary ?? null,
                  default_copy_length: subcategory.default_copy_length ?? "medium",
                } : undefined,
                subcategory_type: subcategory?.subcategory_type ?? null,
                subcategory_settings: subcategory?.settings ?? null,
                schedule,
                scheduledFor: d.scheduled_for ?? undefined,
                prompt: `Write copy for this post`,
                options: {
                  hashtags: { mode: "auto" as const },
                },
              };
            });

          // Call copy generation if there are drafts needing copy
          if (draftsInput.length > 0) {
            console.log('[api/drafts/generate] Calling processBatchCopyGeneration for', draftsInput.length, 'drafts');
            const copyResult = await processBatchCopyGeneration(validatedBrandId, draftsInput);
            console.log('[api/drafts/generate] Copy generation completed:', copyResult);
          } else {
            console.log('[api/drafts/generate] No drafts need copy generation');
          }
        }
      } catch (copyError) {
        console.error('[api/drafts/generate] Error during copy generation:', copyError);
        // Don't fail the request if copy generation fails - drafts were still created
      }
    }

    return NextResponse.json({
      targetsFound: targetsInWindow.length,
      draftsCreated,
      draftsSkipped
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error('[api/drafts/generate] Unexpected error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

