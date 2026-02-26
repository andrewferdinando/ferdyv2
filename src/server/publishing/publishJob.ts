import { supabaseAdmin } from '@/lib/supabase-server'
import {
  canonicalizeChannel,
  CHANNEL_PROVIDER_MAP,
  SUPPORTED_CHANNELS,
} from '@/lib/channels'
import { publishFacebookPost } from './providers/facebook'
import { publishInstagramFeedPost, publishInstagramStory } from './providers/instagram'
import { sendPostPublished } from '@/lib/emails/send'
import { refreshSocialAccountToken } from '../social/tokenRefresh'
import { validateAssetForMeta } from '@/lib/publishing/validateAssetForMeta'
import {
  processImage,
  isValidAspectRatio,
  getDefaultCrop,
  pickClosestFeedRatio,
  calculateBestFit,
  type AspectRatio,
  type CropCoordinates,
} from '@/lib/image-processing/processImage'

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
  attempt_count?: number
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

  // Update job to 'publishing' status and increment attempt count
  const newAttemptCount = (job.attempt_count ?? 0) + 1
  await supabaseAdmin
    .from('post_jobs')
    .update({
      status: 'publishing',
      last_attempt_at: new Date().toISOString(),
      attempt_count: newAttemptCount,
    })
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

  // Refresh token if needed before publishing
  if (socialAccount) {
    console.log(`[publishJob] Checking if token refresh needed for ${provider} account ${socialAccount.id}`)
    const refreshResult = await refreshSocialAccountToken(socialAccount.id)
    
    if (refreshResult.refreshed) {
      console.log(`[publishJob] Token refreshed for ${provider} account ${socialAccount.id}`)
      
      // Reload social account with fresh token
      const { data: freshAccount } = await supabaseAdmin
        .from('social_accounts')
        .select('*')
        .eq('id', socialAccount.id)
        .single()
      
      if (freshAccount) {
        socialAccounts[provider] = freshAccount
      }
    } else if (!refreshResult.success) {
      console.error(`[publishJob] Token refresh failed for ${provider} account ${socialAccount.id}:`, refreshResult.error)
      // Continue with publishing - it will fail with auth error and trigger disconnection email
    }
  }

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

    // Email notification is now sent in batches after all jobs for a draft are processed
    // See notifyPostPublishedBatched in publishDueDrafts.ts

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

    // Detect if this is an auth/token error and mark account as disconnected
    if (socialAccount && isAuthError(publishResult.error)) {
      console.warn(`[publishJob] Auth error detected, marking ${provider} account ${socialAccount.id} as disconnected`)

      await supabaseAdmin
        .from('social_accounts')
        .update({
          status: 'disconnected',
          last_error: publishResult.error,
          disconnected_at: new Date().toISOString()
        })
        .eq('id', socialAccount.id)

      // Note: Disconnection email is NOT sent here per-job to avoid duplicates.
      // The consolidated notifyPublishingFailed email (sent after all jobs for a
      // draft are processed in processDraft) includes isAccountDisconnected context.
    }

    return {
      success: false,
      error: publishResult.error,
    }
  }
}

/**
 * Process assets before publishing to ensure they meet Meta requirements.
 * Generates cropped/resized versions if not already processed.
 */
async function ensureAssetsProcessed(
  assetIds: string[] | null,
  jobId: string,
  brandId: string,
  channel?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!assetIds || assetIds.length === 0) {
    return { success: true }
  }

  for (const assetId of assetIds) {
    try {
      // Fetch asset to check if it needs processing
      const { data: asset, error: fetchError } = await supabaseAdmin
        .from('assets')
        .select('id, asset_type, aspect_ratio, processed_images, storage_path, mime_type, width, height, file_size')
        .eq('id', assetId)
        .single()

      if (fetchError || !asset) {
        console.warn('[ensureAssetsProcessed] Asset not found:', { assetId, fetchError })
        continue // Skip missing assets, let the provider handle the error
      }

      // Skip videos - they don't need processing
      if (asset.asset_type === 'video') {
        continue
      }

      // Validate asset for Meta requirements
      const validation = validateAssetForMeta({
        asset_type: asset.asset_type as 'image' | 'video' | null,
        mime_type: asset.mime_type,
        width: asset.width,
        height: asset.height,
        file_size: asset.file_size,
      })

      if (!validation.valid) {
        console.error('[ensureAssetsProcessed] Asset validation failed:', {
          assetId,
          errors: validation.errors,
        })
        return {
          success: false,
          error: validation.errors[0] || 'Asset validation failed',
        }
      }

      // Check if processed image already exists for this aspect ratio
      let aspectRatio = asset.aspect_ratio
      const processedImages = asset.processed_images as Record<string, unknown> | null

      // If aspect_ratio is 'original' or unset, calculate best fit from dimensions
      // This mirrors what the Content Library does on save
      if ((!aspectRatio || !isValidAspectRatio(aspectRatio)) && asset.width && asset.height) {
        const bestFit = calculateBestFit(asset.width, asset.height)
        console.log('[ensureAssetsProcessed] No explicit aspect ratio, using best fit:', {
          assetId,
          originalAspectRatio: aspectRatio,
          calculatedBestFit: bestFit,
          dimensions: `${asset.width}x${asset.height}`,
        })
        aspectRatio = bestFit

        // Persist best fit so provider getAssetUrl functions can find the processed image
        await supabaseAdmin
          .from('assets')
          .update({ aspect_ratio: bestFit })
          .eq('id', assetId)
      }

      if (aspectRatio && isValidAspectRatio(aspectRatio)) {
        if (processedImages && processedImages[aspectRatio]) {
          console.log('[ensureAssetsProcessed] Processed image already exists:', {
            assetId,
            aspectRatio,
          })
          continue // Already processed
        }

        // Process the image
        console.log('[ensureAssetsProcessed] Processing image:', {
          assetId,
          aspectRatio,
          jobId,
        })

        // Download original image
        const { data: downloadData, error: downloadError } = await supabaseAdmin.storage
          .from('ferdy-assets')
          .download(asset.storage_path)

        if (downloadError || !downloadData) {
          console.error('[ensureAssetsProcessed] Failed to download:', {
            assetId,
            downloadError,
          })
          continue // Skip, let publishing proceed with original
        }

        // Get crop coordinates
        const { data: assetWithCrops } = await supabaseAdmin
          .from('assets')
          .select('image_crops')
          .eq('id', assetId)
          .single()

        const crops = assetWithCrops?.image_crops as Record<string, CropCoordinates> | null
        const crop: CropCoordinates = crops?.[aspectRatio] || getDefaultCrop()

        // Process image
        const arrayBuffer = await downloadData.arrayBuffer()
        const imageBuffer = Buffer.from(arrayBuffer)
        const result = await processImage(imageBuffer, aspectRatio as AspectRatio, crop)

        // Generate storage path for processed image
        const pathParts = asset.storage_path.split('/')
        const fileName = pathParts.pop() || 'image'
        const fileNameWithoutExt = fileName.split('.')[0]
        const basePath = pathParts.join('/')
        const ratioSafe = aspectRatio.replace(':', '_').replace('.', '-')
        const processedPath = `${basePath}/processed/${fileNameWithoutExt}_${ratioSafe}.jpg`

        // Upload processed image
        const { error: uploadError } = await supabaseAdmin.storage
          .from('ferdy-assets')
          .upload(processedPath, result.buffer, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (uploadError) {
          console.error('[ensureAssetsProcessed] Failed to upload:', {
            assetId,
            uploadError,
          })
          continue // Skip, let publishing proceed with original
        }

        // Update processed_images column
        const existingProcessed = processedImages || {}
        const updatedProcessed = {
          ...existingProcessed,
          [aspectRatio]: {
            storage_path: processedPath,
            width: result.width,
            height: result.height,
            processed_at: new Date().toISOString(),
          },
        }

        await supabaseAdmin
          .from('assets')
          .update({ processed_images: updatedProcessed })
          .eq('id', assetId)

        console.log('[ensureAssetsProcessed] Image processed successfully:', {
          assetId,
          aspectRatio,
          processedPath,
        })
      } else if (channel === 'instagram_feed' && (!aspectRatio || aspectRatio === 'original')) {
        // Auto-process 'original' images for IG Feed if outside allowed range (0.8–1.91)
        if (!asset.width || !asset.height) {
          console.warn('[ensureAssetsProcessed] Missing dimensions for original asset, skipping IG Feed auto-process:', { assetId })
          continue
        }

        const targetRatio = pickClosestFeedRatio(asset.width, asset.height)
        if (!targetRatio) {
          console.log('[ensureAssetsProcessed] Original aspect ratio is within IG Feed range, no processing needed:', {
            assetId,
            ratio: (asset.width / asset.height).toFixed(3),
          })
          continue
        }

        // Check if already processed for this target ratio
        if (processedImages && processedImages[targetRatio]) {
          console.log('[ensureAssetsProcessed] Auto-processed image already exists for IG Feed:', {
            assetId,
            targetRatio,
          })
          continue
        }

        console.log('[ensureAssetsProcessed] Auto-processing original image for IG Feed:', {
          assetId,
          originalRatio: (asset.width / asset.height).toFixed(3),
          targetRatio,
          jobId,
        })

        // Download original image
        const { data: downloadData, error: downloadError } = await supabaseAdmin.storage
          .from('ferdy-assets')
          .download(asset.storage_path)

        if (downloadError || !downloadData) {
          console.error('[ensureAssetsProcessed] Failed to download for IG Feed auto-process:', {
            assetId,
            downloadError,
          })
          continue
        }

        // Use default (centered) crop for auto-processing
        const crop = getDefaultCrop()

        const arrayBuffer = await downloadData.arrayBuffer()
        const imageBuffer = Buffer.from(arrayBuffer)
        const result = await processImage(imageBuffer, targetRatio, crop)

        // Generate storage path for processed image
        const pathParts = asset.storage_path.split('/')
        const fileName = pathParts.pop() || 'image'
        const fileNameWithoutExt = fileName.split('.')[0]
        const basePath = pathParts.join('/')
        const ratioSafe = targetRatio.replace(':', '_').replace('.', '-')
        const processedPath = `${basePath}/processed/${fileNameWithoutExt}_${ratioSafe}.jpg`

        // Upload processed image
        const { error: uploadError } = await supabaseAdmin.storage
          .from('ferdy-assets')
          .upload(processedPath, result.buffer, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (uploadError) {
          console.error('[ensureAssetsProcessed] Failed to upload IG Feed auto-processed image:', {
            assetId,
            uploadError,
          })
          continue
        }

        // Update processed_images column
        const existingProcessed = processedImages || {}
        const updatedProcessed = {
          ...existingProcessed,
          [targetRatio]: {
            storage_path: processedPath,
            width: result.width,
            height: result.height,
            processed_at: new Date().toISOString(),
          },
        }

        await supabaseAdmin
          .from('assets')
          .update({ processed_images: updatedProcessed })
          .eq('id', assetId)

        console.log('[ensureAssetsProcessed] IG Feed auto-processing complete:', {
          assetId,
          targetRatio,
          processedPath,
        })
      }
    } catch (error) {
      console.error('[ensureAssetsProcessed] Unexpected error:', {
        assetId,
        error: error instanceof Error ? error.message : 'unknown',
      })
      // Continue with other assets, don't fail the entire publish
    }
  }

  return { success: true }
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

  // Pre-publish: Ensure assets are processed for Meta requirements
  const processingResult = await ensureAssetsProcessed(
    draft.asset_ids,
    job.id,
    draft.brand_id,
    channel,
  )

  if (!processingResult.success) {
    return {
      success: false,
      error: processingResult.error || 'Failed to process assets',
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
/**
 * Check if an error message indicates an authentication/token issue
 */
function isAuthError(error: string): boolean {
  const authErrorPatterns = [
    'invalid_token',
    'expired_token',
    'token expired',
    'invalid access token',
    'oauth',
    'unauthorized',
    'authentication',
    'permission',
    'access denied',
    'invalid credentials',
    'token has been revoked',
    'user has not authorized',
    'error validating access token',
    'session has expired',
    'error code 190', // Meta specific: invalid OAuth token
    'error code 102', // Meta specific: session key invalid
    'error code 463', // Meta specific: session has expired
  ]
  
  const errorLower = error.toLowerCase()
  return authErrorPatterns.some(pattern => errorLower.includes(pattern))
}

/**
 * Send batched email notification to brand admins/editors when a post is published to multiple channels
 * This replaces the per-channel notification to reduce email overload
 */
export async function notifyPostPublishedBatched(
  draft: DraftRow,
  successfulJobs: Array<{ job: PostJobRow; channel: string; externalUrl: string | null }>
) {
  if (successfulJobs.length === 0) {
    return
  }

  console.log(`[notifyPostPublishedBatched] Sending batched notifications for draft ${draft.id}, ${successfulJobs.length} channels, brand ${draft.brand_id}`)

  // Get brand details
  const { data: brand, error: brandError } = await supabaseAdmin
    .from('brands')
    .select('name, group_id, status, timezone')
    .eq('id', draft.brand_id)
    .single()

  if (brandError || !brand || brand.status !== 'active') {
    console.error('[notifyPostPublishedBatched] Brand not found or inactive:', brandError)
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
    console.error('[notifyPostPublishedBatched] No active admins/editors found:', membershipsError)
    return
  }

  console.log(`[notifyPostPublishedBatched] Found ${memberships.length} admins/editors`)

  // Get user emails from auth
  const adminEmails: string[] = []
  for (const membership of memberships) {
    try {
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(membership.user_id)
      if (userError) {
        console.error(`[notifyPostPublishedBatched] Error fetching user ${membership.user_id}:`, userError)
        continue
      }
      if (user?.email) {
        adminEmails.push(user.email)
      }
    } catch (err) {
      console.error(`[notifyPostPublishedBatched] Exception fetching user ${membership.user_id}:`, err)
    }
  }

  if (adminEmails.length === 0) {
    console.error('[notifyPostPublishedBatched] No valid email addresses found')
    return
  }

  // Deduplicate email addresses
  const uniqueEmails = [...new Set(adminEmails)]

  console.log(`[notifyPostPublishedBatched] Sending to ${uniqueEmails.length} unique recipients`)

  // Format the published time in the brand's timezone
  const brandTz = brand.timezone || 'UTC'
  const publishedAt = new Date().toLocaleString('en-US', {
    timeZone: brandTz,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  // Get app URL from environment
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.ferdy.io'
  
  // Build channels array with formatted names and links
  const channels = successfulJobs.map(({ channel, externalUrl }) => {
    // Format channel name for display (e.g., "instagram_feed" -> "Instagram Feed")
    const parts = channel.split('_')
    const platformName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    const channelType = parts.length > 1 
      ? parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
      : ''
    const displayName = channelType ? `${platformName} ${channelType}` : platformName
    
    return {
      name: displayName,
      channel: channel,
      url: externalUrl || null,
    }
  })

  // Use first external URL if available, otherwise link to published page
  const primaryExternalUrl = successfulJobs.find(j => j.externalUrl)?.externalUrl || null
  const postLink = primaryExternalUrl || `${appUrl}/brands/${draft.brand_id}/schedule?tab=published`

  // Send email to each unique admin/editor
  for (const email of uniqueEmails) {
    try {
      await sendPostPublished({
        to: email,
        brandName: brand.name,
        publishedAt,
        channels,
        postLink,
        postPreview: draft.copy?.substring(0, 200) || '',
      })
      console.log(`[notifyPostPublishedBatched] Email sent to ${email}`)
    } catch (err) {
      console.error(`[notifyPostPublishedBatched] Failed to send email to ${email}:`, err)
      // Continue sending to other recipients even if one fails
    }
  }
}
