import { decryptToken } from '@/lib/encryption'

type SocialAccountInput = {
  id: string
  brand_id: string
  provider: string
  account_id: string
  token_encrypted: string | null
  metadata: Record<string, unknown> | null
}

const GRAPH_API_VERSION = 'v19.0'

function getMetadataValue<T = unknown>(metadata: Record<string, unknown> | null | undefined, key: string) {
  if (!metadata) return undefined
  const value = metadata[key]
  return value as T | undefined
}

async function fetchGraphApi(url: URL) {
  try {
    const response = await fetch(url, { method: 'GET' })
    const raw = await response.text()

    if (!response.ok) {
      console.warn('[meta posts] request failed', {
        url: url.toString(),
        status: response.status,
        body: raw.slice(0, 200),
      })
      return null
    }

    try {
      return JSON.parse(raw) as { data?: Array<Record<string, unknown>> }
    } catch (error) {
      console.warn('[meta posts] failed to parse response', {
        url: url.toString(),
        error: error instanceof Error ? error.message : 'unknown',
        body: raw.slice(0, 200),
      })
      return null
    }
  } catch (error) {
    console.warn('[meta posts] network error', {
      url: url.toString(),
      error: error instanceof Error ? error.message : 'unknown',
    })
    return null
  }
}

function sanitiseMessages(items: Array<Record<string, unknown>> | undefined, field: string): string[] {
  if (!Array.isArray(items)) return []
  const posts: string[] = []
  for (const item of items) {
    const value = item?.[field]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length > 0) {
        posts.push(trimmed)
      }
    }
    if (posts.length >= 10) break
  }
  return posts.slice(0, 10)
}

export async function fetchRecentPostsForSocialAccount(socialAccount: SocialAccountInput): Promise<string[]> {
  try {
    if (!socialAccount.token_encrypted) {
      console.warn('[meta posts] no token available', { socialAccountId: socialAccount.id })
      return []
    }

    const accessToken = decryptToken(socialAccount.token_encrypted)
    if (!accessToken) {
      console.warn('[meta posts] failed to decrypt token', { socialAccountId: socialAccount.id })
      return []
    }

    if (socialAccount.provider === 'facebook') {
      const pageId =
        getMetadataValue<string>(socialAccount.metadata, 'pageId') ??
        getMetadataValue<string>(socialAccount.metadata, 'facebookPageId') ??
        socialAccount.account_id

      if (!pageId) {
        console.warn('[meta posts] missing page id for facebook account', { socialAccountId: socialAccount.id })
        return []
      }

      const postsUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/posts`)
      postsUrl.searchParams.set('fields', 'message,created_time')
      postsUrl.searchParams.set('limit', '10')
      postsUrl.searchParams.set('access_token', accessToken)

      const data = await fetchGraphApi(postsUrl)
      return sanitiseMessages(data?.data, 'message')
    }

    if (socialAccount.provider === 'instagram') {
      const instagramAccountId =
        getMetadataValue<string>(socialAccount.metadata, 'instagramBusinessAccountId') ??
        getMetadataValue<string>(socialAccount.metadata, 'instagram_business_account_id') ??
        socialAccount.account_id

      if (!instagramAccountId) {
        console.warn('[meta posts] missing instagram business account id', { socialAccountId: socialAccount.id })
        return []
      }

      const mediaUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media`)
      mediaUrl.searchParams.set('fields', 'caption,timestamp')
      mediaUrl.searchParams.set('limit', '10')
      mediaUrl.searchParams.set('access_token', accessToken)

      const data = await fetchGraphApi(mediaUrl)
      return sanitiseMessages(data?.data, 'caption')
    }

    return []
  } catch (error) {
    console.error('[meta posts] unexpected error', {
      socialAccountId: socialAccount.id,
      provider: socialAccount.provider,
      error: error instanceof Error ? error.message : 'unknown',
    })
    return []
  }
}


