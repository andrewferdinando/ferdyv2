/**
 * DRAFT GENERATION - SINGLE SOURCE OF TRUTH
 * 
 * This is the single source of truth for draft creation in Ferdy.
 * All draft generation flows through this utility function.
 * 
 * BEHAVIORAL ASSUMPTIONS (LOCKED):
 * 
 * 1. Rolling 30-day window: Drafts are generated on a rolling 30-day window from now (UTC).
 *    The window is recalculated on each run, ensuring continuous coverage.
 * 
 * 2. Drafts may be created with:
 *    - No images (asset_ids may be empty array)
 *    - Placeholder copy ("Post copy coming soon…") until copy generation completes
 * 
 * 3. Copy generation is automatic and non-optional:
 *    - Copy is generated automatically for all new drafts
 *    - Existing drafts with null or placeholder copy are also processed
 *    - There is no "regenerate copy" concept - copy is generated once per draft
 * 
 * 4. Draft state:
 *    - Drafts are always created with approved=false (publish_status='draft')
 *    - Approval is the ONLY user action required before scheduling
 *    - No other manual steps are needed
 * 
 * 5. Inputs are minimal and final:
 *    - Only brandId is required
 *    - No date overrides or user options
 *    - No feature flags or branching logic
 * 
 * 6. No legacy concepts:
 *    - No monthly pushes
 *    - No manual generation steps
 *    - No regeneration flows
 *    - No draft creation from UI actions
 * 
 * This generator runs automatically via:
 * - Nightly cron job (/api/drafts/generate-all) for all active brands
 * - Manual API call (/api/drafts/generate) for a specific brand
 */

import { supabaseAdmin } from "@/lib/supabase-server";
import { processBatchCopyGeneration, type DraftCopyInput } from "@/lib/generateCopyBatch";

export interface DraftGenerationResult {
  targetsFound: number;
  draftsCreated: number;
  draftsSkipped: number;
  copyGenerationCount: number;
  /** Per-target outcomes for diagnostics (only populated when there are issues) */
  errors: string[];
  skippedTargets: Array<{ subcategory_id: string; scheduled_at: string; reason: string }>;
}

/**
 * Generate drafts for a brand within a 30-day window
 * 
 * EXPLICIT SCHEDULE RULE RESOLUTION:
 * - For every target, explicitly fetch schedule rule using: brand_id + subcategory_id + is_active = true
 * - NO reliance on target.schedule_rule_id
 * - Draft is only created AFTER schedule rule is resolved
 * 
 * HARD GUARDS (prevent silent failures):
 * - If no schedule rule found: log error and skip target (NO DEFAULTS)
 * - If schedule_rule.channels.length === 0: log error and skip target (NO DEFAULTS)
 * - Draft must have ≥1 post_job created
 * - All post_jobs must have schedule_rule_id set (never null)
 * - Regression check: N channels must result in exactly N post_jobs
 * 
 * @param brandId - The brand ID to generate drafts for (only input required)
 * @returns Result summary with counts
 */
export async function generateDraftsForBrand(brandId: string): Promise<DraftGenerationResult> {
  // Calculate rolling 30-day window from now (UTC)
  // This window is recalculated on each run - no date overrides or user options
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
      copyGenerationCount,
      errors: [],
      skippedTargets: [],
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
      copyGenerationCount,
      errors: [],
      skippedTargets: [],
    };
  }

  // Filter targets within the 30-day window
  const targetsInWindow = (targets as any[]).filter((target: any) => {
    const scheduledAt = new Date(target.scheduled_at);
    return scheduledAt >= now && scheduledAt <= windowEnd;
  });

  console.log(`[draftGeneration] Found ${targetsInWindow.length} targets within 30-day window for brand ${brandId}`);

  // Fetch subcategory names for meaningful logging
  const targetSubcategoryIds = [...new Set(targetsInWindow.map((t: any) => t.subcategory_id).filter(Boolean))];
  const subcategoryNameMap: Record<string, string> = {};
  if (targetSubcategoryIds.length > 0) {
    const { data: subcats } = await supabaseAdmin
      .from('subcategories')
      .select('id, name')
      .in('id', targetSubcategoryIds);
    if (subcats) {
      for (const sc of subcats) subcategoryNameMap[sc.id] = sc.name;
    }
  }

  // Log all targets the generator will attempt to process
  for (const t of targetsInWindow) {
    const name = subcategoryNameMap[t.subcategory_id] || t.subcategory_id;
    console.log(`[draftGeneration] Target: ${name} (${t.frequency}) at ${t.scheduled_at} [subcategory=${t.subcategory_id}]`);
  }

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

  // Helper function to normalize channels (NO DEFAULTS - returns empty array if invalid)
  function normalizeChannels(channels: string[] | null | undefined): string[] {
    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return []; // Return empty array - caller must handle this
    }
    return channels.map((ch: string) => {
      if (ch === 'instagram') return 'instagram_feed';
      if (ch === 'linkedin') return 'linkedin_profile';
      return ch;
    });
  }

  let draftsCreated = 0;
  let draftsSkipped = 0;
  const createdDraftIds: string[] = []; // Track created draft IDs for copy generation
  const generationErrors: string[] = [];
  const skippedTargets: Array<{ subcategory_id: string; scheduled_at: string; reason: string }> = [];

  // Track selected assets per schedule_rule_id to ensure rotation within a single generation run
  // Map: schedule_rule_id -> Set of asset_ids already selected in this run
  const selectedAssetsByRuleId = new Map<string, Set<string>>();

  // Process each target
  for (const target of targetsInWindow) {
    const targetName = subcategoryNameMap[target.subcategory_id] || target.subcategory_id;
    try {
      const scheduledAt = new Date(target.scheduled_at);
      const scheduledAtISO = scheduledAt.toISOString();

      console.log(`[draftGeneration] Processing: ${targetName} at ${scheduledAtISO}`);
      
      // Check if an active (non-published, non-deleted) framework draft already exists.
      // Published/deleted drafts are ignored so the generator creates replacements
      // (e.g. when a draft is published early or deleted from the calendar).
      const { data: existingDraft, error: checkError } = await supabaseAdmin
        .from('drafts')
        .select('id')
        .eq('brand_id', brandId)
        .eq('subcategory_id', target.subcategory_id)
        .eq('scheduled_for', scheduledAtISO)
        .eq('schedule_source', 'framework')
        .not('status', 'in', '("published","partially_published","deleted")')
        .maybeSingle();

      if (checkError) {
        const reason = `Dedup check error: ${checkError.message}`;
        console.error(`[draftGeneration] SKIP ${targetName}: ${reason}`);
        generationErrors.push(`${targetName} at ${scheduledAtISO}: ${reason}`);
        skippedTargets.push({ subcategory_id: target.subcategory_id, scheduled_at: scheduledAtISO, reason });
        continue;
      }

      if (existingDraft) {
        console.log(`[draftGeneration] SKIP ${targetName}: Draft already exists (${existingDraft.id}) at ${scheduledAtISO}`);
        draftsSkipped++;
        continue;
      }

      // EXPLICIT SCHEDULE RULE RESOLUTION
      // For every target, fetch schedule rule using: brand_id + subcategory_id + is_active = true
      // REMOVED: Any reliance on target.schedule_rule_id
      if (!target.subcategory_id) {
        const reason = 'No subcategory_id on target';
        console.error(`[draftGeneration] SKIP ${targetName}: ${reason}`);
        generationErrors.push(`${targetName} at ${scheduledAtISO}: ${reason}`);
        skippedTargets.push({ subcategory_id: target.subcategory_id, scheduled_at: scheduledAtISO, reason });
        continue;
      }

      // Explicitly fetch schedule rule for this target
      // NOTE: Using .maybeSingle() assumes only one active schedule rule per subcategory
      // For subcategories with multiple active rules (e.g., weekly + specific dates),
      // we take the first one found. In practice, most subcategories have one active rule.
      const { data: scheduleRule, error: ruleError } = await supabaseAdmin
        .from('schedule_rules')
        .select('id, channels')
        .eq('brand_id', brandId)
        .eq('subcategory_id', target.subcategory_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }) // Prefer most recently created rule
        .limit(1)
        .maybeSingle();

      // HARD GUARD: If no schedule rule found, skip this target (NO DEFAULTS)
      if (ruleError) {
        const reason = `Error fetching schedule_rule: ${ruleError.message}`;
        console.error(`[draftGeneration] SKIP ${targetName}: ${reason}`);
        generationErrors.push(`${targetName} at ${scheduledAtISO}: ${reason}`);
        skippedTargets.push({ subcategory_id: target.subcategory_id, scheduled_at: scheduledAtISO, reason });
        continue;
      }

      if (!scheduleRule || !scheduleRule.id) {
        const reason = 'No active schedule_rule found for this subcategory';
        console.error(`[draftGeneration] SKIP ${targetName}: ${reason}`);
        generationErrors.push(`${targetName} at ${scheduledAtISO}: ${reason}`);
        skippedTargets.push({ subcategory_id: target.subcategory_id, scheduled_at: scheduledAtISO, reason });
        continue;
      }

      const scheduleRuleId = scheduleRule.id;

      // HARD GUARD: If schedule_rule.channels.length === 0, skip with error
      if (!scheduleRule.channels || !Array.isArray(scheduleRule.channels) || scheduleRule.channels.length === 0) {
        const reason = `Schedule rule ${scheduleRuleId} has no channels`;
        console.error(`[draftGeneration] SKIP ${targetName}: ${reason}`);
        generationErrors.push(`${targetName} at ${scheduledAtISO}: ${reason}`);
        skippedTargets.push({ subcategory_id: target.subcategory_id, scheduled_at: scheduledAtISO, reason });
        continue;
      }

      // Get channels from the schedule rule (normalized) - schedule_rule.channels is single source of truth
      const channels = normalizeChannels(scheduleRule.channels);

      // HARD GUARD: If normalized channels are empty, skip this target (NO DEFAULTS)
      if (!channels || channels.length === 0) {
        const reason = `Normalized channels are empty (raw: ${JSON.stringify(scheduleRule.channels)})`;
        console.error(`[draftGeneration] SKIP ${targetName}: ${reason}`);
        generationErrors.push(`${targetName} at ${scheduledAtISO}: ${reason}`);
        skippedTargets.push({ subcategory_id: target.subcategory_id, scheduled_at: scheduledAtISO, reason });
        continue;
      }

      const firstChannel = channels[0];
      const finalScheduleRuleId = scheduleRuleId;

      // Attempt to pick an asset for this schedule rule
      // NOTE: Drafts may be created with no images (asset_ids = []) - this is intentional and acceptable
      // Asset selection is best-effort; if it fails or no asset is available, draft is still created
      // CRITICAL: Only use assets that are tagged with this subcategory's tag
      // ROTATION: Track selected assets per schedule_rule_id to ensure variety within a single generation run
      let assetId: string | null = null;
      if (finalScheduleRuleId) {
        try {
          // Get the subcategory's tag first (needed for verification and rotation)
          const { data: tags } = await supabaseAdmin
            .from('tags')
            .select('id')
            .eq('subcategory_id', target.subcategory_id)
            .limit(1);
          
          if (tags && tags.length > 0) {
            const tagId = tags[0].id;
            
            // Get all available assets for this subcategory (for rotation fallback)
            const { data: allAssetTags } = await supabaseAdmin
              .from('asset_tags')
              .select('asset_id')
              .eq('tag_id', tagId);
            
            const availableAssetIds = allAssetTags?.map((at: any) => at.asset_id) || [];
            
            if (availableAssetIds.length === 0) {
              console.log(`[draftGeneration] No assets available for subcategory ${target.subcategory_id}, continuing without asset`);
            } else {
              // PERSISTENT ROTATION: Query historical drafts to find least recently used asset
              // This ensures rotation persists across generation runs, not just within a single run
              const { data: historicalDrafts } = await supabaseAdmin
                .from('drafts')
                .select('asset_ids, created_at')
                .eq('brand_id', brandId)
                .eq('subcategory_id', target.subcategory_id)
                .eq('schedule_source', 'framework')
                .not('asset_ids', 'is', null)
                .order('created_at', { ascending: false })
                .limit(100); // Look at last 100 drafts for usage history
              
              // Build a map of asset_id -> last_used_at timestamp
              const assetLastUsed = new Map<string, Date>();
              
              // Also track assets used in this current run
              const previouslySelectedInRun = selectedAssetsByRuleId.get(finalScheduleRuleId) || new Set<string>();
              
              // Process historical drafts to find when each asset was last used
              if (historicalDrafts) {
                for (const draft of historicalDrafts) {
                  if (draft.asset_ids && Array.isArray(draft.asset_ids) && draft.asset_ids.length > 0) {
                    const draftAssetId = draft.asset_ids[0]; // Use first asset from draft
                    const draftDate = new Date(draft.created_at);
                    
                    // Only track if this asset is in our available list
                    if (availableAssetIds.includes(draftAssetId)) {
                      // Update last_used_at if this is more recent
                      const existing = assetLastUsed.get(draftAssetId);
                      if (!existing || draftDate > existing) {
                        assetLastUsed.set(draftAssetId, draftDate);
                      }
                    }
                  }
                }
              }
              
              // Find the next asset to use based on rotation logic:
              // 1. Prioritize assets NOT used in this run
              // 2. Among those, pick the one used least recently (or never used)
              // 3. If all assets were used in this run, pick the least recently used overall
              
              let candidateAssets: string[] = [];
              
              // First, try to find assets not used in this run
              const unusedInRun = availableAssetIds.filter(id => !previouslySelectedInRun.has(id));
              
              if (unusedInRun.length > 0) {
                // Among unused assets, find the least recently used (or never used)
                candidateAssets = unusedInRun.sort((a, b) => {
                  const aLastUsed = assetLastUsed.get(a);
                  const bLastUsed = assetLastUsed.get(b);
                  
                  // Never used assets come first
                  if (!aLastUsed && !bLastUsed) return 0;
                  if (!aLastUsed) return -1;
                  if (!bLastUsed) return 1;
                  
                  // Older last_used_at comes first (least recently used)
                  return aLastUsed.getTime() - bLastUsed.getTime();
                });
              } else {
                // All assets were used in this run - pick the least recently used overall
                candidateAssets = availableAssetIds.sort((a, b) => {
                  const aLastUsed = assetLastUsed.get(a);
                  const bLastUsed = assetLastUsed.get(b);
                  
                  // Never used assets come first
                  if (!aLastUsed && !bLastUsed) return 0;
                  if (!aLastUsed) return -1;
                  if (!bLastUsed) return 1;
                  
                  // Older last_used_at comes first (least recently used)
                  return aLastUsed.getTime() - bLastUsed.getTime();
                });
              }
              
              // Use the first candidate (least recently used)
              if (candidateAssets.length > 0) {
                assetId = candidateAssets[0];
                
                // Track this selection for this run
                if (!selectedAssetsByRuleId.has(finalScheduleRuleId)) {
                  selectedAssetsByRuleId.set(finalScheduleRuleId, new Set());
                }
                selectedAssetsByRuleId.get(finalScheduleRuleId)!.add(assetId);
                
                const lastUsed = assetLastUsed.get(assetId);
                console.log(`[draftGeneration] Picked asset ${assetId} for brand ${brandId}, subcategory ${target.subcategory_id}, tag ${tagId}${lastUsed ? ` (last used: ${lastUsed.toISOString()})` : ' (never used before)'}`);
              } else {
                console.warn(`[draftGeneration] No candidate assets found for subcategory ${target.subcategory_id}`);
              }
            }
          } else {
            // No tag found for subcategory - can't verify, so don't use any asset
            console.warn(`[draftGeneration] No tag found for subcategory ${target.subcategory_id}, skipping asset selection`);
          }
        } catch (error) {
          // Catch any other errors and continue without asset
          // Draft creation proceeds regardless of asset selection success
          console.warn(`[draftGeneration] Exception picking asset for brand ${brandId}:`, error);
        }
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
      // NOTE: Drafts are ALWAYS created with:
      // - approved=false (user must approve before scheduling)
      // - publish_status='draft' (not pending)
      // - copy may be null or "Post copy coming soon…" until copy generation completes
      // - asset_ids may be empty array if no asset is available
      // Approval is the ONLY user action required before scheduling
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
          publish_status: 'draft', // Always 'draft', never 'pending'
          approved: false, // User must approve before scheduling
          subcategory_id: target.subcategory_id,
          asset_ids: assetId ? [assetId] : [] // May be empty - this is acceptable
        })
        .select()
        .single();

      if (draftError) {
        const reason = `Error creating draft: ${draftError.message}`;
        console.error(`[draftGeneration] FAIL ${targetName}: ${reason}`);
        generationErrors.push(`${targetName} at ${scheduledAtISO}: ${reason}`);
        skippedTargets.push({ subcategory_id: target.subcategory_id, scheduled_at: scheduledAtISO, reason });
        continue;
      }

      console.log(`[draftGeneration] CREATED ${targetName} at ${scheduledAtISO} → draft ${newDraft.id} with ${channels.length} channels`);
      createdDraftIds.push(newDraft.id);

      // Create post_jobs for each channel (one per channel from the schedule rule)
      // REGRESSION CHECK: N channels must result in exactly N post_jobs
      const expectedPostJobCount = channels.length;
      const createdPostJobIds: string[] = [];
      let firstPostJobId: string | null = null;

      for (const channel of channels) {
        // HARD GUARD: schedule_rule_id must never be null
        if (!finalScheduleRuleId) {
          console.error(`[draftGeneration] FATAL: finalScheduleRuleId is null for channel ${channel}`, {
            brand_id: brandId,
            draft_id: newDraft.id,
            channel,
            schedule_rule_id: finalScheduleRuleId
          });
          // Delete the draft if we can't create post_jobs correctly
          await supabaseAdmin.from('drafts').delete().eq('id', newDraft.id);
          throw new Error(`Cannot create post_job: schedule_rule_id is null for draft ${newDraft.id}`);
        }

        const { data: postJob, error: jobError } = await supabaseAdmin
          .from('post_jobs')
          .insert({
            brand_id: brandId,
            schedule_rule_id: finalScheduleRuleId, // ALWAYS set - never null
            draft_id: newDraft.id,
            channel: channel, // One post_job per channel
            target_month: targetMonthStr,
            scheduled_at: scheduledAtISO,
            scheduled_local: scheduledLocal,
            scheduled_tz: brandTimezone,
            status: 'pending'
          })
          .select()
          .single();

        if (jobError) {
          console.error(`[draftGeneration] Error creating post_job for brand ${brandId}, channel ${channel}:`, jobError);
          // Delete the draft if we can't create all post_jobs
          await supabaseAdmin.from('drafts').delete().eq('id', newDraft.id);
          throw new Error(`Failed to create post_job for channel ${channel}: ${jobError.message}`);
        }

        // Verify schedule_rule_id is set
        if (!postJob.schedule_rule_id) {
          console.error(`[draftGeneration] FATAL: post_job created with null schedule_rule_id`, {
            post_job_id: postJob.id,
            draft_id: newDraft.id,
            channel
          });
          // Delete the problematic post_job and draft
          await supabaseAdmin.from('post_jobs').delete().eq('id', postJob.id);
          await supabaseAdmin.from('drafts').delete().eq('id', newDraft.id);
          throw new Error(`Post job created with null schedule_rule_id: ${postJob.id}`);
        }

        console.log(`[draftGeneration] Created post_job for brand ${brandId}, channel ${channel}, schedule_rule_id ${postJob.schedule_rule_id}`);
        createdPostJobIds.push(postJob.id);

        if (!firstPostJobId) {
          firstPostJobId = postJob.id;
        }
      }

      // HARD GUARD: Draft must have ≥1 post_job and none with null schedule_rule_id
      if (createdPostJobIds.length === 0) {
        console.error(`[draftGeneration] FATAL: Draft created but no post_jobs were created`, {
          draft_id: newDraft.id,
          expected_count: expectedPostJobCount,
          channels
        });
        // Delete the draft if no post_jobs were created
        await supabaseAdmin.from('drafts').delete().eq('id', newDraft.id);
        throw new Error(`Draft ${newDraft.id} created but no post_jobs were created`);
      }

      // REGRESSION CHECK: Verify we created exactly N post_jobs for N channels
      if (createdPostJobIds.length !== expectedPostJobCount) {
        console.error(`[draftGeneration] REGRESSION DETECTED: Expected ${expectedPostJobCount} post_jobs but created ${createdPostJobIds.length}`, {
          draft_id: newDraft.id,
          expected_count: expectedPostJobCount,
          actual_count: createdPostJobIds.length,
          channels,
          schedule_rule_id: finalScheduleRuleId
        });
        // This is a critical error - log it but don't fail (might be partial failure)
        // The guard above ensures we have at least 1, so we can continue
      }

      // Update draft with first post_job_id (legacy support)
      if (firstPostJobId) {
        await supabaseAdmin
          .from('drafts')
          .update({ post_job_id: firstPostJobId })
          .eq('id', newDraft.id);
      }

      // Final verification: Check that all post_jobs have schedule_rule_id set
      const { data: verifyJobs, error: verifyError } = await supabaseAdmin
        .from('post_jobs')
        .select('id, schedule_rule_id')
        .eq('draft_id', newDraft.id);

      if (verifyError) {
        console.error(`[draftGeneration] Error verifying post_jobs for draft ${newDraft.id}:`, verifyError);
      } else if (verifyJobs) {
        const nullScheduleRuleIds = verifyJobs.filter(job => !job.schedule_rule_id);
        if (nullScheduleRuleIds.length > 0) {
          console.error(`[draftGeneration] FATAL: Found ${nullScheduleRuleIds.length} post_jobs with null schedule_rule_id`, {
            draft_id: newDraft.id,
            post_job_ids: nullScheduleRuleIds.map(j => j.id)
          });
          // Delete the draft and all post_jobs
          await supabaseAdmin.from('post_jobs').delete().eq('draft_id', newDraft.id);
          await supabaseAdmin.from('drafts').delete().eq('id', newDraft.id);
          throw new Error(`Found post_jobs with null schedule_rule_id for draft ${newDraft.id}`);
        }
      }

      draftsCreated++;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const reason = `Exception: ${errorMsg}`;
      console.error(`[draftGeneration] FAIL ${targetName} at ${target.scheduled_at}: ${reason}`);
      generationErrors.push(`${targetName} at ${target.scheduled_at}: ${reason}`);
      skippedTargets.push({ subcategory_id: target.subcategory_id, scheduled_at: target.scheduled_at, reason });
      continue;
    }
  }

  // Detailed summary log
  const expectedCreated = targetsInWindow.length - draftsSkipped;
  console.log(`[draftGeneration] Summary for brand ${brandId}:`, {
    targetsFound: targetsInWindow.length,
    draftsCreated,
    draftsSkipped,
    errors: generationErrors.length,
  });
  if (generationErrors.length > 0) {
    console.error(`[draftGeneration] ERRORS for brand ${brandId}:`, generationErrors);
  }
  if (draftsCreated < expectedCreated) {
    console.warn(`[draftGeneration] WARNING: Expected to create ${expectedCreated} drafts but only created ${draftsCreated} for brand ${brandId}`);
  }

  // Fetch existing drafts that need copy generation within the same 30-day window
  // NOTE: Copy generation is automatic and non-optional - all drafts get copy generated
  // There is no "regenerate copy" concept - copy is generated once per draft
  // Drafts with null or placeholder copy are included in copy generation batch
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
  // NOTE: Copy generation is automatic and non-optional - triggered for all drafts needing copy
  // No user action or feature flags control this - it happens automatically
  const allDraftIdsForCopy = Array.from(new Set([
    ...createdDraftIds,
    ...(existingDraftsNeedingCopy || []).map(d => d.id)
  ]));

  const copyGenerationCount = allDraftIdsForCopy.length;

  // Trigger copy generation for all drafts (newly created + existing)
  // This is automatic and non-optional - no branching logic or user options
  if (allDraftIdsForCopy.length > 0) {
    await triggerCopyGeneration(brandId, allDraftIdsForCopy, windowStartStr, windowEndStr);
  }

  // Email notifications are now handled by separate cron jobs:
  // - Weekly approval summary (Monday 11am local)
  // - Low approved drafts reminder (daily check)

  return {
    targetsFound: targetsInWindow.length,
    draftsCreated,
    draftsSkipped,
    copyGenerationCount,
    errors: generationErrors,
    skippedTargets,
  };
}

/**
 * Trigger copy generation for a set of draft IDs
 * 
 * NOTE: Copy generation is automatic and non-optional.
 * There is no "regenerate copy" concept - copy is generated once per draft.
 * This function is called automatically for all drafts needing copy.
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

    // Fetch event_occurrences for event_series subcategories
    // These are needed to get occurrence-specific URLs and summaries
    const eventSeriesSubcategoryIds = Array.from(subcategoriesMap.values())
      .filter(sc => sc.subcategory_type === 'event_series')
      .map(sc => sc.id);
    
    const eventOccurrencesBySubcategory = new Map<string, any[]>();
    if (eventSeriesSubcategoryIds.length > 0) {
      const { data: eventOccurrences } = await supabaseAdmin
        .from('event_occurrences')
        .select('id, subcategory_id, starts_at, url, summary')
        .in('subcategory_id', eventSeriesSubcategoryIds);
      
      if (eventOccurrences) {
        for (const occ of eventOccurrences) {
          const subcatId = occ.subcategory_id;
          if (!eventOccurrencesBySubcategory.has(subcatId)) {
            eventOccurrencesBySubcategory.set(subcatId, []);
          }
          eventOccurrencesBySubcategory.get(subcatId)!.push(occ);
        }
      }
    }

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

        // For event_series with frequency='specific', try to match draft to event_occurrence
        // This allows us to use occurrence-specific URLs and summaries
        let occurrenceUrl: string | null = null;
        let occurrenceSummary: string | null = null;
        
        if (
          subcategory?.subcategory_type === 'event_series' &&
          rule?.frequency === 'specific' &&
          d.subcategory_id &&
          d.scheduled_for
        ) {
          const occurrences = eventOccurrencesBySubcategory.get(d.subcategory_id) || [];
          if (occurrences.length > 0) {
            // Match draft.scheduled_for to event_occurrence.starts_at
            // Find the occurrence where starts_at is closest to scheduled_for
            const draftScheduledAt = new Date(d.scheduled_for).getTime();
            let bestMatch: any = null;
            let smallestDiff = Infinity;
            
            for (const occ of occurrences) {
              if (occ.starts_at) {
                const occStartsAt = new Date(occ.starts_at).getTime();
                const diff = Math.abs(draftScheduledAt - occStartsAt);
                // Match if within 24 hours (to account for time-of-day differences)
                if (diff < 24 * 60 * 60 * 1000 && diff < smallestDiff) {
                  smallestDiff = diff;
                  bestMatch = occ;
                }
              }
            }
            
            if (bestMatch) {
              // Use occurrence URL if available
              if (bestMatch.url && bestMatch.url.trim().length > 0) {
                occurrenceUrl = bestMatch.url.trim();
              }
              // Use occurrence summary if available (it's stored as JSON string)
              if (bestMatch.summary && bestMatch.summary.trim().length > 0) {
                occurrenceSummary = bestMatch.summary.trim();
              }
            }
          }
        }

        // URL priority: occurrence URL > schedule_rule.url > subcategory URL
        const url =
          (occurrenceUrl) ??
          (rule?.url && rule.url.trim().length > 0 ? rule.url : null) ??
          (subcategory?.url && subcategory.url.trim().length > 0 ? subcategory.url : null) ??
          '';

        // Summary priority: occurrence summary > subcategory summary
        const urlPageSummary =
          (occurrenceSummary) ??
          (subcategory?.url_page_summary ?? null);

        return {
          draftId: d.id,
          subcategoryId: d.subcategory_id ?? undefined,
          subcategory: subcategory ? {
            name: subcategory.name ?? '',
            url,
            description: subcategory.detail ?? undefined,
            frequency_type: frequencyType,
            url_page_summary: urlPageSummary,
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


