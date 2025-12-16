import { supabaseAdmin } from "@/lib/supabase-server";
import { processBatchCopyGeneration, type DraftCopyInput } from "@/lib/generateCopyBatch";
import { sendMonthlyDraftsReady } from "@/lib/emails/send";

export interface DraftGenerationResult {
  targetsFound: number;
  draftsCreated: number;
  draftsSkipped: number;
  copyGenerationCount: number;
}

/**
 * Generate drafts for a brand within a 30-day window
 * @param brandId - The brand ID to generate drafts for
 * @returns Result summary with counts
 */
export async function generateDraftsForBrand(brandId: string): Promise<DraftGenerationResult> {
  // Calculate 30-day window from now (UTC)
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 30);
  
  const windowStartStr = now.toISOString();
  const windowEndStr = windowEnd.toISOString();
  
  console.log(`[draftGeneration] Looking ahead 30 days for brand ${brandId}:`, {
    start: windowStartStr,
    end: windowEndStr
  });

  // Fetch active schedule_rules for the brand
  const { data: scheduleRules, error: rulesError } = await supabaseAdmin
    .from('schedule_rules')
    .select('id, subcategory_id, channels, brand_id')
    .eq('brand_id', brandId)
    .eq('is_active', true);

  if (rulesError) {
    console.error(`[draftGeneration] Error fetching schedule_rules for brand ${brandId}:`, rulesError);
    throw new Error(`Failed to fetch schedule rules: ${rulesError.message}`);
  }

  if (!scheduleRules || scheduleRules.length === 0) {
    console.log(`[draftGeneration] No active schedule rules found for brand ${brandId}`);
    
    // Still check for existing drafts that need copy generation
    const { data: existingDraftsNeedingCopy } = await supabaseAdmin
      .from('drafts')
      .select('id')
      .eq('brand_id', brandId)
      .eq('schedule_source', 'framework')
      .gte('scheduled_for', windowStartStr)
      .lte('scheduled_for', windowEndStr)
      .or('copy.is.null,copy.eq.Post copy coming soon…');
    
    const copyGenerationCount = (existingDraftsNeedingCopy || []).length;
    
    return {
      targetsFound: 0,
      draftsCreated: 0,
      draftsSkipped: 0,
      copyGenerationCount
    };
  }

  console.log(`[draftGeneration] Found ${scheduleRules.length} active schedule rules for brand ${brandId}`);

  // Fetch framework targets
  const { data: targets, error: targetsError } = await supabaseAdmin.rpc(
    'rpc_framework_targets',
    { p_brand_id: brandId }
  );

  if (targetsError) {
    console.error(`[draftGeneration] Error fetching framework targets for brand ${brandId}:`, targetsError);
    throw new Error(`Failed to fetch framework targets: ${targetsError.message}`);
  }

  if (!targets || targets.length === 0) {
    console.log(`[draftGeneration] No framework targets found for brand ${brandId}`);
    
    // Still check for existing drafts that need copy generation
    const { data: existingDraftsNeedingCopy } = await supabaseAdmin
      .from('drafts')
      .select('id')
      .eq('brand_id', brandId)
      .eq('schedule_source', 'framework')
      .gte('scheduled_for', windowStartStr)
      .lte('scheduled_for', windowEndStr)
      .or('copy.is.null,copy.eq.Post copy coming soon…');
    
    const copyGenerationCount = (existingDraftsNeedingCopy || []).length;
    
    // If there are existing drafts needing copy, trigger copy generation
    if (copyGenerationCount > 0 && existingDraftsNeedingCopy) {
      await triggerCopyGeneration(brandId, existingDraftsNeedingCopy.map(d => d.id), windowStartStr, windowEndStr);
    }
    
    return {
      targetsFound: 0,
      draftsCreated: 0,
      draftsSkipped: 0,
      copyGenerationCount
    };
  }

  // Filter targets within the 30-day window
  const targetsInWindow = (targets as any[]).filter((target: any) => {
    const scheduledAt = new Date(target.scheduled_at);
    return scheduledAt >= now && scheduledAt <= windowEnd;
  });

  console.log(`[draftGeneration] Found ${targetsInWindow.length} targets within 30-day window for brand ${brandId}`);

  // Get brand timezone
  const { data: brand, error: brandError } = await supabaseAdmin
    .from('brands')
    .select('timezone')
    .eq('id', brandId)
    .single();

  if (brandError || !brand) {
    console.error(`[draftGeneration] Error fetching brand ${brandId}:`, brandError);
    throw new Error(`Failed to fetch brand: ${brandError?.message}`);
  }

  const brandTimezone = brand.timezone || 'Pacific/Auckland';
  console.log(`[draftGeneration] Using brand timezone for ${brandId}:`, brandTimezone);

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
        .eq('brand_id', brandId)
        .eq('subcategory_id', target.subcategory_id)
        .eq('scheduled_for', scheduledAtISO)
        .eq('schedule_source', 'framework')
        .maybeSingle();

      if (checkError) {
        console.error(`[draftGeneration] Error checking existing draft for brand ${brandId}:`, checkError);
        continue; // Skip this target on error
      }

      if (existingDraft) {
        console.log(`[draftGeneration] Draft already exists, skipping for brand ${brandId}:`, {
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
            console.log(`[draftGeneration] rpc_pick_asset_for_rule not available for brand ${brandId}, continuing without asset`);
          } else {
            console.warn(`[draftGeneration] Error picking asset for brand ${brandId}:`, assetError);
          }
        } else if (pickedAsset && typeof pickedAsset === 'string') {
          assetId = pickedAsset;
          console.log(`[draftGeneration] Picked asset for brand ${brandId}:`, assetId);
        }
      } catch (error) {
        // Catch any other errors and continue without asset
        console.warn(`[draftGeneration] Exception picking asset for brand ${brandId}:`, error);
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
          brand_id: brandId,
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
        console.error(`[draftGeneration] Error creating draft for brand ${brandId}:`, draftError);
        continue; // Skip this target on error
      }

      console.log(`[draftGeneration] Created draft for brand ${brandId}:`, newDraft.id);
      createdDraftIds.push(newDraft.id);

      // Create post_jobs for each channel
      let firstPostJobId: string | null = null;
      for (const channel of channels) {
        const { data: postJob, error: jobError } = await supabaseAdmin
          .from('post_jobs')
          .insert({
            brand_id: brandId,
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
          console.error(`[draftGeneration] Error creating post_job for brand ${brandId}:`, jobError);
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
      console.error(`[draftGeneration] Error processing target for brand ${brandId}:`, error);
      // Continue with next target
      continue;
    }
  }

  console.log(`[draftGeneration] Summary for brand ${brandId}:`, {
    targetsFound: targetsInWindow.length,
    draftsCreated,
    draftsSkipped
  });

  // Fetch existing drafts that need copy generation within the same 30-day window
  const { data: existingDraftsNeedingCopy, error: existingDraftsError } = await supabaseAdmin
    .from('drafts')
    .select('id')
    .eq('brand_id', brandId)
    .eq('schedule_source', 'framework')
    .gte('scheduled_for', windowStartStr)
    .lte('scheduled_for', windowEndStr)
    .or('copy.is.null,copy.eq.Post copy coming soon…');

  if (existingDraftsError) {
    console.warn(`[draftGeneration] Error fetching existing drafts needing copy for brand ${brandId}:`, existingDraftsError);
  }

  // Combine newly created draft IDs with existing drafts that need copy
  const allDraftIdsForCopy = Array.from(new Set([
    ...createdDraftIds,
    ...(existingDraftsNeedingCopy || []).map(d => d.id)
  ]));

  const copyGenerationCount = allDraftIdsForCopy.length;

  // Trigger copy generation for all drafts (newly created + existing)
  if (allDraftIdsForCopy.length > 0) {
    await triggerCopyGeneration(brandId, allDraftIdsForCopy, windowStartStr, windowEndStr);
  }

  // Send email notification if new drafts were created
  if (draftsCreated > 0) {
    try {
      await notifyDraftsReady(brandId, draftsCreated);
    } catch (emailError) {
      console.error(`[draftGeneration] Failed to send draft notification emails for brand ${brandId}:`, emailError);
      // Don't fail the function if email fails
    }
  }

  return {
    targetsFound: targetsInWindow.length,
    draftsCreated,
    draftsSkipped,
    copyGenerationCount
  };
}

/**
 * Trigger copy generation for a set of draft IDs
 */
async function triggerCopyGeneration(
  brandId: string,
  draftIds: string[],
  windowStartStr: string,
  windowEndStr: string
): Promise<void> {
  try {
    console.log(`[draftGeneration] Triggering copy generation for ${draftIds.length} drafts for brand ${brandId}`);

    // Fetch all drafts with their details
    const { data: allDrafts, error: fetchError } = await supabaseAdmin
      .from('drafts')
      .select('id, brand_id, scheduled_for, schedule_source, copy, subcategory_id, channel')
      .in('id', draftIds);

    if (fetchError || !allDrafts || allDrafts.length === 0) {
      console.warn(`[draftGeneration] Could not fetch drafts for copy generation for brand ${brandId}`);
      return;
    }

    // Fetch schedule rules with full details
    const { data: fullScheduleRules } = await supabaseAdmin
      .from('schedule_rules')
      .select('id, frequency, subcategory_id, start_date, end_date, url')
      .eq('brand_id', brandId)
      .eq('is_active', true);

    // Fetch subcategories
    const subcategoryIds = Array.from(new Set(
      allDrafts.map(d => d.subcategory_id).filter(Boolean) as string[]
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
      .in('draft_id', draftIds);

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
    const draftsInput: DraftCopyInput[] = allDrafts
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
      console.log(`[draftGeneration] Calling processBatchCopyGeneration for ${draftsInput.length} drafts for brand ${brandId}`);
      const copyResult = await processBatchCopyGeneration(brandId, draftsInput);
      console.log(`[draftGeneration] Copy generation completed for brand ${brandId}:`, copyResult);
    } else {
      console.log(`[draftGeneration] No drafts need copy generation for brand ${brandId}`);
    }
  } catch (copyError) {
    console.error(`[draftGeneration] Error during copy generation for brand ${brandId}:`, copyError);
    // Don't throw - allow the function to continue even if copy generation fails
  }
}

/**
 * Send email notification to brand admins and editors when drafts are ready
 */
async function notifyDraftsReady(brandId: string, draftCount: number): Promise<void> {
  console.log(`[draftGeneration] Sending notifications for brand ${brandId}, ${draftCount} drafts`);
  
  // Get brand details
  const { data: brand, error: brandError } = await supabaseAdmin
    .from('brands')
    .select('name, group_id, status')
    .eq('id', brandId)
    .single();
  
  if (brandError || !brand || brand.status !== 'active') {
    console.error(`[draftGeneration] Brand not found or inactive for brand ${brandId}:`, brandError);
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
    console.error(`[draftGeneration] No active admins/editors found for brand ${brandId}:`, membershipsError);
    return;
  }
  
  console.log(`[draftGeneration] Found ${memberships.length} admins/editors for brand ${brandId}`);
  
  // Get user emails from auth
  const adminEmails: string[] = [];
  for (const membership of memberships) {
    try {
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(membership.user_id);
      if (userError) {
        console.error(`[draftGeneration] Error fetching user ${membership.user_id}:`, userError);
        continue;
      }
      if (user?.email) {
        adminEmails.push(user.email);
      }
    } catch (err) {
      console.error(`[draftGeneration] Exception fetching user ${membership.user_id}:`, err);
    }
  }
  
  if (adminEmails.length === 0) {
    console.error(`[draftGeneration] No valid email addresses found for brand ${brandId}`);
    return;
  }
  
  // Deduplicate email addresses (in case user has multiple roles)
  const uniqueEmails = [...new Set(adminEmails)];
  
  console.log(`[draftGeneration] Sending to ${uniqueEmails.length} unique recipients for brand ${brandId} (${adminEmails.length} total memberships)`);
  
  // Get current month for email
  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Get app URL from environment
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.ferdy.io';
  const approvalLink = `${appUrl}/brands/${brandId}/schedule?tab=drafts`;
  
  console.log(`[draftGeneration] Brand ID: ${brandId}`);
  console.log(`[draftGeneration] Approval link: ${approvalLink}`);
  
  // Send email to each unique admin/editor
  for (const email of uniqueEmails) {
    try {
      await sendMonthlyDraftsReady({
        to: email,
        brandName: brand.name,
        draftCount,
        approvalLink,
        month,
      });
      console.log(`[draftGeneration] Email sent to ${email} for brand ${brandId}`);
    } catch (err) {
      console.error(`[draftGeneration] Failed to send email to ${email} for brand ${brandId}:`, err);
      // Continue sending to other recipients even if one fails
    }
  }
}

