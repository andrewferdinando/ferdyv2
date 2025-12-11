import { supabaseAdmin } from '@/lib/supabase-server'
import {
  canonicalizeChannel,
  CHANNEL_PROVIDER_MAP,
  SUPPORTED_CHANNELS,
} from '@/lib/channels'
import { publishFacebookPost } from './providers/facebook'
import { publishInstagramFeedPost, publishInstagramStory } from './providers/instagram'
import { sendPostPublished } from '@/lib/emails/send'

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

  const nowIso = new Date().toISOString()

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
      updateData.published_at = nowIso
    }

    await supabaseAdmin
      .from('post_jobs')
      .update(updateData)
      .eq('id', job.id)

    // Create or update publishes record with published_at
    // First check if a publish record already exists for this job
    const { data: existingPublish } = await supabaseAdmin
      .from('publishes')
      .select('id, published_at')
      .eq('post_job_id', job.id)
      .eq('draft_id', draft.id)
      .single()

    if (existingPublish) {
      // Update existing publish record
      await supabaseAdmin
        .from('publishes')
        .update({
          status: 'success',
          published_at: existingPublish.published_at || nowIso,
          external_post_id: publishResult.externalId,
          external_url: publishResult.externalUrl,
          error: null,
        })
        .eq('id', existingPublish.id)
    } else {
      // Create new publish record
      // Use socialAccount.id if available (it's already passed in)
      await supabaseAdmin
        .from('publishes')
        .insert({
          brand_id: draft.brand_id,
          post_job_id: job.id,
          draft_id: draft.id,
          channel: jobChannel,
          social_account_id: socialAccount?.id || null,
          status: 'success',
          published_at: nowIso,
          external_post_id: publishResult.externalId,
          external_url: publishResult.externalUrl,
        })
    }

    console.log('[publishJob] Success', {
      jobId: job.id,
      channel: jobChannel,
      externalId: publishResult.externalId,
    })

    // Send email notification to brand admins/editors
    try {
      await notifyPostPublished(draft, job, publishResult, jobChannel)
    } catch (emailError) {
      console.error('[publishJob] Failed to send post published email:', emailError)
      // Don't fail the publish if email fails
    }

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

/**
 * Send email notification to brand admins/editors when a post is published
 */
async function notifyPostPublished(
  draft: DraftRow,
  job: PostJobRow,
  publishResult: { externalId: string; externalUrl: string | null },
  channel: string
) {
  console.log(`[notifyPostPublished] Sending notifications for job ${job.id}, brand ${draft.brand_id}`)

  // Get brand details
  const { data: brand, error: brandError } = await supabaseAdmin
    .from('brands')
    .select('name, group_id, status')
    .eq('id', draft.brand_id)
    .single()

  if (brandError || !brand || brand.status !== 'active') {
    console.error('[notifyPostPublished] Brand not found or inactive:', brandError)
    return
  }

  // Get admin and editor emails for the brand
  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from('brand_memberships')
    .select('user_id, role')
    .eq('brand_id', draft.brand_id)
    .in('role', ['admin', 'editor'])
    .eq('status', 'active')

  if (membershipsError || !memberships || memberships.length === 0) {
    console.error('[notifyPostPublished] No active admins/editors found:', membershipsError)
    return
  }

  console.log(`[notifyPostPublished] Found ${memberships.length} admins/editors`)

  // Get user emails from auth
  const adminEmails: string[] = []
  for (const membership of memberships) {
    try {
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(membership.user_id)
      if (userError) {
        console.error(`[notifyPostPublished] Error fetching user ${membership.user_id}:`, userError)
        continue
      }
      if (user?.email) {
        adminEmails.push(user.email)
      }
    } catch (err) {
      console.error(`[notifyPostPublished] Exception fetching user ${membership.user_id}:`, err)
    }
  }

  if (adminEmails.length === 0) {
    console.error('[notifyPostPublished] No valid email addresses found')
    return
  }

  // Deduplicate email addresses
  const uniqueEmails = [...new Set(adminEmails)]

  console.log(`[notifyPostPublished] Sending to ${uniqueEmails.length} unique recipients`)

  // Format the published time
  const publishedAt = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  // Get app URL from environment
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.ferdy.io'
  
  // Use external URL if available, otherwise link to published page
  const postLink = publishResult.externalUrl || `${appUrl}/brands/${draft.brand_id}/schedule?tab=published`

  // Format channel name for display (e.g., "instagram_feed" -> "Instagram")
  const platformName = channel.split('_')[0].charAt(0).toUpperCase() + channel.split('_')[0].slice(1)

  // Send email to each unique admin/editor
  for (const email of uniqueEmails) {
    try {
      await sendPostPublished({
        to: email,
        brandName: brand.name,
        publishedAt,
        platform: platformName,
        postLink,
        postPreview: draft.copy?.substring(0, 200) || '',
      })
      console.log(`[notifyPostPublished] Email sent to ${email}`)
    } catch (err) {
      console.error(`[notifyPostPublished] Failed to send email to ${email}:`, err)
      // Continue sending to other recipients even if one fails
    }
  }
}
