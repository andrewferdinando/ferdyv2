import { supabaseAdmin } from '@/lib/supabase-server'
import {
  canonicalizeChannel,
  CHANNEL_PROVIDER_MAP,
  SUPPORTED_CHANNELS,
} from '@/lib/channels'

type DraftRow = {
  id: string
  brand_id: string
  channel: string | null
  status: string
  scheduled_for: string | null
  asset_ids: string[] | null
  hashtags: string[] | null
  copy: string | null
  published_at: string | null
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
  handle: string | null
  status: string
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

  const publishResult = await publishToChannel(jobChannel, draft, socialAccount)

  if (publishResult.success) {
    await supabaseAdmin
      .from('post_jobs')
      .update({
        status: 'success',
        error: null,
        external_post_id: publishResult.externalId,
        external_url: publishResult.externalUrl,
      })
      .eq('id', job.id)

    return { success: true }
  } else {
    await supabaseAdmin
      .from('post_jobs')
      .update({
        status: 'failed',
        error: publishResult.error,
      })
      .eq('id', job.id)

    return {
      success: false,
      error: publishResult.error,
    }
  }
}

async function publishToChannel(
  channel: string,
  draft: DraftRow,
  socialAccount?: SocialAccountRow,
): Promise<PublishAttemptResult> {
  if (!socialAccount) {
    return {
      success: false,
      error: `No connected social account available for ${channel}`,
    }
  }

  // TODO: Replace with real channel-specific publishing logic
  await delay(200)
  const suffix = `${channel}_${Date.now()}`
  return {
    success: true,
    externalId: suffix,
    externalUrl: `https://example.com/${channel}/${suffix}`,
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

