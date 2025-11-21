/**
 * Generate Drafts for Month - Ferdy Edge Function
 * Generates post jobs and drafts for a specific month based on schedule rules
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { localToUTC } from '../_shared/tz.ts';
import { assetLRU, loadAssetUsageFromDB } from '../_shared/lru.ts';
import { generateCaption } from '../_shared/ai.ts';
import { channelSupportsMedia, SUPPORTED_MEDIA_TYPES, MediaType } from '../_shared/channelSupport.ts';

/**
 * Normalize channel name to canonical values
 * - 'instagram' → 'instagram_feed' (default) or 'instagram_story' (if format is 9:16)
 * - 'linkedin' → 'linkedin_profile'
 * - Other channels remain unchanged
 */
function normalizeChannel(channel: string, format?: string): string {
  if (channel === 'instagram') {
    // Map based on format if available
    if (format === '9:16') {
      return 'instagram_story';
    }
    // Default to instagram_feed for square, 4:5, 1.91:1, or unknown formats
    return 'instagram_feed';
  }
  if (channel === 'linkedin') {
    return 'linkedin_profile';
  }
  return channel;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  brand_id: string;
  target_month: string; // YYYY-MM-01 format
  force?: boolean;
}

interface ResponseData {
  jobsCreated: number;
  draftsCreated: number;
  skipped: number;
  errors: string[];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { brand_id, target_month, force = false }: RequestBody = await req.json();

    if (!brand_id || !target_month) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: brand_id, target_month' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate date format
    const targetDate = new Date(target_month);
    if (isNaN(targetDate.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid target_month format. Use YYYY-MM-01' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Start run tracking
    const { data: run, error: runError } = await supabase
      .from('runs')
      .insert({
        brand_id,
        name: 'generate-drafts-for-month',
        scope: { target_month, force },
        status: 'started'
      })
      .select()
      .single();

    if (runError) {
      console.error('Error creating run:', runError);
    }

    const result: ResponseData = {
      jobsCreated: 0,
      draftsCreated: 0,
      skipped: 0,
      errors: []
    };

    try {
      // Get brand info
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('name, timezone')
        .eq('id', brand_id)
        .single();

      if (brandError || !brand) {
        throw new Error(`Brand not found: ${brand_id}`);
      }

      // Get content preferences
      const { data: prefs } = await supabase
        .from('content_preferences')
        .select('*')
        .eq('brand_id', brand_id)
        .single();

      // Get active schedule rules
      const { data: rules, error: rulesError } = await supabase
        .from('schedule_rules')
        .select(`
          *,
          categories(name),
          subcategories(name, detail, url, default_hashtags, frequency_type, url_page_summary)
        `)
        .eq('brand_id', brand_id)
        .eq('is_active', true);

      if (rulesError) {
        throw new Error(`Error fetching schedule rules: ${rulesError.message}`);
      }

      if (!rules || rules.length === 0) {
        console.log('No active schedule rules found');
        await updateRunStatus(supabase, run?.id, 'success', result);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Process each rule
      for (const rule of rules) {
        try {
          await processScheduleRule(supabase, rule, brand, prefs, targetDate, force, result);
        } catch (error) {
          console.error(`Error processing rule ${rule.id}:`, error);
          result.errors.push(`Rule ${rule.id}: ${error.message}`);
        }
      }

      await updateRunStatus(supabase, run?.id, 'success', result);

    } catch (error) {
      console.error('Error in generate-drafts-for-month:', error);
      await updateRunStatus(supabase, run?.id, 'failed', result);
      result.errors.push(error.message);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Process a single schedule rule
 */
async function processScheduleRule(
  supabase: any,
  rule: any,
  brand: any,
  prefs: any,
  targetDate: Date,
  force: boolean,
  result: ResponseData
) {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1; // getMonth() is 0-indexed

  // Generate time slots for this rule
  const slots = await generateTimeSlots(rule, year, month, brand.timezone);

  // Process each slot
  for (const slot of slots) {
    const scheduledAtUTC = localToUTC(
      new Date(`${slot.date}T${slot.time}`),
      brand.timezone
    );

    try {
      // Normalize all channels first
      const normalizedChannels = (rule.channels || []).map((ch: string) => normalizeChannel(ch));
      
      if (normalizedChannels.length === 0) {
        continue; // Skip if no channels
      }

      // Check if a draft already exists for this slot (by checking if any post_job exists for this time and rule)
      let existingDraftId: string | null = null;
      if (!force) {
        const { data: existingJobs } = await supabase
          .from('post_jobs')
          .select('draft_id, schedule_rule_id')
          .eq('brand_id', rule.brand_id)
          .eq('scheduled_at', scheduledAtUTC.toISOString())
          .eq('schedule_rule_id', rule.id)
          .limit(1);

        if (existingJobs && existingJobs.length > 0 && existingJobs[0].draft_id) {
          existingDraftId = existingJobs[0].draft_id;
        }
      }

      // Create ONE draft for this slot (if it doesn't exist)
      let draftId: string;
      let firstPostJobId: string | null = null;

      if (existingDraftId) {
        // Draft already exists, use it
        draftId = existingDraftId;
        
        // Get existing post_jobs for this draft to find first one
        const { data: existingPostJobs } = await supabase
          .from('post_jobs')
          .select('id')
          .eq('draft_id', draftId)
          .order('created_at', { ascending: true })
          .limit(1);
        
        if (existingPostJobs && existingPostJobs.length > 0) {
          firstPostJobId = existingPostJobs[0].id;
        }
      } else {
        // Generate draft content first (we need copy and assets)
        const generatedContent = await generateCaption({
          brand: {
            name: brand.name,
            timezone: brand.timezone
          },
          rule: {
            tone: rule.tone,
            hashtag_rule: rule.hashtag_rule,
            channels: rule.channels
          },
          subcategory: rule.subcategories || {},
          prefs: prefs || {}
        });

        // Load asset usage for LRU rotation
        if (rule.subcategory_id) {
          await loadAssetUsageFromDB(supabase, brand.id, rule.subcategory_id);
        }

        // Select assets
        const { assetIds } = await selectAssets(
          supabase,
          rule,
          brand.id,
          normalizedChannels[0], // Use first channel for asset selection
        );

        // Create ONE draft
        const { data: draft, error: draftError } = await supabase
          .from('drafts')
          .insert({
            brand_id: rule.brand_id,
            post_job_id: null, // Will be set after first post_job is created
            channel: normalizedChannels[0], // First channel only (backward compatibility)
            copy: generatedContent.copy,
            hashtags: generatedContent.hashtags,
            asset_ids: assetIds,
            generated_by: 'ai',
            approved: false,
            subcategory_id: rule.subcategory_id || null
          })
          .select()
          .single();

        if (draftError) {
          throw new Error(`Failed to create draft: ${draftError.message}`);
        }

        draftId = draft.id;
        result.draftsCreated++;
      }

      // Create ONE post_job per channel, each linked to the draft
      for (const normalizedChannel of normalizedChannels) {
        // Check if post job already exists for this channel
        if (!force) {
          const { data: existingJob } = await supabase
            .from('post_jobs')
            .select('id')
            .eq('draft_id', draftId)
            .eq('channel', normalizedChannel)
            .single();

          if (existingJob) {
            if (!firstPostJobId) {
              firstPostJobId = existingJob.id;
            }
            continue; // Skip if post_job already exists for this channel
          }
        }

        // Create post job for this channel
        const { data: postJob, error: jobError } = await supabase
          .from('post_jobs')
          .insert({
            brand_id: rule.brand_id,
            schedule_rule_id: rule.id,
            draft_id: draftId, // Link to draft (source of truth)
            channel: normalizedChannel, // One channel per post_job
            target_month: targetDate.toISOString().substring(0, 7) + '-01',
            scheduled_at: scheduledAtUTC.toISOString(),
            scheduled_local: slot.date + 'T' + slot.time,
            scheduled_tz: brand.timezone,
            status: 'pending'
          })
          .select()
          .single();

        if (jobError) {
          throw new Error(`Failed to create post job: ${jobError.message}`);
        }

        result.jobsCreated++;

        // Store first post_job_id for draft.post_job_id (backward compatibility)
        if (!firstPostJobId) {
          firstPostJobId = postJob.id;
        }
      }

      // Update draft with first post_job_id (backward compatibility)
      if (firstPostJobId) {
        await supabase
          .from('drafts')
          .update({ post_job_id: firstPostJobId })
          .eq('id', draftId);
      }

    } catch (error) {
      console.error(`Error processing slot ${slot.date} ${slot.time}:`, error);
      result.errors.push(`Slot ${slot.date} ${slot.time}: ${error.message}`);
    }
  }
}

/**
 * Generate time slots for a schedule rule
 */
async function generateTimeSlots(rule: any, year: number, month: number, timezone: string) {
  const slots: { date: string; time: string }[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  if (rule.frequency === 'daily') {
    // Every day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      slots.push({
        date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
        time: rule.time_of_day
      });
    }
  } else if (rule.frequency === 'weekly') {
    // Specific days of week
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      
      if (rule.days_of_week && rule.days_of_week.includes(dayOfWeek)) {
        slots.push({
          date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
          time: rule.time_of_day
        });
      }
    }
  } else if (rule.frequency === 'monthly') {
    if (rule.day_of_month) {
      // Specific day of month
      if (rule.day_of_month <= daysInMonth) {
        slots.push({
          date: `${year}-${month.toString().padStart(2, '0')}-${rule.day_of_month.toString().padStart(2, '0')}`,
          time: rule.time_of_day
        });
      }
    } else if (rule.nth_week && rule.weekday !== null) {
      // Nth weekday of month
      const nthOccurrence = findNthWeekday(year, month - 1, rule.weekday, rule.nth_week);
      if (nthOccurrence) {
        slots.push({
          date: nthOccurrence.toISOString().substring(0, 10),
          time: rule.time_of_day
        });
      }
    }
  } else if (rule.frequency === 'specific') {
    // For specific frequency, filter occurrences that overlap with the target month
    if (rule.start_date) {
      const startDate = new Date(rule.start_date);
      const endDate = rule.end_date ? new Date(rule.end_date) : startDate;
      
      // Target month boundaries - use UTC midnight for start and end of month
      // Ensure we're comparing dates correctly by normalizing to UTC
      const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      
      // Normalize rule dates to UTC for accurate comparison
      // Ensure start_date and end_date are treated as UTC timestamps
      const normalizeToUTC = (dateStr: string): Date => {
        // If date string doesn't have timezone info, treat as UTC
        if (!dateStr.includes('Z') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) {
          return new Date(dateStr + 'Z');
        }
        return new Date(dateStr);
      };
      
      const normalizedStartDate = normalizeToUTC(rule.start_date);
      const normalizedEndDate = rule.end_date ? normalizeToUTC(rule.end_date) : normalizedStartDate;
      
      // Check if the occurrence overlaps with the target month
      // Overlap occurs if: start_date <= monthEnd AND end_date >= monthStart
      // Use normalized dates for accurate comparison
      const hasDirectOverlap = normalizedStartDate <= monthEnd && normalizedEndDate >= monthStart;
      
      // Check if days_before would create posts in the target month
      // This allows posts scheduled before an occurrence to be generated
      let hasDaysBeforeOverlap = false;
      if (!hasDirectOverlap && rule.days_before && Array.isArray(rule.days_before) && rule.days_before.length > 0) {
        // Check if any days_before posts would fall in the target month
        for (const daysBefore of rule.days_before) {
          if (daysBefore < 0) continue;
          const scheduledDate = new Date(normalizedStartDate);
          scheduledDate.setDate(scheduledDate.getDate() - daysBefore);
          // Check if this scheduled date falls within the target month
          if (scheduledDate >= monthStart && scheduledDate <= monthEnd) {
            hasDaysBeforeOverlap = true;
            break;
          }
        }
      }
      
      // CRITICAL: Only process rules where the occurrence date range overlaps the target month
      // OR where days_before posts would fall in the target month
      // If neither condition is true, this rule is for a different month - skip it entirely
      if (!hasDirectOverlap && !hasDaysBeforeOverlap) {
        return slots; // No overlap with target month, skip this occurrence
      }
      
      // Use normalized dates for the rest of the processing
      const startDate = normalizedStartDate;
      const endDate = normalizedEndDate;
        // Determine which days of the range fall within the month
        const rangeStart = startDate > monthStart ? startDate : monthStart;
        const rangeEnd = endDate < monthEnd ? endDate : monthEnd;
        
        // Process days_before if present
        if (rule.days_before && Array.isArray(rule.days_before) && rule.days_before.length > 0) {
          for (const daysBefore of rule.days_before) {
            if (daysBefore < 0) continue;
            const scheduledDate = new Date(startDate);
            scheduledDate.setDate(scheduledDate.getDate() - daysBefore);
            
            // Only include if scheduled date falls within target month
            if (scheduledDate >= monthStart && scheduledDate <= monthEnd) {
              const timeArray = Array.isArray(rule.time_of_day) ? rule.time_of_day : [rule.time_of_day];
              for (const time of timeArray) {
                if (time) {
                  slots.push({
                    date: scheduledDate.toISOString().substring(0, 10),
                    time: time
                  });
                }
              }
            }
          }
        }
        
        // Process days_during if present (for date ranges)
        if (rule.days_during && Array.isArray(rule.days_during) && rule.days_during.length > 0 && startDate < endDate) {
          for (const dayOffset of rule.days_during) {
            if (dayOffset < 0) continue;
            const scheduledDate = new Date(startDate);
            scheduledDate.setDate(scheduledDate.getDate() + dayOffset);
            
            // Only include if scheduled date is within the range and target month
            if (scheduledDate >= rangeStart && scheduledDate <= rangeEnd && scheduledDate >= monthStart && scheduledDate <= monthEnd) {
              const timeArray = Array.isArray(rule.time_of_day) ? rule.time_of_day : [rule.time_of_day];
              for (const time of timeArray) {
                if (time) {
                  slots.push({
                    date: scheduledDate.toISOString().substring(0, 10),
                    time: time
                  });
                }
              }
            }
          }
        }
        
        // If no days_before or days_during, schedule on the start_date if it's in the month
        if ((!rule.days_before || rule.days_before.length === 0) && 
            (!rule.days_during || rule.days_during.length === 0 || startDate >= endDate)) {
          if (startDate >= monthStart && startDate <= monthEnd) {
            const timeArray = Array.isArray(rule.time_of_day) ? rule.time_of_day : [rule.time_of_day];
            for (const time of timeArray) {
              if (time) {
                slots.push({
                  date: startDate.toISOString().substring(0, 10),
                  time: time
                });
              }
            }
          }
        }
      }
    }
  }

  return slots;
}

/**
 * Find nth occurrence of a weekday in a month
 */
function findNthWeekday(year: number, month: number, weekday: number, nth: number): Date | null {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (date.getDay() === weekday) {
      count++;
      if (count === nth) {
        return date;
      }
    }
  }

  return null;
}

/**
 * Generate draft for a post job
 */
async function generateDraftForJob(
  supabase: any,
  postJob: any,
  rule: any,
  brand: any,
  prefs: any,
  result: ResponseData
) {
  try {
    // Load asset usage for LRU rotation
    if (rule.subcategory_id) {
      await loadAssetUsageFromDB(supabase, brand.id, rule.subcategory_id);
    }

    // Select assets
    const { assetIds, selectedAssets } = await selectAssets(
      supabase,
      rule,
      brand.id,
      postJob.channel,
    );

    // Generate content
    const generatedContent = await generateCaption({
      brand: {
        name: brand.name,
        timezone: brand.timezone
      },
      rule: {
        tone: rule.tone,
        hashtag_rule: rule.hashtag_rule,
        channels: rule.channels
      },
      subcategory: rule.subcategories || {},
      prefs: prefs || {}
    });

    // Create draft
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .insert({
        brand_id: postJob.brand_id,
        post_job_id: postJob.id,
        channel: postJob.channel,
        copy: generatedContent.copy,
        hashtags: generatedContent.hashtags,
        asset_ids: assetIds,
        generated_by: 'ai',
        approved: false,
        subcategory_id: rule.subcategory_id || null  // Ensure subcategory_id is set for proper categorization
      })
      .select()
      .single();

    if (draftError) {
      throw new Error(`Failed to create draft: ${draftError.message}`);
    }

    result.draftsCreated++;

    // Update post job status and set draft_id (source of truth link)
    const newStatus = (generatedContent.copy && assetIds.length > 0) ? 'generated' : 'pending';
    await supabase
      .from('post_jobs')
      .update({ 
        status: newStatus,
        draft_id: draft.id  // Set draft_id as source of truth link
      })
      .eq('id', postJob.id);

    // Record asset usage for LRU
    if (rule.subcategory_id && selectedAssets.length > 0) {
      selectedAssets.forEach(({ id, asset_type }) => {
        assetLRU.recordUsage(brand.id, rule.subcategory_id, id, asset_type);
      });
    }

  } catch (error) {
    console.error(`Error generating draft for job ${postJob.id}:`, error);
    result.errors.push(`Job ${postJob.id}: ${error.message}`);
  }
}

interface SelectedAsset {
  id: string;
  asset_type: MediaType;
}

interface SelectAssetsResult {
  assetIds: string[];
  selectedAssets: SelectedAsset[];
}

/**
 * Select assets for a post
 */
async function selectAssets(
  supabase: any,
  rule: any,
  brandId: string,
  channel: string,
): Promise<SelectAssetsResult> {
  const empty: SelectAssetsResult = { assetIds: [], selectedAssets: [] };

  try {
    // Build asset query based on image_tag_rule
    let query = supabase
      .from('assets')
      .select('id, tags, asset_type')
      .eq('brand_id', brandId);

    // Apply tag filters if specified
    if (rule.image_tag_rule && rule.image_tag_rule.all) {
      query = query.contains('tags', rule.image_tag_rule.all);
    }

    const typeFilters = SUPPORTED_MEDIA_TYPES.map((type) => `asset_type.eq.${type}`).join(',');
    query = query.or(`${typeFilters},asset_type.is.null`);

    const { data: assets, error } = await query;

    if (error) {
      console.error('Error fetching assets:', error);
      return empty;
    }

    if (!assets || assets.length === 0) {
      console.log('No assets found for brand');
      return empty;
    }

    const eligibleAssets: SelectedAsset[] = (assets as any[]).reduce((acc: SelectedAsset[], asset: any) => {
      const rawType = asset.asset_type as string | null;
      const normalizedType: MediaType = rawType === 'video' ? 'video' : 'image';

      if (!channelSupportsMedia(channel, normalizedType)) {
        return acc;
      }

      if (!SUPPORTED_MEDIA_TYPES.includes(normalizedType)) {
        return acc;
      }

      acc.push({
        id: asset.id,
        asset_type: normalizedType,
      });
      return acc;
    }, []);

    if (eligibleAssets.length === 0) {
      console.log(
        `No eligible assets found for channel ${channel} with supported media types ${SUPPORTED_MEDIA_TYPES.join(
          ', ',
        )}`,
      );
      return empty;
    }

    const availableAssetIds = eligibleAssets.map((asset) => asset.id);

    // Use LRU to select asset
    const selectedAssetId = assetLRU.selectLeastUsed(brandId, rule.subcategory_id, availableAssetIds);
    if (!selectedAssetId) {
      return empty;
    }

    const selectedAsset = eligibleAssets.find((asset) => asset.id === selectedAssetId);
    if (!selectedAsset) {
      return empty;
    }

    return {
      assetIds: [selectedAssetId],
      selectedAssets: [selectedAsset],
    };
  } catch (error) {
    console.error('Error selecting assets:', error);
    return empty;
  }
}

/**
 * Update run status
 */
async function updateRunStatus(supabase: any, runId: string, status: string, result: ResponseData) {
  if (!runId) return;

  try {
    await supabase
      .from('runs')
      .update({
        status,
        ended_at: new Date().toISOString(),
        scope: result
      })
      .eq('id', runId);
  } catch (error) {
    console.error('Error updating run status:', error);
  }
}
