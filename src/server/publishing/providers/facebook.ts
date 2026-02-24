import { decryptToken } from '@/lib/encryption'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getPublicUrl } from '@/lib/storage/publicUrl'

const GRAPH_API_VERSION = 'v21.0'

/**
 * Ensure a Facebook permalink is an absolute URL.
 * The Graph API sometimes returns relative paths (e.g. "/reel/123")
 * which need to be prefixed with the Facebook domain.
 */
function ensureAbsoluteFacebookUrl(url: string): string {
  if (url.startsWith('/')) {
    return `https://www.facebook.com${url}`
  }
  return url
}

type FacebookPublishParams = {
  brandId: string
  jobId: string
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
  }
}

type FacebookPublishResult =
  | { success: true; externalId: string; externalUrl: string | null }
  | { success: false; error: string }

/**
 * Publishes a post to Facebook using the Graph API
 */
export async function publishFacebookPost(
  params: FacebookPublishParams,
): Promise<FacebookPublishResult> {
  const { brandId, jobId, draft, socialAccount } = params

  try {
    // Validate social account
    if (!socialAccount.token_encrypted) {
      return {
        success: false,
        error: 'No access token available for Facebook account',
      }
    }

    // Decrypt token
    let accessToken: string
    try {
      accessToken = decryptToken(socialAccount.token_encrypted)
    } catch (error) {
      console.error('[facebook publish] Failed to decrypt token', {
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

    const pageId = socialAccount.account_id
    const message = buildPostMessage(draft.copy, draft.hashtags)

    // Get asset info if available
    let assetInfo: { url: string; assetType: string } | null = null
    if (draft.asset_ids && draft.asset_ids.length > 0) {
      assetInfo = await getAssetSignedUrl(draft.asset_ids[0])
    }

    const isVideo = assetInfo?.assetType === 'video'

    console.log('[facebook publish] Publishing post', {
      brandId,
      jobId,
      pageId,
      hasAsset: !!assetInfo,
      assetType: assetInfo?.assetType || 'none',
      messageLength: message.length,
    })

    // Publish to Facebook
    if (assetInfo && isVideo) {
      // Post with video
      const result = await publishVideoPost(pageId, accessToken, message, assetInfo.url)
      return result
    } else if (assetInfo) {
      // Post with image
      const result = await publishPhotoPost(pageId, accessToken, message, assetInfo.url)
      return result
    } else {
      // Text-only post
      const result = await publishTextPost(pageId, accessToken, message)
      return result
    }
  } catch (error) {
    console.error('[facebook publish] Unexpected error', {
      brandId,
      jobId,
      error: error instanceof Error ? error.message : 'unknown',
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error publishing to Facebook',
    }
  }
}

/**
 * Publish a text post to Facebook
 */
async function publishTextPost(
  pageId: string,
  accessToken: string,
  message: string,
): Promise<FacebookPublishResult> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/feed`)
  url.searchParams.set('message', message)
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const responseData = await response.json()

  if (!response.ok) {
    const errorMessage =
      responseData.error?.message || `HTTP ${response.status}: ${response.statusText}`
    console.error('[facebook publish] Graph API error', {
      pageId,
      status: response.status,
      error: responseData.error,
    })
    return {
      success: false,
      error: `Facebook API error: ${errorMessage}`,
    }
  }

  const postId = responseData.id

  if (!postId) {
    console.error('[facebook publish] Post ID not returned', {
      pageId,
      responseData,
    })
    return {
      success: false,
      error: 'Facebook API did not return a post ID',
    }
  }

  // Fetch the permalink from Graph API
  let permalinkUrl: string | null = null
  try {
    const permalinkUrlObj = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${postId}`,
    )
    permalinkUrlObj.searchParams.set('fields', 'permalink_url')
    permalinkUrlObj.searchParams.set('access_token', accessToken)

    const permalinkResponse = await fetch(permalinkUrlObj.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const permalinkData = await permalinkResponse.json()

    if (permalinkResponse.ok && permalinkData.permalink_url) {
      permalinkUrl = ensureAbsoluteFacebookUrl(permalinkData.permalink_url)
    } else {
      console.warn('[facebook publish] Failed to fetch permalink', {
        pageId,
        postId,
        status: permalinkResponse.status,
        error: permalinkData.error,
      })
      // Continue without permalink - still mark as success
    }
  } catch (error) {
    console.warn('[facebook publish] Error fetching permalink', {
      pageId,
      postId,
      error: error instanceof Error ? error.message : 'unknown',
    })
    // Continue without permalink - still mark as success
  }

  console.log('[facebook publish] Success', {
    pageId,
    postId,
    permalinkUrl,
  })

  return {
    success: true,
    externalId: postId,
    externalUrl: permalinkUrl,
  }
}

/**
 * Publish a photo post to Facebook
 */
async function publishPhotoPost(
  pageId: string,
  accessToken: string,
  message: string,
  imageUrl: string,
): Promise<FacebookPublishResult> {
  // First, create the photo
  const photoUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/photos`)
  photoUrl.searchParams.set('url', imageUrl)
  photoUrl.searchParams.set('caption', message)
  photoUrl.searchParams.set('access_token', accessToken)

  const photoResponse = await fetch(photoUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const photoData = await photoResponse.json()

  if (!photoResponse.ok) {
    const errorMessage =
      photoData.error?.message || `HTTP ${photoResponse.status}: ${photoResponse.statusText}`
    console.error('[facebook publish] Photo upload error', {
      pageId,
      status: photoResponse.status,
      error: photoData.error,
    })
    return {
      success: false,
      error: `Facebook photo upload error: ${errorMessage}`,
    }
  }

  const photoId = photoData.id
  const postId = photoData.post_id || photoId

  if (!postId) {
    console.error('[facebook publish] Post ID not returned', {
      pageId,
      photoId,
      photoData,
    })
    return {
      success: false,
      error: 'Facebook API did not return a post ID',
    }
  }

  // Fetch the permalink from Graph API
  let permalinkUrl: string | null = null
  try {
    const permalinkUrlObj = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${postId}`,
    )
    permalinkUrlObj.searchParams.set('fields', 'permalink_url')
    permalinkUrlObj.searchParams.set('access_token', accessToken)

    const permalinkResponse = await fetch(permalinkUrlObj.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const permalinkData = await permalinkResponse.json()

    if (permalinkResponse.ok && permalinkData.permalink_url) {
      permalinkUrl = ensureAbsoluteFacebookUrl(permalinkData.permalink_url)
    } else {
      console.warn('[facebook publish] Failed to fetch permalink', {
        pageId,
        postId,
        status: permalinkResponse.status,
        error: permalinkData.error,
      })
      // Continue without permalink - still mark as success
    }
  } catch (error) {
    console.warn('[facebook publish] Error fetching permalink', {
      pageId,
      postId,
      error: error instanceof Error ? error.message : 'unknown',
    })
    // Continue without permalink - still mark as success
  }

  console.log('[facebook publish] Photo post success', {
    pageId,
    photoId,
    postId,
    permalinkUrl,
  })

  return {
    success: true,
    externalId: postId,
    externalUrl: permalinkUrl,
  }
}

/**
 * Publish a video post to Facebook
 */
async function publishVideoPost(
  pageId: string,
  accessToken: string,
  message: string,
  videoUrl: string,
): Promise<FacebookPublishResult> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/videos`)
  url.searchParams.set('file_url', videoUrl)
  url.searchParams.set('description', message)
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const responseData = await response.json()

  if (!response.ok) {
    const errorMessage =
      responseData.error?.message || `HTTP ${response.status}: ${response.statusText}`
    console.error('[facebook publish] Video upload error', {
      pageId,
      status: response.status,
      error: responseData.error,
    })
    return {
      success: false,
      error: `Facebook video upload error: ${errorMessage}`,
    }
  }

  const videoId = responseData.id

  if (!videoId) {
    console.error('[facebook publish] Video ID not returned', {
      pageId,
      responseData,
    })
    return {
      success: false,
      error: 'Facebook API did not return a video ID',
    }
  }

  // Fetch the permalink from Graph API
  let permalinkUrl: string | null = null
  try {
    const permalinkUrlObj = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${videoId}`,
    )
    permalinkUrlObj.searchParams.set('fields', 'permalink_url')
    permalinkUrlObj.searchParams.set('access_token', accessToken)

    const permalinkResponse = await fetch(permalinkUrlObj.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const permalinkData = await permalinkResponse.json()

    if (permalinkResponse.ok && permalinkData.permalink_url) {
      permalinkUrl = ensureAbsoluteFacebookUrl(permalinkData.permalink_url)
    } else {
      console.warn('[facebook publish] Failed to fetch video permalink', {
        pageId,
        videoId,
        status: permalinkResponse.status,
        error: permalinkData.error,
      })
      // Continue without permalink - still mark as success
    }
  } catch (error) {
    console.warn('[facebook publish] Error fetching video permalink', {
      pageId,
      videoId,
      error: error instanceof Error ? error.message : 'unknown',
    })
    // Continue without permalink - still mark as success
  }

  console.log('[facebook publish] Video post success', {
    pageId,
    videoId,
    permalinkUrl,
  })

  return {
    success: true,
    externalId: videoId,
    externalUrl: permalinkUrl,
  }
}

/**
 * Build post message from copy and hashtags
 */
function buildPostMessage(copy: string | null, hashtags: string[] | null): string {
  let message = copy || ''
  if (hashtags && hashtags.length > 0) {
    // Deduplicate: skip any hashtags already present in the copy text
    const existingInCopy = new Set(
      (message.match(/#[\p{L}\p{N}_]+/gu) || []).map((h) => h.toLowerCase()),
    )
    const newTags = hashtags
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
      .filter((tag) => !existingInCopy.has(tag.toLowerCase()))
    if (newTags.length > 0) {
      const hashtagString = newTags.join(' ')
      if (message) {
        message += `\n\n${hashtagString}`
      } else {
        message = hashtagString
      }
    }
  }
  return message.trim()
}

interface ProcessedImageRecord {
  storage_path: string
  width: number
  height: number
  processed_at: string
}

/**
 * Get signed URL for an asset
 *
 * This function will:
 * 1. Check for a processed image matching the asset's aspect_ratio
 * 2. Use the processed image if available (cropped + resized to Meta dimensions)
 * 3. Fall back to original image if no processed version exists
 */
async function getAssetSignedUrl(assetId: string): Promise<{ url: string; assetType: string } | null> {
  try {
    const { data: asset, error } = await supabaseAdmin
      .from('assets')
      .select('storage_path, aspect_ratio, processed_images, asset_type')
      .eq('id', assetId)
      .single()

    if (error || !asset) {
      console.warn('[facebook publish] Asset not found', { assetId, error })
      return null
    }

    const assetType = asset.asset_type || 'image'
    const isVideo = assetType === 'video'

    // Check for processed image matching the asset's aspect ratio
    // (skip for videos — they don't have processed versions)
    const aspectRatio = asset.aspect_ratio
    const processedImages = asset.processed_images as Record<string, ProcessedImageRecord> | null

    let storagePath = asset.storage_path
    let usingProcessed = false

    if (!isVideo && aspectRatio && processedImages && processedImages[aspectRatio]) {
      const processed = processedImages[aspectRatio]
      storagePath = processed.storage_path
      usingProcessed = true
      console.log('[facebook publish] Using processed image', {
        assetId,
        aspectRatio,
        processedPath: storagePath,
        dimensions: `${processed.width}x${processed.height}`,
      })
    } else {
      console.log(`[facebook publish] Using original ${assetType} (no processed version)`, {
        assetId,
        aspectRatio,
        originalPath: storagePath,
      })
    }

    const publicUrl = getPublicUrl(storagePath)

    if (!publicUrl) {
      console.warn('[facebook publish] Failed to build public URL', {
        assetId,
        storagePath,
        usingProcessed,
      })
      return null
    }

    return { url: publicUrl, assetType }
  } catch (error) {
    console.error('[facebook publish] Error getting asset signed URL', {
      assetId,
      error: error instanceof Error ? error.message : 'unknown',
    })
    return null
  }
}

