import { ConnectedAccount, OAuthCallbackArgs, OAuthCallbackResult, OAuthStartOptions, OAuthStartResult } from './types'

const FACEBOOK_SCOPES = [
  'pages_manage_posts',
  'pages_read_engagement',
  'pages_show_list',
  'instagram_basic',
  'instagram_manage_insights',
  'instagram_content_publish',
  'business_management',
].join(',')

function getFacebookConfig() {
  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI || `${siteUrl.replace(/\/$/, '')}/api/integrations/facebook/callback`

  if (!appId || !appSecret) {
    throw new Error('Facebook OAuth configuration is missing. Ensure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are set.')
  }

  return {
    appId,
    appSecret,
    redirectUri,
  }
}

export function getFacebookAuthorizationUrl({ state, redirectUri }: OAuthStartOptions): OAuthStartResult {
  const { appId, redirectUri: defaultRedirect } = getFacebookConfig()
  const finalRedirect = redirectUri ?? defaultRedirect
  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  authUrl.searchParams.set('client_id', appId)
  authUrl.searchParams.set('redirect_uri', finalRedirect)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', FACEBOOK_SCOPES)

  return { url: authUrl.toString() }
}

async function exchangeFacebookCodeForToken(code: string, redirectUriOverride?: string) {
  const { appId, appSecret, redirectUri } = getFacebookConfig()
  const finalRedirect = redirectUriOverride ?? redirectUri
  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('redirect_uri', finalRedirect)
  tokenUrl.searchParams.set('code', code)

  const response = await fetch(tokenUrl, { method: 'GET' })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Facebook token exchange failed: ${response.status} ${detail}`)
  }

  return (await response.json()) as {
    access_token: string
    token_type: string
    expires_in?: number
  }
}

async function fetchFacebookPages(userAccessToken: string) {
  const pagesUrl = new URL('https://graph.facebook.com/v19.0/me/accounts')
  pagesUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account')
  pagesUrl.searchParams.set('access_token', userAccessToken)

  const response = await fetch(pagesUrl, { method: 'GET' })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Failed to list Facebook pages: ${response.status} ${detail}`)
  }

  return (await response.json()) as {
    data?: Array<{
      id: string
      name: string
      access_token: string
      instagram_business_account?: { id: string }
    }>
  }
}

async function fetchInstagramAccount(instagramId: string, pageAccessToken: string) {
  const igUrl = new URL(`https://graph.facebook.com/v19.0/${instagramId}`)
  igUrl.searchParams.set('fields', 'id,username,name')
  igUrl.searchParams.set('access_token', pageAccessToken)

  const response = await fetch(igUrl, { method: 'GET' })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Failed to fetch Instagram account details: ${response.status} ${detail}`)
  }

  return (await response.json()) as {
    id: string
    username?: string
    name?: string
  }
}

export async function handleFacebookCallback({
  code,
  redirectUri,
}: OAuthCallbackArgs): Promise<OAuthCallbackResult> {
  const tokenResponse = await exchangeFacebookCodeForToken(code, redirectUri)
  const pagesResponse = await fetchFacebookPages(tokenResponse.access_token)

  const pages = pagesResponse.data || []
  if (!pages.length) {
    throw new Error('No Facebook pages were found for this account. Please ensure you manage at least one page.')
  }

  const primaryPage = pages[0]
  const accounts: ConnectedAccount[] = [
    {
      provider: 'facebook',
      accountId: primaryPage.id,
      handle: primaryPage.name,
      accessToken: primaryPage.access_token,
      refreshToken: null,
      expiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : undefined,
    },
  ]

  if (primaryPage.instagram_business_account?.id) {
    try {
      const instagramAccount = await fetchInstagramAccount(
        primaryPage.instagram_business_account.id,
        primaryPage.access_token,
      )

      accounts.push({
        provider: 'instagram',
        accountId: instagramAccount.id,
        handle: instagramAccount.username || instagramAccount.name || 'Instagram account',
        accessToken: primaryPage.access_token,
        refreshToken: null,
        expiresAt: tokenResponse.expires_in
          ? new Date(Date.now() + tokenResponse.expires_in * 1000)
          : undefined,
        metadata: {
          facebookPageId: primaryPage.id,
        },
      })
    } catch (error) {
      console.warn('Failed to load linked Instagram account:', error)
    }
  }

  return { accounts }
}

export async function revokeFacebookAccess(pageId: string, pageAccessToken: string) {
  try {
    const revokeUrl = new URL(`https://graph.facebook.com/v19.0/${pageId}/permissions`)
    revokeUrl.searchParams.set('access_token', pageAccessToken)
    const response = await fetch(revokeUrl, { method: 'DELETE' })
    if (!response.ok) {
      const detail = await response.text()
      console.warn(`Failed to revoke Facebook permissions: ${response.status} ${detail}`)
    }
  } catch (error) {
    console.warn('Error revoking Facebook access:', error)
  }
}

