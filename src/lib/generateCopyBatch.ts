import { supabaseAdmin } from "@/lib/supabase-server";
import OpenAI from "openai";
import { generatePostCopyFromContext, type PostCopyPayload } from "@/lib/postCopy";
import { normalizeHashtags } from "@/lib/utils/hashtags";

// Helper to sleep between iterations
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Lazy initialization - only creates client when needed
// Note: OPENAI_API_KEY must be set in Vercel environment variables
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

// Type for draft input
export type DraftCopyInput = {
  draftId: string;
  subcategoryId?: string; // Optional subcategory ID for grouping
  subcategory?: {
    name?: string;
    url?: string;
    description?: string;
    frequency_type?: string;
    url_page_summary?: string | null;
    default_copy_length?: "short" | "medium" | "long";
  };
  subcategory_type?: string | null;
  subcategory_settings?: Record<string, any> | null;
  schedule?: {
    frequency: string;
    event_date?: string;
  };
  scheduledFor?: string; // UTC timestamp when the post is scheduled
  prompt: string;
  options?: {
    tone_override?: string;
    length?: "short" | "medium" | "long";
    emoji?: "auto" | "none";
    hashtags?: {
      mode: "auto" | "none" | "list";
      list?: string[];
    };
    cta?: string;
    variants?: number;
    max_tokens?: number;
  };
};

// Helper to group array by key
function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of array) {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
}

/**
 * Select assets for a draft based on subcategory_id
 * Queries assets via asset_tags table using the subcategory's tag
 */
async function selectAssetsForDraft(
  supabase: any,
  brandId: string,
  subcategoryId: string,
  channel: string,
  draftId: string
): Promise<string[]> {
  try {
    // Step 1: Get subcategory name to find the tag
    const { data: subcategory, error: subcategoryError } = await supabase
      .from('subcategories')
      .select('id, name')
      .eq('id', subcategoryId)
      .single();

    if (subcategoryError || !subcategory) {
      console.log(`[generateCopyBatch][asset-selection] Subcategory ${subcategoryId} not found for draft ${draftId}`);
      return [];
    }

    // Step 2: Find the tag for this subcategory
    // Tags are linked to subcategories by brand_id + name + kind='subcategory'
    // (subcategories trigger creates tags automatically)
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('id')
      .eq('brand_id', brandId)
      .eq('name', subcategory.name)
      .eq('kind', 'subcategory')
      .eq('is_active', true)
      .limit(1);

    if (tagsError || !tags || tags.length === 0) {
      console.log(`[generateCopyBatch][asset-selection] No tag found for subcategory ${subcategoryId} (${subcategory.name}) for draft ${draftId}`);
      return [];
    }

    const tagId = tags[0].id;

    // Step 3: Find assets linked to this tag via asset_tags
    const { data: assetTags, error: assetTagsError } = await supabase
      .from('asset_tags')
      .select('asset_id')
      .eq('tag_id', tagId);

    if (assetTagsError) {
      console.error(`[generateCopyBatch][asset-selection] Error querying asset_tags for tag ${tagId}:`, assetTagsError);
      return [];
    }

    if (!assetTags || assetTags.length === 0) {
      console.log(`[generateCopyBatch][asset-selection] No asset_tags found for tag ${tagId} (subcategory ${subcategoryId}, name: ${subcategory.name}) for draft ${draftId}`);
      return [];
    }

    const candidateAssetIds = assetTags.map((at: any) => at.asset_id);
    console.log(`[generateCopyBatch][asset-selection] Found ${candidateAssetIds.length} asset_tags for tag ${tagId}:`, candidateAssetIds.slice(0, 5));

    // Step 4: Fetch the actual assets and filter by brand_id and channel compatibility
    // Note: assets table doesn't have is_active column - all assets are considered active
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, asset_type, brand_id')
      .eq('brand_id', brandId)
      .in('id', candidateAssetIds);

    if (assetsError) {
      console.error(`[generateCopyBatch][asset-selection] Error querying assets:`, assetsError);
      return [];
    }

    if (!assets || assets.length === 0) {
      // Debug: Check what assets exist (even if wrong brand)
      const { data: allAssets } = await supabase
        .from('assets')
        .select('id, asset_type, brand_id')
        .in('id', candidateAssetIds)
        .limit(5);
      
      console.log(`[generateCopyBatch][asset-selection] No assets found for subcategory ${subcategoryId} (tag ${tagId}, name: ${subcategory.name}) for draft ${draftId}`);
      console.log(`[generateCopyBatch][asset-selection] Debug - Found ${candidateAssetIds.length} asset_ids from asset_tags, but query returned ${assets?.length || 0} assets for brand ${brandId}`);
      if (allAssets && allAssets.length > 0) {
        console.log(`[generateCopyBatch][asset-selection] Debug - Sample assets (may have wrong brand_id):`, allAssets.map((a: any) => ({ id: a.id, brand_id: a.brand_id, matches_brand: a.brand_id === brandId })));
      }
      return [];
    }

    // Filter by channel compatibility (simple check - images work for all, videos may have restrictions)
    // For now, we'll allow all images and videos. Channel-specific filtering can be added later if needed.
    const eligibleAssets = assets.filter((asset: any) => {
      const assetType = asset.asset_type || 'image';
      // Instagram feed supports both images and videos
      // Add more channel-specific logic here if needed
      return assetType === 'image' || assetType === 'video';
    });

    if (eligibleAssets.length === 0) {
      console.log(`[generateCopyBatch][asset-selection] No eligible assets after channel filtering for draft ${draftId}`);
      return [];
    }

    // Step 5: Select one asset using LRU rotation (same logic as draftGeneration.ts)
    // Query historical drafts to find least recently used asset
    const { data: historicalDrafts } = await supabase
      .from('drafts')
      .select('asset_ids, created_at')
      .eq('brand_id', brandId)
      .eq('subcategory_id', subcategoryId)
      .eq('schedule_source', 'framework')
      .not('asset_ids', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100); // Look at last 100 drafts for usage history
    
    // Build a map of asset_id -> last_used_at timestamp
    const assetLastUsed = new Map<string, Date>();
    
    // Process historical drafts to find when each asset was last used
    if (historicalDrafts) {
      for (const draft of historicalDrafts) {
        if (draft.asset_ids && Array.isArray(draft.asset_ids) && draft.asset_ids.length > 0) {
          const draftAssetId = draft.asset_ids[0]; // Use first asset from draft
          const draftDate = new Date(draft.created_at);
          
          // Only track if this asset is in our eligible list
          if (eligibleAssets.some(a => a.id === draftAssetId)) {
            // Update last_used_at if this is more recent
            const existing = assetLastUsed.get(draftAssetId);
            if (!existing || draftDate > existing) {
              assetLastUsed.set(draftAssetId, draftDate);
            }
          }
        }
      }
    }
    
    // Sort eligible assets by last used (oldest first, never-used assets first)
    eligibleAssets.sort((a, b) => {
      const dateA = assetLastUsed.get(a.id)?.getTime() || 0; // 0 for never used
      const dateB = assetLastUsed.get(b.id)?.getTime() || 0; // 0 for never used
      return dateA - dateB;
    });
    
    // Select the least recently used asset
    const selectedAsset = eligibleAssets[0];
    const finalAssetIds = [selectedAsset.id];

    // Log asset selection details
    console.info('[generateCopyBatch][asset-selection]', {
      draftId,
      brandId,
      subcategoryId,
      subcategoryName: subcategory.name,
      channel,
      candidateAssetCount: candidateAssetIds.length,
      activeAssetCount: assets.length,
      eligibleAssetCount: eligibleAssets.length,
      finalAssetIds,
    });

    return finalAssetIds;
  } catch (error) {
    console.error(`[generateCopyBatch][asset-selection] Error selecting assets for draft ${draftId}:`, error);
    return [];
  }
}

// Helper to extract hashtags from a block of text
function extractHashtagsFromText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  // Strip leading # for normalization via normalizeHashtags
  return matches.map(tag => tag.replace(/#/g, "").trim()).filter(Boolean);
}

// Shared batch processing function
export async function processBatchCopyGeneration(
  brandId: string,
  drafts: DraftCopyInput[]
): Promise<{ processed: number; skipped: number; failed: number }> {
  // Generate job_run_id for tracking
  const jobRunId = crypto.randomUUID();

  const client = getClient();
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  // Preload subcategory default hashtags for all drafts in this batch
  const subcategoryIdsForBatch = Array.from(
    new Set(
      drafts
        .map((d) => d.subcategoryId)
        .filter((id): id is string => !!id)
    )
  );

  const subcategoryHashtagsMap = new Map<string, string[]>();

  if (subcategoryIdsForBatch.length > 0) {
    try {
      const { data: subcategoryRows, error: subcategoryError } = await supabaseAdmin
        .from("subcategories")
        .select("id, default_hashtags")
        .in("id", subcategoryIdsForBatch);

      if (subcategoryError) {
        console.error("[generateCopyBatch] Error loading subcategory default_hashtags:", subcategoryError);
      } else if (subcategoryRows) {
        for (const row of subcategoryRows as { id: string; default_hashtags: string[] | null }[]) {
          const raw = row.default_hashtags || [];
          const normalized = normalizeHashtags(raw, true);
          subcategoryHashtagsMap.set(row.id, normalized);
        }
      }
    } catch (err) {
      console.error("[generateCopyBatch] Exception loading subcategory default_hashtags:", err);
    }
  }

  // Group drafts by subcategory for variation tracking
  // Use subcategory ID if available, otherwise fall back to name
  const draftsBySubcategory = groupBy(drafts, (draft) => {
    // Try to get a stable key per subcategory - prefer ID, then name
    const subcategoryId = draft.subcategoryId || draft.subcategory?.name || "unknown";
    return subcategoryId;
  });

  console.log(`Processing ${drafts.length} drafts for brand ${brandId}`);
  console.log(`[generateCopyBatch] Grouped into ${Object.keys(draftsBySubcategory).length} subcategories`);

  // Process each subcategory group
  for (const [subcategoryKey, draftsInSubcategory] of Object.entries(draftsBySubcategory)) {
    console.log(`[generateCopyBatch] Processing ${draftsInSubcategory.length} drafts for subcategory: ${subcategoryKey}`);
    
    // Process each draft within this subcategory
    for (let index = 0; index < draftsInSubcategory.length; index++) {
      const draft = draftsInSubcategory[index];
      const variationIndex = index; // 0-based
      const variationTotal = draftsInSubcategory.length;
      
      try {
      // Check if copy_status is already "complete" - skip if so
      // Also fetch subcategory_id, hashtags, channel, and asset_ids for asset selection
      const { data: existingDraft, error: fetchDraftError } = await supabaseAdmin
        .from("drafts")
        .select("copy_status, copy, subcategory_id, channel, brand_id, hashtags, asset_ids")
        .eq("id", draft.draftId)
        .single();

      if (fetchDraftError) {
        console.error(`Error fetching draft ${draft.draftId}:`, fetchDraftError);
        throw new Error(`Failed to fetch draft: ${fetchDraftError.message}`);
      }

      // Skip if already complete (check both copy_status and copy field)
      // Also check if copy is just the placeholder text
      const hasRealCopy = existingDraft?.copy && 
        existingDraft.copy.trim().length > 0 && 
        existingDraft.copy !== 'Post copy coming soon…';
      if (
        existingDraft?.copy_status === "complete" ||
        hasRealCopy
      ) {
        console.log(`Skipping draft ${draft.draftId} - already has copy`);
        skipped++;
        continue;
      }

      console.log(`Generating copy for draft ${draft.draftId}`);

      // Use existing asset_ids if already set (from draft creation with LRU rotation)
      // Only re-select if asset_ids is empty/null
      let assetIds: string[] = [];
      const existingAssetIds = existingDraft?.asset_ids;
      
      if (existingAssetIds && Array.isArray(existingAssetIds) && existingAssetIds.length > 0) {
        // Draft already has assets selected (from draft creation with LRU rotation)
        // Preserve them - do NOT re-select
        assetIds = existingAssetIds;
        console.log(`[generateCopyBatch] Preserving existing asset_ids for draft ${draft.draftId}: ${assetIds.join(', ')}`);
      } else {
        // No assets set yet - select them now (fallback case)
        const draftSubcategoryId = existingDraft?.subcategory_id || draft.subcategoryId;
        const draftChannel = existingDraft?.channel || "instagram_feed"; // Default fallback
        const draftBrandId = existingDraft?.brand_id || brandId;

        if (draftSubcategoryId) {
          try {
            const selectedAssetIds = await selectAssetsForDraft(
              supabaseAdmin,
              draftBrandId,
              draftSubcategoryId,
              draftChannel,
              draft.draftId
            );
            assetIds = selectedAssetIds;
          } catch (assetError) {
            console.error(`[generateCopyBatch] Error selecting assets for draft ${draft.draftId}:`, assetError);
            // Continue without assets if selection fails
          }
        } else {
          console.log(`[generateCopyBatch] No subcategory_id for draft ${draft.draftId}, skipping asset selection`);
        }
      }

      // Set copy_status to "pending"
      try {
        await supabaseAdmin
          .from("drafts")
          .update({ copy_status: "pending" })
          .eq("id", draft.draftId);
      } catch {
        // Gracefully handle if copy_status column doesn't exist
      }

      // Build PostCopyPayload
      // Note: length precedence is: payload.length (explicit) > subcategory.default_copy_length > "medium"
      const payload: PostCopyPayload = {
        brandId,
        draftId: draft.draftId,
        prompt: draft.prompt,
        platform: "instagram", // Default, can be inferred from draft.channel if available
        subcategory: draft.subcategory ? {
          ...draft.subcategory,
          default_copy_length: draft.subcategory.default_copy_length ?? "medium",
        } : undefined,
        subcategory_type: draft.subcategory_type as any ?? null,
        subcategory_settings: draft.subcategory_settings ?? null,
        schedule: draft.schedule,
        scheduledFor: draft.scheduledFor,
        tone_override: draft.options?.tone_override,
        length: draft.options?.length, // Explicit override takes precedence over subcategory.default_copy_length
        emoji: draft.options?.emoji,
        hashtags: draft.options?.hashtags,
        cta: draft.options?.cta,
        variants: 1, // Always 1 for background jobs
        max_tokens: draft.options?.max_tokens,
        variation_hint: (draft as any).variation_hint ?? null, // Pass through variation_hint if present
        variation_index: variationIndex, // 0-based index within subcategory
        variation_total: variationTotal, // Total drafts for this subcategory
      };

      // Log payload before calling generatePostCopyFromContext (for debugging)
      console.log("COPY PAYLOAD:", JSON.stringify(payload, null, 2));
      console.log("[generateCopyBatch] Copy length debug:", {
        draftId: draft.draftId,
        explicitLength: draft.options?.length,
        subcategoryDefaultCopyLength: draft.subcategory?.default_copy_length,
        effectiveLength: payload.length || payload.subcategory?.default_copy_length || "medium",
        subcategoryName: draft.subcategory?.name,
      });

      // Generate copy (with n=1)
      const variants = await generatePostCopyFromContext(
        supabaseAdmin,
        client,
        payload
      );

      if (variants.length === 0) {
        throw new Error("No variants generated");
      }

      // Save result to drafts (including asset_ids if selected)
      try {
        // Compute final hashtags for this draft by combining:
        // - existing draft.hashtags (if any)
        // - subcategory default_hashtags (if any)
        // while avoiding duplicates and any hashtags already present in the copy text.
        const baseCopy = variants[0];

        // Existing structured hashtags from the draft row
        const existingHashtagsRaw = Array.isArray((existingDraft as any)?.hashtags)
          ? ((existingDraft as any).hashtags as string[])
          : [];

        // Default hashtags from subcategory (normalized and preloaded)
        const defaultFromSubcategory =
          (draftSubcategoryId && subcategoryHashtagsMap.get(draftSubcategoryId)) || [];

        // Hashtags that might already appear in the generated copy text
        const hashtagsInCopyRaw = extractHashtagsFromText(baseCopy);

        // Normalize everything (case-insensitive) and merge
        const normalizedExisting = normalizeHashtags(existingHashtagsRaw, true);
        const normalizedDefaults = normalizeHashtags(defaultFromSubcategory, true);
        const normalizedInCopy = normalizeHashtags(hashtagsInCopyRaw, true);

        const seen = new Set<string>(normalizedInCopy.map((h) => h.toLowerCase()));
        const finalHashtags: string[] = [];

        const addIfNew = (tag: string) => {
          const key = tag.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            finalHashtags.push(tag);
          }
        };

        // Preserve order: existing draft hashtags first, then defaults
        normalizedExisting.forEach(addIfNew);
        normalizedDefaults.forEach(addIfNew);

        // Build final copy text with hashtags appended at the end (if any)
        const hashtagsText = finalHashtags.length > 0 ? finalHashtags.join(" ") : "";
        const finalCopy =
          hashtagsText.length > 0 ? `${baseCopy.trim()}\n\n${hashtagsText}` : baseCopy.trim();

        const { error: updateError } = await supabaseAdmin
          .from("drafts")
          .update({
            copy: finalCopy,
            copy_status: "complete",
            copy_model: "gpt-4o-mini",
            ...(finalHashtags.length > 0 && { hashtags: finalHashtags }),
            ...(assetIds.length > 0 && { asset_ids: assetIds }),
            copy_meta: {
              job_run_id: jobRunId,
              platform: payload.platform,
              prompt: payload.prompt,
              ...(payload.subcategory && { subcategory: payload.subcategory }),
              ...(payload.schedule && { schedule: payload.schedule }),
              ...(payload.tone_override && { tone_override: payload.tone_override }),
              ...(payload.length && { length: payload.length }),
              ...(payload.emoji && { emoji: payload.emoji }),
              ...(payload.hashtags && { hashtags: payload.hashtags }),
              ...(payload.cta && { cta: payload.cta }),
            },
          })
          .eq("id", draft.draftId);

        if (updateError) {
          console.log(`Update with metadata failed for draft ${draft.draftId}, trying simple update:`, updateError);
          // Gracefully handle if copy_status/copy_model/copy_meta columns don't exist
          // Just update copy field
          const { error: simpleUpdateError } = await supabaseAdmin
            .from("drafts")
            .update({ copy: variants[0] })
            .eq("id", draft.draftId);
          
          if (simpleUpdateError) {
            throw new Error(`Failed to update draft: ${simpleUpdateError.message}`);
          }
        }
        
        console.log(`Successfully saved copy for draft ${draft.draftId}`);
      } catch (updateErr) {
        throw new Error(`Failed to save copy: ${updateErr instanceof Error ? updateErr.message : "Unknown error"}`);
      }

        processed++;

        // Sleep between iterations to avoid rate spikes
        // Only sleep if not the last draft in the entire batch
        const isLastSubcategory = subcategoryKey === Object.keys(draftsBySubcategory)[Object.keys(draftsBySubcategory).length - 1];
        const isLastInSubcategory = index === draftsInSubcategory.length - 1;
        if (!(isLastSubcategory && isLastInSubcategory)) {
          await sleep(150);
        }
      } catch (error) {
        failed++;

        // Set copy_status to "failed" and add error to copy_meta
        try {
          await supabaseAdmin
            .from("drafts")
            .update({
              copy_status: "failed",
              copy_meta: {
                job_run_id: jobRunId,
                error: error instanceof Error ? error.message : "Unknown error",
              },
            })
            .eq("id", draft.draftId);
        } catch {
          // Gracefully handle if copy_status/copy_meta columns don't exist
          // Try to update with minimal error info
          try {
            await supabaseAdmin
              .from("drafts")
              .update({
                copy: `[Error: ${error instanceof Error ? error.message : "Unknown error"}]`,
              })
              .eq("id", draft.draftId);
          } catch {
            // Ignore if update fails entirely
          }
        }
      }
    }
  }

  return { processed, skipped, failed };
}

