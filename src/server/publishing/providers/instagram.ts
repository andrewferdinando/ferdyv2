import { decryptToken } from '@/lib/encryption'
import { supabaseAdmin } from '@/lib/supabase-server'

const GRAPH_API_VERSION = 'v19.0'

/**
 * Polls Instagram media container status until it's ready
 * Returns true if FINISHED, false if ERROR or timeout
 */
async function waitForInstagramMediaReady(
  creationId: string,
  accessToken: string,
  brandId: string,
  jobId: string,
  channel: string,
): Promise<{ ready: boolean; statusCode: string | null }> {
  const maxAttempts = 20
  const delayMs = 1000 // 1 second
  let containerStatus: string | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusUrl = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${creationId}`,
    )
    statusUrl.searchParams.set('fields', 'status_code')
    statusUrl.searchParams.set('access_token', accessToken)

    const statusResponse = await fetch(statusUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const statusData = await statusResponse.json()

    if (!statusResponse.ok) {
      console.error('[instagram publish] Status check error', {
        brandId,
        jobId,
        channel,
        creationId,
        attempt,
        status: statusResponse.status,
        error: statusData.error,
      })
      // Continue to next attempt
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }
      break
    }

    containerStatus = statusData.status_code

    console.log('[instagram publish] Container status check', {
      brandId,
      jobId,
      channel,
      creationId,
      attempt,
      status_code: containerStatus,
    })

    if (containerStatus === 'FINISHED') {
      return { ready: true, statusCode: containerStatus }
    }

    if (containerStatus === 'ERROR') {
      console.error('[instagram publish] Container status is ERROR', {
        brandId,
        jobId,
        channel,
        creationId,
        attempt,
        status_code: containerStatus,
      })
      return { ready: false, statusCode: containerStatus }
    }

    // If PROCESSING or other status, wait before next attempt
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  // Timeout - container not ready after all attempts
  console.error('[instagram publish] Container not ready after polling', {
    brandId,
    jobId,
    channel,
    creationId,
    maxAttempts,
    finalStatus: containerStatus,
  })
  return { ready: false, statusCode: containerStatus }
}

type InstagramPublishParams = {
  brandId: string
  jobId: string
  channel: 'instagram_feed' | 'instagram_story'
  draft: {
    id: string
    copy: string | null
    hashtags: string[] | null
    asset_ids: string[] | null
  }
  socialAccount: {
    id: string
    account_id: string
    token_encrypted: string | null
    metadata?: Record<string, unknown> | null
  }
}

type InstagramPublishResult =
  | { success: true; externalId: string; externalUrl: string | null }
  | { success: false; error: string }

/**
 * Publishes a post to Instagram Feed using the Graph API
 */
export async function publishInstagramFeedPost(
  params: InstagramPublishParams,
): Promise<InstagramPublishResult> {
  const { brandId, jobId, draft, socialAccount } = params

  try {
    // Validate social account
    if (!socialAccount.token_encrypted) {
      return {
        success: false,
        error: 'No access token available for Instagram account',
      }
    }

    // Decrypt token
    let accessToken: string
    try {
      accessToken = decryptToken(socialAccount.token_encrypted)
    } catch (error) {
      console.error('[instagram feed publish] Failed to decrypt token', {
        brandId,
        jobId,
        socialAccountId: socialAccount.id,
        error: error instanceof Error ? error.message : 'unknown',
      })
      return {
        success: false,
        error: 'Failed to decrypt access token',
      }
    }

    // Get Instagram Business Account ID
    // It might be in metadata or account_id directly
    const igAccountId =
      getMetadataValue<string>(socialAccount.metadata, 'instagramBusinessAccountId') ||
      getMetadataValue<string>(socialAccount.metadata, 'instagram_business_account_id') ||
      socialAccount.account_id

    if (!igAccountId) {
      return {
        success: false,
        error: 'Instagram Business Account ID not found',
      }
    }

    // Get asset URL (required for Instagram)
    if (!draft.asset_ids || draft.asset_ids.length === 0) {
      return {
        success: false,
        error: 'Instagram Feed posts require at least one image',
      }
    }

    // Instagram requires publicly accessible URLs, not signed URLs
    const imageUrl = await getAssetPublicUrl(draft.asset_ids[0])
    if (!imageUrl) {
      return {
        success: false,
        error: 'Failed to get public image URL for Instagram post',
      }
    }

    const caption = buildPostMessage(draft.copy, draft.hashtags)

    console.log('[instagram feed publish] Publishing post', {
      brandId,
      jobId,
      channel: 'instagram_feed',
      igAccountId,
      imageUrl: imageUrl.substring(0, 100) + '...', // Log partial URL (no secrets)
      captionLength: caption.length,
    })

    // Step 1: Create media container
    const containerUrl = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${igAccountId}/media`,
    )
    containerUrl.searchParams.set('image_url', imageUrl)
    containerUrl.searchParams.set('caption', caption)
    containerUrl.searchParams.set('access_token', accessToken)

    const containerResponse = await fetch(containerUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const containerData = await containerResponse.json()

    if (!containerResponse.ok) {
      // Log full response for debugging
      const errorMessage =
        containerData.error?.message ||
        containerData.error?.error_user_msg ||
        JSON.stringify(containerData.error) ||
        `HTTP ${containerResponse.status}: ${containerResponse.statusText}`
      
      console.error('[instagram feed publish] Container creation error', {
        brandId,
        jobId,
        channel: 'instagram_feed',
        igAccountId,
        status: containerResponse.status,
        statusText: containerResponse.statusText,
        error: containerData.error,
        fullResponse: JSON.stringify(containerData),
      })
      
      return {
        success: false,
        error: `Instagram container creation failed: ${errorMessage}`,
      }
    }

    // Check for creation_id in response
    const creationId = containerData.id

    if (!creationId) {
      // Log full response when creation_id is missing
      console.error('[instagram feed publish] Container creation did not return id', {
        brandId,
        jobId,
        channel: 'instagram_feed',
        igAccountId,
        fullResponse: JSON.stringify(containerData),
        responseKeys: Object.keys(containerData),
      })
      
      const errorMessage = containerData.error?.message || 
        containerData.error?.error_user_msg ||
        JSON.stringify(containerData) ||
        'Container creation did not return creation_id'
      
      return {
        success: false,
        error: `Instagram container creation failed: ${errorMessage}`,
      }
    }

    console.log('[instagram feed publish] Container created', {
      brandId,
      jobId,
      channel: 'instagram_feed',
      igAccountId,
      creationId,
    })

    // Step 2: Wait for media container to be ready
    const waitResult = await waitForInstagramMediaReady(
      creationId,
      accessToken,
      brandId,
      jobId,
      'instagram_feed',
    )

    if (!waitResult.ready) {
      const errorMessage =
        waitResult.statusCode === 'ERROR'
          ? 'Instagram media container creation failed with ERROR status'
          : 'Instagram media container is still processing after waiting, please retry later'
      
      return {
        success: false,
        error: errorMessage,
      }
    }

    // Step 3: Publish the media (now that container is ready)
    const publishUrl = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${igAccountId}/media_publish`,
    )
    publishUrl.searchParams.set('creation_id', creationId)
    publishUrl.searchParams.set('access_token', accessToken)

    const publishResponse = await fetch(publishUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const publishData = await publishResponse.json()

    if (!publishResponse.ok) {
      const errorMessage =
        publishData.error?.message ||
        publishData.error?.error_user_msg ||
        JSON.stringify(publishData.error) ||
        `HTTP ${publishResponse.status}: ${publishResponse.statusText}`
      
      console.error('[instagram feed publish] Publish error', {
        brandId,
        jobId,
        channel: 'instagram_feed',
        igAccountId,
        creationId,
        status: publishResponse.status,
        statusText: publishResponse.statusText,
        error: publishData.error,
        fullResponse: JSON.stringify(publishData),
      })
      
      return {
        success: false,
        error: `Instagram publish failed: ${errorMessage}`,
      }
    }

    const mediaId = publishData.id

    if (!mediaId) {
      console.error('[instagram feed publish] Publish did not return media id', {
        brandId,
        jobId,
        channel: 'instagram_feed',
        igAccountId,
        creationId,
        fullResponse: JSON.stringify(publishData),
        responseKeys: Object.keys(publishData),
      })
      
      const errorMessage = publishData.error?.message ||
        publishData.error?.error_user_msg ||
        JSON.stringify(publishData) ||
        'Publish did not return media id'
      
      return {
        success: false,
        error: `Instagram publish failed: ${errorMessage}`,
      }
    }

    const postUrl = mediaId ? `https://instagram.com/p/${mediaId}` : null

    console.log('[instagram feed publish] Success', {
      brandId,
      jobId,
      channel: 'instagram_feed',
      igAccountId,
      creationId,
      mediaId,
      postUrl,
    })

    return {
      success: true,
      externalId: mediaId,
      externalUrl: postUrl,
    }
  } catch (error) {
    console.error('[instagram feed publish] Unexpected error', {
      brandId,
      jobId,
      error: error instanceof Error ? error.message : 'unknown',
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error publishing to Instagram Feed',
    }
  }
}

/**
 * Publishes a post to Instagram Story using the Graph API
 */
export async function publishInstagramStory(
  params: InstagramPublishParams,
): Promise<InstagramPublishResult> {
  const { brandId, jobId, draft, socialAccount } = params

  try {
    // Validate social account
    if (!socialAccount.token_encrypted) {
      return {
        success: false,
        error: 'No access token available for Instagram account',
      }
    }

    // Decrypt token
    let accessToken: string
    try {
      accessToken = decryptToken(socialAccount.token_encrypted)
    } catch (error) {
      console.error('[instagram story publish] Failed to decrypt token', {
        brandId,
        jobId,
        socialAccountId: socialAccount.id,
        error: error instanceof Error ? error.message : 'unknown',
      })
      return {
        success: false,
        error: 'Failed to decrypt access token',
      }
    }

    // Get Instagram Business Account ID
    const igAccountId =
      getMetadataValue<string>(socialAccount.metadata, 'instagramBusinessAccountId') ||
      getMetadataValue<string>(socialAccount.metadata, 'instagram_business_account_id') ||
      socialAccount.account_id

    if (!igAccountId) {
      return {
        success: false,
        error: 'Instagram Business Account ID not found',
      }
    }

    // Get asset URL (required for Instagram Story)
    if (!draft.asset_ids || draft.asset_ids.length === 0) {
      return {
        success: false,
        error: 'Instagram Story posts require at least one image',
      }
    }

    // Instagram requires publicly accessible URLs, not signed URLs
    const imageUrl = await getAssetPublicUrl(draft.asset_ids[0])
    if (!imageUrl) {
      return {
        success: false,
        error: 'Failed to get public image URL for Instagram Story',
      }
    }

    console.log('[instagram story publish] Publishing story', {
      brandId,
      jobId,
      channel: 'instagram_story',
      igAccountId,
      imageUrl: imageUrl.substring(0, 100) + '...', // Log partial URL (no secrets)
    })

    // Instagram Story uses a similar two-step process but with media_type=STORIES
    // Step 1: Create story media container
    const containerUrl = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${igAccountId}/media`,
    )
    containerUrl.searchParams.set('image_url', imageUrl)
    containerUrl.searchParams.set('media_type', 'STORIES')
    // Stories can have a caption but it's optional
    if (draft.copy || (draft.hashtags && draft.hashtags.length > 0)) {
      const caption = buildPostMessage(draft.copy, draft.hashtags)
      containerUrl.searchParams.set('caption', caption)
    }
    containerUrl.searchParams.set('access_token', accessToken)

    const containerResponse = await fetch(containerUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const containerData = await containerResponse.json()

    if (!containerResponse.ok) {
      const errorMessage =
        containerData.error?.message ||
        containerData.error?.error_user_msg ||
        JSON.stringify(containerData.error) ||
        `HTTP ${containerResponse.status}: ${containerResponse.statusText}`
      
      console.error('[instagram story publish] Container creation error', {
        brandId,
        jobId,
        channel: 'instagram_story',
        igAccountId,
        status: containerResponse.status,
        statusText: containerResponse.statusText,
        error: containerData.error,
        fullResponse: JSON.stringify(containerData),
      })
      
      return {
        success: false,
        error: `Instagram Story container creation failed: ${errorMessage}`,
      }
    }

    const creationId = containerData.id

    if (!creationId) {
      console.error('[instagram story publish] Container creation did not return id', {
        brandId,
        jobId,
        channel: 'instagram_story',
        igAccountId,
        fullResponse: JSON.stringify(containerData),
        responseKeys: Object.keys(containerData),
      })
      
      const errorMessage = containerData.error?.message ||
        containerData.error?.error_user_msg ||
        JSON.stringify(containerData) ||
        'Container creation did not return creation_id'
      
      return {
        success: false,
        error: `Instagram Story container creation failed: ${errorMessage}`,
      }
    }

    console.log('[instagram story publish] Container created', {
      brandId,
      jobId,
      channel: 'instagram_story',
      igAccountId,
      creationId,
    })

    // Step 2: Wait for media container to be ready
    const waitResult = await waitForInstagramMediaReady(
      creationId,
      accessToken,
      brandId,
      jobId,
      'instagram_story',
    )

    if (!waitResult.ready) {
      const errorMessage =
        waitResult.statusCode === 'ERROR'
          ? 'Instagram Story media container creation failed with ERROR status'
          : 'Instagram Story media container is still processing after waiting, please retry later'
      
      return {
        success: false,
        error: errorMessage,
      }
    }

    // Step 3: Publish the story (now that container is ready)
    const publishUrl = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${igAccountId}/media_publish`,
    )
    publishUrl.searchParams.set('creation_id', creationId)
    publishUrl.searchParams.set('access_token', accessToken)

    const publishResponse = await fetch(publishUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const publishData = await publishResponse.json()

    if (!publishResponse.ok) {
      const errorCode = publishData.error?.code
      const errorSubcode = publishData.error?.error_subcode
      
      // Check for the specific "Media ID is not available" error (9007/2207027)
      // This can happen even after waiting if the container isn't fully ready
      if (errorCode === 9007 && errorSubcode === 2207027) {
        const errorMessage =
          publishData.error?.error_user_msg ||
          publishData.error?.message ||
          'The media is not ready for publishing, please wait for a moment'
        
        console.error('[instagram story publish] Media not ready error after polling', {
          brandId,
          jobId,
          channel: 'instagram_story',
          igAccountId,
          creationId,
          errorCode,
          errorSubcode,
          errorMessage,
        })
        
        return {
          success: false,
          error: `Instagram Story publish failed: ${errorMessage}`,
        }
      }
      
      // Other errors
      const errorMessage =
        publishData.error?.error_user_msg ||
        publishData.error?.message ||
        JSON.stringify(publishData.error) ||
        `HTTP ${publishResponse.status}: ${publishResponse.statusText}`
      
      console.error('[instagram story publish] Publish error', {
        brandId,
        jobId,
        channel: 'instagram_story',
        igAccountId,
        creationId,
        status: publishResponse.status,
        statusText: publishResponse.statusText,
        error: publishData.error,
        fullResponse: JSON.stringify(publishData),
      })
      
      return {
        success: false,
        error: `Instagram Story publish failed: ${errorMessage}`,
      }
    }

    const mediaId = publishData.id

    if (!mediaId) {
      console.error('[instagram story publish] Publish did not return media id', {
        brandId,
        jobId,
        channel: 'instagram_story',
        igAccountId,
        creationId,
        fullResponse: JSON.stringify(publishData),
        responseKeys: Object.keys(publishData),
      })
      
      const errorMessage = publishData.error?.message ||
        publishData.error?.error_user_msg ||
        JSON.stringify(publishData) ||
        'Publish did not return media id'
      
      return {
        success: false,
        error: `Instagram Story publish failed: ${errorMessage}`,
      }
    }

    const postUrl = mediaId ? `https://instagram.com/stories/${igAccountId}/${mediaId}` : null

    console.log('[instagram story publish] Success', {
      brandId,
      jobId,
      channel: 'instagram_story',
      igAccountId,
      creationId,
      mediaId,
      postUrl,
    })

    return {
      success: true,
      externalId: mediaId,
      externalUrl: postUrl,
    }
  } catch (error) {
    console.error('[instagram story publish] Unexpected error', {
      brandId,
      jobId,
      error: error instanceof Error ? error.message : 'unknown',
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error publishing to Instagram Story',
    }
  }
}

/**
 * Build post message from copy and hashtags
 */
function buildPostMessage(copy: string | null, hashtags: string[] | null): string {
  let message = copy || ''
  if (hashtags && hashtags.length > 0) {
    const hashtagString = hashtags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ')
    if (message) {
      message += `\n\n${hashtagString}`
    } else {
      message = hashtagString
    }
  }
  return message.trim()
}

/**
 * Get public URL for an asset
 * Instagram Graph API requires publicly accessible URLs (not signed URLs)
 * Meta's servers need to be able to fetch the image
 */
async function getAssetPublicUrl(assetId: string): Promise<string | null> {
  try {
    const { data: asset, error } = await supabaseAdmin
      .from('assets')
      .select('storage_path')
      .eq('id', assetId)
      .single()

    if (error || !asset) {
      console.warn('[instagram publish] Asset not found', { assetId, error })
      return null
    }

    // Use getPublicUrl instead of createSignedUrl for Instagram
    // Instagram Graph API requires publicly accessible URLs
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('ferdy-assets')
      .getPublicUrl(asset.storage_path)

    if (!publicUrlData?.publicUrl) {
      console.warn('[instagram publish] Failed to get public URL', {
        assetId,
        storagePath: asset.storage_path,
      })
      return null
    }

    return publicUrlData.publicUrl
  } catch (error) {
    console.error('[instagram publish] Error getting asset public URL', {
      assetId,
      error: error instanceof Error ? error.message : 'unknown',
    })
    return null
  }
}

/**
 * Get metadata value helper
 */
function getMetadataValue<T = unknown>(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): T | undefined {
  if (!metadata) return undefined
  const value = metadata[key]
  return value as T | undefined
}

