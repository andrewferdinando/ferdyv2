import { decryptToken } from '@/lib/encryption'
import { supabaseAdmin } from '@/lib/supabase-server'

const GRAPH_API_VERSION = 'v19.0'

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

    // Get asset URL if available
    let imageUrl: string | undefined
    if (draft.asset_ids && draft.asset_ids.length > 0) {
      const assetUrl = await getAssetSignedUrl(draft.asset_ids[0])
      if (assetUrl) {
        imageUrl = assetUrl
      }
    }

    console.log('[facebook publish] Publishing post', {
      brandId,
      jobId,
      pageId,
      hasImage: !!imageUrl,
      messageLength: message.length,
    })

    // Publish to Facebook
    if (imageUrl) {
      // Post with image
      const result = await publishPhotoPost(pageId, accessToken, message, imageUrl)
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
      permalinkUrl = permalinkData.permalink_url
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
      permalinkUrl = permalinkData.permalink_url
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
 * Get signed URL for an asset
 */
async function getAssetSignedUrl(assetId: string): Promise<string | null> {
  try {
    const { data: asset, error } = await supabaseAdmin
      .from('assets')
      .select('storage_path')
      .eq('id', assetId)
      .single()

    if (error || !asset) {
      console.warn('[facebook publish] Asset not found', { assetId, error })
      return null
    }

    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('ferdy-assets')
      .createSignedUrl(asset.storage_path, 3600) // 1 hour expiry

    if (urlError || !signedUrlData?.signedUrl) {
      console.warn('[facebook publish] Failed to create signed URL', {
        assetId,
        storagePath: asset.storage_path,
        error: urlError,
      })
      return null
    }

    return signedUrlData.signedUrl
  } catch (error) {
    console.error('[facebook publish] Error getting asset signed URL', {
      assetId,
      error: error instanceof Error ? error.message : 'unknown',
    })
    return null
  }
}

