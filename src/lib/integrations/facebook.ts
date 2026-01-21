import {
  ConnectedAccount,
  OAuthCallbackArgs,
  OAuthCallbackResult,
  OAuthLogger,
  OAuthStartOptions,
  OAuthStartResult,
} from './types'

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
  const clientId = process.env.FACEBOOK_CLIENT_ID
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI || `${siteUrl.replace(/\/$/, '')}/api/integrations/facebook/callback`

  if (!clientId || !clientSecret) {
    throw new Error(
      'Facebook OAuth configuration is missing. Ensure FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET are set.',
    )
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  }
}

export function getFacebookAuthorizationUrl({ state, redirectUri }: OAuthStartOptions): OAuthStartResult {
  const { clientId, redirectUri: defaultRedirect } = getFacebookConfig()
  const finalRedirect = redirectUri ?? defaultRedirect
  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', finalRedirect)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', FACEBOOK_SCOPES)

  return { url: authUrl.toString() }
}

async function exchangeFacebookCodeForToken(
  code: string,
  redirectUriOverride: string | undefined,
  logger?: OAuthLogger,
) {
  const { clientId, clientSecret, redirectUri } = getFacebookConfig()
  const finalRedirect = redirectUriOverride ?? redirectUri
  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: finalRedirect,
    code,
  })

  logger?.('token_request', {
    provider: 'facebook',
    url: `${tokenUrl.origin}${tokenUrl.pathname}`,
    body: {
      client_id: clientId,
      client_secret: '[redacted]',
      redirect_uri: finalRedirect,
      code: `${code.slice(0, 8)}…`,
    },
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })
  const raw = await response.text()

  console.log('[token]', { provider: 'facebook', status: response.status, raw: raw.slice(0, 500) })

  logger?.('token_response', {
    provider: 'facebook',
    status: response.status,
    ok: response.ok,
    raw: raw.slice(0, 500),
  })

  if (!response.ok) {
    throw new Error(`TOKEN_EXCHANGE_FAILED:facebook:${response.status}:${raw.slice(0, 200)}`)
  }

  let tokenData: { access_token: string; token_type: string; expires_in?: number }
  try {
    tokenData = JSON.parse(raw)
  } catch (error) {
    logger?.('token_parse_error', {
      provider: 'facebook',
      error: error instanceof Error ? error.message : 'unknown',
      raw: raw.slice(0, 200),
    })
    throw new Error('TOKEN_EXCHANGE_FAILED:facebook:invalid_json')
  }

  // Exchange short-lived token for long-lived token (60 days)
  // This is crucial: Page tokens obtained with a long-lived user token are "never-expiring"
  logger?.('long_lived_token_exchange', {
    provider: 'facebook',
    step: 'starting',
  })

  const longLivedUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
  longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
  longLivedUrl.searchParams.set('client_id', clientId)
  longLivedUrl.searchParams.set('client_secret', clientSecret)
  longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

  const longLivedResponse = await fetch(longLivedUrl, { method: 'GET' })
  const longLivedRaw = await longLivedResponse.text()

  logger?.('long_lived_token_response', {
    provider: 'facebook',
    status: longLivedResponse.status,
    ok: longLivedResponse.ok,
    raw: longLivedRaw.slice(0, 500),
  })

  if (longLivedResponse.ok) {
    try {
      const longLivedData = JSON.parse(longLivedRaw) as { access_token: string; expires_in?: number }
      console.log('[facebook] Exchanged for long-lived token, expires_in:', longLivedData.expires_in)
      return {
        access_token: longLivedData.access_token,
        token_type: 'bearer',
        expires_in: longLivedData.expires_in,
      }
    } catch {
      // Fall back to short-lived token if parsing fails
      console.warn('[facebook] Failed to parse long-lived token response, using short-lived token')
    }
  } else {
    console.warn('[facebook] Failed to exchange for long-lived token, using short-lived token')
  }

  return tokenData
}

async function fetchFacebookUserProfile(userAccessToken: string, logger?: OAuthLogger) {
  const profileUrl = new URL('https://graph.facebook.com/v19.0/me')
  profileUrl.searchParams.set('fields', 'id,name,email')
  profileUrl.searchParams.set('access_token', userAccessToken)

  try {
    const response = await fetch(profileUrl, { method: 'GET' })
    const raw = await response.text()

    logger?.('facebook_user_profile', {
      provider: 'facebook',
      status: response.status,
      ok: response.ok,
      raw: raw.slice(0, 500),
    })

    if (response.ok) {
      return JSON.parse(raw) as { id: string; name?: string; email?: string }
    }
  } catch (error) {
    logger?.('facebook_user_profile_error', {
      provider: 'facebook',
      error: error instanceof Error ? error.message : 'unknown',
    })
  }
  return null
}

async function fetchTokenPermissions(userAccessToken: string, logger?: OAuthLogger) {
  const permissionsUrl = new URL('https://graph.facebook.com/v19.0/me/permissions')
  permissionsUrl.searchParams.set('access_token', userAccessToken)

  try {
    const response = await fetch(permissionsUrl, { method: 'GET' })
    const raw = await response.text()

    logger?.('facebook_permissions_response', {
      provider: 'facebook',
      status: response.status,
      ok: response.ok,
      raw: raw.slice(0, 1000),
    })

    if (response.ok) {
      const data = JSON.parse(raw) as { data?: Array<{ permission: string; status: string }> }
      return data.data || []
    }
  } catch (error) {
    logger?.('facebook_permissions_error', {
      provider: 'facebook',
      error: error instanceof Error ? error.message : 'unknown',
    })
  }
  return []
}

interface FacebookPagesResult {
  data?: Array<{
    id: string
    name: string
    access_token: string
    instagram_business_account?: { id: string }
  }>
  _debug?: {
    userId?: string
    userName?: string
    grantedPermissions: string[]
    declinedPermissions: string[]
    hasPageShowList: boolean
    hasPagesManagePosts: boolean
  }
}

async function fetchFacebookPages(userAccessToken: string, logger?: OAuthLogger): Promise<FacebookPagesResult> {
  // First fetch user profile to see who is authorizing
  const userProfile = await fetchFacebookUserProfile(userAccessToken, logger)

  // Then check what permissions the token actually has
  const permissions = await fetchTokenPermissions(userAccessToken, logger)
  const grantedPermissions = permissions.filter(p => p.status === 'granted').map(p => p.permission)
  const declinedPermissions = permissions.filter(p => p.status === 'declined').map(p => p.permission)

  const debugInfo = {
    userId: userProfile?.id,
    userName: userProfile?.name,
    grantedPermissions,
    declinedPermissions,
    hasPageShowList: grantedPermissions.includes('pages_show_list'),
    hasPagesManagePosts: grantedPermissions.includes('pages_manage_posts'),
  }

  logger?.('facebook_token_permissions', {
    provider: 'facebook',
    ...debugInfo,
  })

  const pagesUrl = new URL('https://graph.facebook.com/v19.0/me/accounts')
  pagesUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account')
  pagesUrl.searchParams.set('access_token', userAccessToken)

  logger?.('facebook_pages_request', {
    provider: 'facebook',
    url: `${pagesUrl.origin}${pagesUrl.pathname}`,
  })

  const response = await fetch(pagesUrl, { method: 'GET' })
  const raw = await response.text()

  logger?.('facebook_pages_response', {
    provider: 'facebook',
    status: response.status,
    ok: response.ok,
    raw: raw.slice(0, 500),
  })

  if (!response.ok) {
    throw new Error(`FACEBOOK_PAGES_FAILED:${response.status}:${raw.slice(0, 200)}`)
  }

  try {
    const result = JSON.parse(raw) as FacebookPagesResult
    result._debug = debugInfo
    return result
  } catch (error) {
    logger?.('facebook_pages_parse_error', {
      provider: 'facebook',
      error: error instanceof Error ? error.message : 'unknown',
      raw: raw.slice(0, 200),
    })
    throw new Error('FACEBOOK_PAGES_FAILED:invalid_json')
  }
}

async function fetchInstagramAccount(instagramId: string, pageAccessToken: string, logger?: OAuthLogger) {
  const igUrl = new URL(`https://graph.facebook.com/v19.0/${instagramId}`)
  igUrl.searchParams.set('fields', 'id,username,name')
  igUrl.searchParams.set('access_token', pageAccessToken)

  logger?.('instagram_account_request', {
    provider: 'instagram',
    url: `${igUrl.origin}${igUrl.pathname}`,
    instagramId,
  })

  const response = await fetch(igUrl, { method: 'GET' })
  const raw = await response.text()

  logger?.('instagram_account_response', {
    provider: 'instagram',
    status: response.status,
    ok: response.ok,
    raw: raw.slice(0, 500),
  })

  if (!response.ok) {
    throw new Error(`INSTAGRAM_ACCOUNT_FAILED:${response.status}:${raw.slice(0, 200)}`)
  }

  try {
    return JSON.parse(raw) as {
      id: string
      username?: string
      name?: string
    }
  } catch (error) {
    logger?.('instagram_account_parse_error', {
      provider: 'instagram',
      error: error instanceof Error ? error.message : 'unknown',
      raw: raw.slice(0, 200),
    })
    throw new Error('INSTAGRAM_ACCOUNT_FAILED:invalid_json')
  }
}

export async function handleFacebookCallback({
  code,
  redirectUri,
}: OAuthCallbackArgs, logger?: OAuthLogger): Promise<OAuthCallbackResult> {
  const tokenResponse = await exchangeFacebookCodeForToken(code, redirectUri, logger)
  const pagesResponse = await fetchFacebookPages(tokenResponse.access_token, logger)

  const pages = pagesResponse.data || []
  if (!pages.length) {
    const debug = pagesResponse._debug

    // Provide specific error message based on what we found
    if (debug && !debug.hasPageShowList) {
      throw new Error('Facebook did not grant page access permissions. Please reconnect and make sure to select "Yes" when Facebook asks if you want to grant access to your pages.')
    }

    if (debug && debug.grantedPermissions.length === 0) {
      throw new Error('No permissions were granted. Please try connecting again and accept all the requested permissions when prompted by Facebook.')
    }

    // If permissions look fine but no pages, the user likely doesn't manage any pages
    throw new Error(`No Facebook pages found. The Facebook account "${debug?.userName || 'connected'}" does not appear to manage any Facebook Pages. Please make sure you are an admin of the Facebook Page you want to connect, or try logging into a different Facebook account.`)
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
      metadata: {
        pageId: primaryPage.id,
        pageName: primaryPage.name,
        instagramBusinessAccountId: primaryPage.instagram_business_account?.id ?? null,
      },
    },
  ]

  if (primaryPage.instagram_business_account?.id) {
    try {
      const instagramAccount = await fetchInstagramAccount(
        primaryPage.instagram_business_account.id,
        primaryPage.access_token,
        logger,
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
          instagramBusinessAccountId: instagramAccount.id,
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

