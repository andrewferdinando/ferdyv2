import { supabaseAdmin } from '@/lib/supabase-server'
import {
  canonicalizeChannel,
  CHANNEL_PROVIDER_MAP,
  SUPPORTED_CHANNELS,
} from '@/lib/channels'
import { publishFacebookPost } from './providers/facebook'
import { publishInstagramFeedPost, publishInstagramStory } from './providers/instagram'

type DraftRow = {
  id: string
  brand_id: string
  channel: string | null
  status: string
  scheduled_for: string | null
  asset_ids: string[] | null
  hashtags: string[] | null
  copy: string | null
}

type PostJobRow = {
  id: string
  draft_id: string | null
  brand_id: string
  channel: string
  status: string
  error: string | null
  external_post_id: string | null
  external_url: string | null
  scheduled_at: string
  target_month: string
}

type SocialAccountRow = {
  id: string
  provider: string
  account_id: string
  handle: string | null
  status: string
  token_encrypted: string | null
  metadata?: Record<string, unknown> | null
}

type PublishAttemptResult =
  | { success: true; externalId: string; externalUrl: string | null }
  | { success: false; error: string }

/**
 * Publishes a single post_job to its channel
 * Updates the job status and returns the result
 */
export async function publishJob(
  job: PostJobRow,
  draft: DraftRow,
  socialAccounts: Record<string, SocialAccountRow>,
): Promise<{ success: boolean; error?: string }> {
  const jobChannel = canonicalizeChannel(job.channel)
  if (!jobChannel || !SUPPORTED_CHANNELS.includes(jobChannel)) {
    return {
      success: false,
      error: `Unsupported channel: ${job.channel}`,
    }
  }

  // Update job to 'publishing' status
  await supabaseAdmin
    .from('post_jobs')
    .update({ status: 'publishing', last_attempt_at: new Date().toISOString() })
    .eq('id', job.id)

  const provider = CHANNEL_PROVIDER_MAP[jobChannel]
  const socialAccount = provider ? socialAccounts[provider] : undefined

  console.log('[publishJob] Starting publish', {
    jobId: job.id,
    channel: jobChannel,
    provider,
    hasSocialAccount: !!socialAccount,
    brandId: draft.brand_id,
  })

  const publishResult = await publishToChannel(jobChannel, draft, job, socialAccount)

  if (publishResult.success) {
    // Get current job to check if published_at is already set
    const { data: currentJob } = await supabaseAdmin
      .from('post_jobs')
      .select('published_at')
      .eq('id', job.id)
      .single()

    // Prepare update object
    const updateData: {
      status: string
      error: null
      external_post_id: string
      external_url: string | null
      published_at?: string
    } = {
      status: 'success',
      error: null,
      external_post_id: publishResult.externalId,
      external_url: publishResult.externalUrl,
    }

    // Set published_at if not already set
    if (!currentJob?.published_at) {
      updateData.published_at = new Date().toISOString()
    }

    await supabaseAdmin
      .from('post_jobs')
      .update(updateData)
      .eq('id', job.id)

    console.log('[publishJob] Success', {
      jobId: job.id,
      channel: jobChannel,
      externalId: publishResult.externalId,
    })

    return { success: true }
  } else {
    await supabaseAdmin
      .from('post_jobs')
      .update({
        status: 'failed',
        error: publishResult.error,
      })
      .eq('id', job.id)

    console.error('[publishJob] Failed', {
      jobId: job.id,
      channel: jobChannel,
      error: publishResult.error,
    })

    return {
      success: false,
      error: publishResult.error,
    }
  }
}

async function publishToChannel(
  channel: string,
  draft: DraftRow,
  job: PostJobRow,
  socialAccount?: SocialAccountRow,
): Promise<PublishAttemptResult> {
  if (!socialAccount) {
    return {
      success: false,
      error: `No connected social account available for ${channel}`,
    }
  }

  if (socialAccount.status !== 'connected') {
    return {
      success: false,
      error: `Social account is not connected (status: ${socialAccount.status})`,
    }
  }

  // Route to appropriate provider based on channel
  if (channel === 'facebook') {
    return await publishFacebookPost({
      brandId: draft.brand_id,
      jobId: job.id,
      draft: {
        id: draft.id,
        copy: draft.copy,
        hashtags: draft.hashtags,
        asset_ids: draft.asset_ids,
      },
      socialAccount: {
        id: socialAccount.id,
        account_id: socialAccount.account_id,
        token_encrypted: socialAccount.token_encrypted,
      },
    })
  } else if (channel === 'instagram_feed') {
    return await publishInstagramFeedPost({
      brandId: draft.brand_id,
      jobId: job.id,
      channel: 'instagram_feed',
      draft: {
        id: draft.id,
        copy: draft.copy,
        hashtags: draft.hashtags,
        asset_ids: draft.asset_ids,
      },
      socialAccount: {
        id: socialAccount.id,
        account_id: socialAccount.account_id,
        token_encrypted: socialAccount.token_encrypted,
        metadata: socialAccount.metadata,
      },
    })
  } else if (channel === 'instagram_story') {
    return await publishInstagramStory({
      brandId: draft.brand_id,
      jobId: job.id,
      channel: 'instagram_story',
      draft: {
        id: draft.id,
        copy: draft.copy,
        hashtags: draft.hashtags,
        asset_ids: draft.asset_ids,
      },
      socialAccount: {
        id: socialAccount.id,
        account_id: socialAccount.account_id,
        token_encrypted: socialAccount.token_encrypted,
        metadata: socialAccount.metadata,
      },
    })
  } else {
    // Unsupported channel
    return {
      success: false,
      error: `Publishing to ${channel} is not yet implemented`,
    }
  }
}

