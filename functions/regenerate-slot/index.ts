/**
 * Regenerate Slot - Ferdy Edge Function
 * Regenerates content for a specific post job
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { assetLRU } from '../_shared/lru.ts';
import { generateCaption } from '../_shared/ai.ts';
import { channelSupportsMedia, SUPPORTED_MEDIA_TYPES, MediaType } from '../_shared/channelSupport.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  post_job_id: string;
}

interface ResponseData {
  success: boolean;
  draft_id?: string;
  error?: string;
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

    const { post_job_id }: RequestBody = await req.json();

    if (!post_job_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: post_job_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result: ResponseData = { success: false };

    try {
      // Get post job with related data
      const { data: postJob, error: jobError } = await supabase
        .from('post_jobs')
        .select(`
          *,
          schedule_rules(
            *,
            categories(name),
            subcategories(name, detail, url, default_hashtags)
          )
        `)
        .eq('id', post_job_id)
        .single();

      if (jobError || !postJob) {
        throw new Error(`Post job not found: ${post_job_id}`);
      }

      // Get brand info
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('name, timezone')
        .eq('id', postJob.brand_id)
        .single();

      if (brandError || !brand) {
        throw new Error(`Brand not found: ${postJob.brand_id}`);
      }

      // Get content preferences
      const { data: prefs } = await supabase
        .from('content_preferences')
        .select('*')
        .eq('brand_id', postJob.brand_id)
        .single();

      // Get or create draft
      let { data: draft } = await supabase
        .from('drafts')
        .select('*')
        .eq('post_job_id', post_job_id)
        .single();

      // Select new assets
      const { assetIds, selectedAssets } = await selectAssets(
        supabase,
        postJob.schedule_rules,
        postJob.brand_id,
        postJob.channel,
      );

      // Generate new content
      const generatedContent = await generateCaption({
        brand: {
          name: brand.name,
          timezone: brand.timezone
        },
        rule: {
          tone: postJob.schedule_rules?.tone,
          hashtag_rule: postJob.schedule_rules?.hashtag_rule,
          channels: postJob.schedule_rules?.channels
        },
        subcategory: postJob.schedule_rules?.subcategories || {},
        prefs: prefs || {}
      });

      if (draft) {
        // Update existing draft
        const { data: updatedDraft, error: updateError } = await supabase
          .from('drafts')
          .update({
            copy: generatedContent.copy,
            hashtags: generatedContent.hashtags,
            asset_ids: assetIds,
            generated_by: 'ai+human',
            approved: false
          })
          .eq('id', draft.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to update draft: ${updateError.message}`);
        }

        result.draft_id = updatedDraft.id;
      } else {
        // Create new draft
        const { data: newDraft, error: createError } = await supabase
          .from('drafts')
          .insert({
            brand_id: postJob.brand_id,
            post_job_id: postJob.id,
            channel: postJob.channel,
            copy: generatedContent.copy,
            hashtags: generatedContent.hashtags,
            asset_ids: assetIds,
            generated_by: 'ai',
            approved: false
          })
          .select()
          .single();

        if (createError) {
          throw new Error(`Failed to create draft: ${createError.message}`);
        }

        result.draft_id = newDraft.id;
      }

      // Update post job status
      const newStatus = (generatedContent.copy && assetIds.length > 0) ? 'generated' : 'pending';
      await supabase
        .from('post_jobs')
        .update({ status: newStatus })
        .eq('id', post_job_id);

      // Record asset usage for LRU
      if (postJob.schedule_rules?.subcategory_id && selectedAssets.length > 0) {
        selectedAssets.forEach(({ id, asset_type }) => {
          assetLRU.recordUsage(postJob.brand_id, postJob.schedule_rules.subcategory_id, id, asset_type);
        });
      }

      result.success = true;

    } catch (error) {
      console.error('Error in regenerate-slot:', error);
      result.error = error.message;
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
 * Select assets for a post
 */
interface SelectedAsset {
  id: string;
  asset_type: MediaType;
}

interface SelectAssetsResult {
  assetIds: string[];
  selectedAssets: SelectedAsset[];
}

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
    if (rule?.image_tag_rule && rule.image_tag_rule.all) {
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
    const selectedAssetId = assetLRU.selectLeastUsed(brandId, rule?.subcategory_id, availableAssetIds);
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
