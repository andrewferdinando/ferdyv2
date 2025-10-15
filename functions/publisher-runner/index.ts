/**
 * Publisher Runner - Ferdy Edge Function
 * Publishes approved posts to social media platforms
 * Should be triggered by a cron job every 5-15 minutes
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResponseData {
  processed: number;
  published: number;
  failed: number;
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

    const result: ResponseData = {
      processed: 0,
      published: 0,
      failed: 0,
      errors: []
    };

    try {
      // Find jobs ready for publishing
      const { data: readyJobs, error: jobsError } = await supabase
        .from('post_jobs')
        .select(`
          *,
          drafts!inner(*),
          social_accounts!inner(*)
        `)
        .eq('status', 'ready')
        .eq('drafts.approved', true)
        .lte('scheduled_at', new Date().toISOString())
        .limit(50); // Process in batches

      if (jobsError) {
        throw new Error(`Error fetching ready jobs: ${jobsError.message}`);
      }

      if (!readyJobs || readyJobs.length === 0) {
        console.log('No jobs ready for publishing');
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Process each job
      for (const job of readyJobs) {
        try {
          await processPublishJob(supabase, job, result);
        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error);
          result.errors.push(`Job ${job.id}: ${error.message}`);
        }
      }

    } catch (error) {
      console.error('Error in publisher-runner:', error);
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
 * Process a single publish job
 */
async function processPublishJob(supabase: any, job: any, result: ResponseData) {
  result.processed++;

  try {
    // Update job status to publishing
    await supabase
      .from('post_jobs')
      .update({ status: 'publishing' })
      .eq('id', job.id);

    // Find the approved draft
    const draft = job.drafts.find((d: any) => d.approved === true);
    if (!draft) {
      throw new Error('No approved draft found');
    }

    // Find social account for this channel
    const socialAccount = job.social_accounts.find((sa: any) => sa.channel === job.channel);
    if (!socialAccount) {
      throw new Error(`No social account found for channel: ${job.channel}`);
    }

    // Check if social account is connected
    if (socialAccount.status !== 'connected') {
      throw new Error(`Social account not connected: ${socialAccount.status}`);
    }

    // Check token expiry (if applicable)
    if (socialAccount.token_expires_at && new Date(socialAccount.token_expires_at) <= new Date()) {
      throw new Error('Social account token expired');
    }

    // Prepare publish data
    const publishData = {
      brand_id: job.brand_id,
      post_job_id: job.id,
      draft_id: draft.id,
      channel: job.channel,
      social_account_id: socialAccount.id,
      status: 'queued',
      attempt: 1
    };

    // Create publish record
    const { data: publish, error: publishError } = await supabase
      .from('publishes')
      .insert(publishData)
      .select()
      .single();

    if (publishError) {
      throw new Error(`Failed to create publish record: ${publishError.message}`);
    }

    // Publish to social media platform
    const publishResult = await publishToPlatform(job, draft, socialAccount);

    if (publishResult.success) {
      // Update publish record with success
      await supabase
        .from('publishes')
        .update({
          status: 'success',
          published_at: new Date().toISOString(),
          external_post_id: publishResult.external_id,
          external_url: publishResult.external_url
        })
        .eq('id', publish.id);

      // Update job status to published
      await supabase
        .from('post_jobs')
        .update({ status: 'published' })
        .eq('id', job.id);

      result.published++;
    } else {
      // Update publish record with failure
      await supabase
        .from('publishes')
        .update({
          status: 'failed',
          error: publishResult.error
        })
        .eq('id', publish.id);

      // Update job status to failed
      await supabase
        .from('post_jobs')
        .update({ status: 'failed', error: publishResult.error })
        .eq('id', job.id);

      result.failed++;
    }

  } catch (error) {
    console.error(`Error processing publish job ${job.id}:`, error);
    
    // Update job status to failed
    await supabase
      .from('post_jobs')
      .update({ status: 'failed', error: error.message })
      .eq('id', job.id);

    result.failed++;
    throw error;
  }
}

/**
 * Publish to specific social media platform
 */
async function publishToPlatform(job: any, draft: any, socialAccount: any) {
  try {
    const platform = job.channel.toLowerCase();
    
    // TODO: Implement actual platform publishing logic
    switch (platform) {
      case 'facebook':
        return await publishToFacebook(job, draft, socialAccount);
      case 'instagram':
        return await publishToInstagram(job, draft, socialAccount);
      case 'twitter':
      case 'x':
        return await publishToTwitter(job, draft, socialAccount);
      case 'linkedin':
        return await publishToLinkedIn(job, draft, socialAccount);
      case 'tiktok':
        return await publishToTikTok(job, draft, socialAccount);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    console.error('Error publishing to platform:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Publish to Facebook (stub implementation)
 */
async function publishToFacebook(job: any, draft: any, socialAccount: any) {
  // TODO: Implement Facebook Graph API integration
  console.log('Publishing to Facebook:', {
    account: socialAccount.handle,
    copy: draft.copy,
    hashtags: draft.hashtags,
    assets: draft.asset_ids
  });

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    success: true,
    external_id: `fb_${Date.now()}`,
    external_url: `https://facebook.com/posts/${Date.now()}`
  };
}

/**
 * Publish to Instagram (stub implementation)
 */
async function publishToInstagram(job: any, draft: any, socialAccount: any) {
  // TODO: Implement Instagram Graph API integration
  console.log('Publishing to Instagram:', {
    account: socialAccount.handle,
    copy: draft.copy,
    hashtags: draft.hashtags,
    assets: draft.asset_ids
  });

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    success: true,
    external_id: `ig_${Date.now()}`,
    external_url: `https://instagram.com/p/${Date.now()}`
  };
}

/**
 * Publish to Twitter/X (stub implementation)
 */
async function publishToTwitter(job: any, draft: any, socialAccount: any) {
  // TODO: Implement Twitter API v2 integration
  console.log('Publishing to Twitter:', {
    account: socialAccount.handle,
    copy: draft.copy,
    hashtags: draft.hashtags
  });

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    success: true,
    external_id: `tw_${Date.now()}`,
    external_url: `https://twitter.com/${socialAccount.handle}/status/${Date.now()}`
  };
}

/**
 * Publish to LinkedIn (stub implementation)
 */
async function publishToLinkedIn(job: any, draft: any, socialAccount: any) {
  // TODO: Implement LinkedIn API integration
  console.log('Publishing to LinkedIn:', {
    account: socialAccount.handle,
    copy: draft.copy,
    hashtags: draft.hashtags,
    assets: draft.asset_ids
  });

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    success: true,
    external_id: `li_${Date.now()}`,
    external_url: `https://linkedin.com/feed/update/${Date.now()}`
  };
}

/**
 * Publish to TikTok (stub implementation)
 */
async function publishToTikTok(job: any, draft: any, socialAccount: any) {
  // TODO: Implement TikTok API integration
  console.log('Publishing to TikTok:', {
    account: socialAccount.handle,
    copy: draft.copy,
    hashtags: draft.hashtags,
    assets: draft.asset_ids
  });

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    success: true,
    external_id: `tt_${Date.now()}`,
    external_url: `https://tiktok.com/@${socialAccount.handle}/video/${Date.now()}`
  };
}
