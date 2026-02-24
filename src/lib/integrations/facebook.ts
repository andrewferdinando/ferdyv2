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
  'instagram_content_publish',
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
  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', finalRedirect)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', FACEBOOK_SCOPES)
  // Force a fresh login prompt every time, so different users don't inherit
  // each other's cached Facebook sessions. Also re-shows page/permission selection.
  authUrl.searchParams.set('auth_type', 'reauthenticate')

  return { url: authUrl.toString() }
}

async function exchangeFacebookCodeForToken(
  code: string,
  redirectUriOverride: string | undefined,
  logger?: OAuthLogger,
) {
  const { clientId, clientSecret, redirectUri } = getFacebookConfig()
  const finalRedirect = redirectUriOverride ?? redirectUri
  const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
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

  const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
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
        short_lived_token: tokenData.access_token,
      }
    } catch {
      // Fall back to short-lived token if parsing fails
      console.warn('[facebook] Failed to parse long-lived token response, using short-lived token')
    }
  } else {
    console.warn('[facebook] Failed to exchange for long-lived token, using short-lived token')
  }

  return { ...tokenData, short_lived_token: null }
}

async function fetchFacebookUserProfile(userAccessToken: string, logger?: OAuthLogger) {
  const profileUrl = new URL('https://graph.facebook.com/v21.0/me')
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
  const permissionsUrl = new URL('https://graph.facebook.com/v21.0/me/permissions')
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
    picture?: { data?: { url?: string } }
    category?: string
    about?: string
    fan_count?: number
    website?: string
    link?: string
    single_line_address?: string
    phone?: string
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

  const pagesUrl = new URL('https://graph.facebook.com/v21.0/me/accounts')
  pagesUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account,picture{url},category,about,fan_count,website,link,single_line_address,phone')
  pagesUrl.searchParams.set('limit', '100')
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
    raw: raw.slice(0, 2000),
  })

  if (!response.ok) {
    throw new Error(`FACEBOOK_PAGES_FAILED:${response.status}:${raw.slice(0, 200)}`)
  }

  let result: FacebookPagesResult
  try {
    result = JSON.parse(raw) as FacebookPagesResult
    result._debug = debugInfo
  } catch (error) {
    logger?.('facebook_pages_parse_error', {
      provider: 'facebook',
      error: error instanceof Error ? error.message : 'unknown',
      raw: raw.slice(0, 200),
    })
    throw new Error('FACEBOOK_PAGES_FAILED:invalid_json')
  }

  // If no pages returned, run diagnostic calls to help debug the issue
  if (!result.data || result.data.length === 0) {
    // Use the Debug Token API to see exactly what Facebook thinks this token grants
    try {
      const { clientId, clientSecret } = getFacebookConfig()
      const appToken = `${clientId}|${clientSecret}`
      const debugUrl = new URL('https://graph.facebook.com/v21.0/debug_token')
      debugUrl.searchParams.set('input_token', userAccessToken)
      debugUrl.searchParams.set('access_token', appToken)
      const debugRes = await fetch(debugUrl, { method: 'GET' })
      const debugRaw = await debugRes.text()
      logger?.('facebook_debug_token', {
        provider: 'facebook',
        status: debugRes.status,
        raw: debugRaw.slice(0, 3000),
      })
    } catch (diagErr) {
      logger?.('facebook_debug_token_error', {
        provider: 'facebook',
        error: diagErr instanceof Error ? diagErr.message : 'unknown',
      })
    }

    // Try a minimal me/accounts call without fields to rule out field-related issues
    try {
      const minimalUrl = new URL('https://graph.facebook.com/v21.0/me/accounts')
      minimalUrl.searchParams.set('access_token', userAccessToken)
      const minimalRes = await fetch(minimalUrl, { method: 'GET' })
      const minimalRaw = await minimalRes.text()
      logger?.('facebook_pages_diagnostic_minimal', {
        provider: 'facebook',
        status: minimalRes.status,
        raw: minimalRaw.slice(0, 2000),
      })
    } catch (diagErr) {
      logger?.('facebook_pages_diagnostic_error', {
        provider: 'facebook',
        error: diagErr instanceof Error ? diagErr.message : 'unknown',
      })
    }

    // Try fetching via {user-id}/accounts as a cross-check
    if (debugInfo.userId) {
      try {
        const userPagesUrl = new URL(`https://graph.facebook.com/v21.0/${debugInfo.userId}/accounts`)
        userPagesUrl.searchParams.set('access_token', userAccessToken)
        const userPagesRes = await fetch(userPagesUrl, { method: 'GET' })
        const userPagesRaw = await userPagesRes.text()
        logger?.('facebook_pages_diagnostic_user_id', {
          provider: 'facebook',
          userId: debugInfo.userId,
          status: userPagesRes.status,
          raw: userPagesRaw.slice(0, 2000),
        })
      } catch (diagErr) {
        logger?.('facebook_pages_diagnostic_user_id_error', {
          provider: 'facebook',
          error: diagErr instanceof Error ? diagErr.message : 'unknown',
        })
      }
    }

    // Check if this user has business accounts that manage pages
    try {
      const bizUrl = new URL('https://graph.facebook.com/v21.0/me/businesses')
      bizUrl.searchParams.set('fields', 'id,name')
      bizUrl.searchParams.set('access_token', userAccessToken)
      const bizRes = await fetch(bizUrl, { method: 'GET' })
      const bizRaw = await bizRes.text()
      logger?.('facebook_pages_diagnostic_businesses', {
        provider: 'facebook',
        status: bizRes.status,
        raw: bizRaw.slice(0, 2000),
      })
    } catch (diagErr) {
      logger?.('facebook_pages_diagnostic_businesses_error', {
        provider: 'facebook',
        error: diagErr instanceof Error ? diagErr.message : 'unknown',
      })
    }
  }

  return result
}

async function fetchInstagramAccount(instagramId: string, pageAccessToken: string, logger?: OAuthLogger) {
  const igUrl = new URL(`https://graph.facebook.com/v21.0/${instagramId}`)
  igUrl.searchParams.set('fields', 'id,username,name,profile_picture_url,biography,followers_count,follows_count,media_count,website')
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
      profile_picture_url?: string
      biography?: string
      followers_count?: number
      follows_count?: number
      media_count?: number
      website?: string
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
  let pagesResponse = await fetchFacebookPages(tokenResponse.access_token, logger)

  // If long-lived token returned no pages, try with the short-lived token as a
  // diagnostic — this helps determine if the LL token exchange strips page access.
  let usedShortLivedFallback = false
  if (
    (!pagesResponse.data || pagesResponse.data.length === 0) &&
    tokenResponse.short_lived_token
  ) {
    logger?.('facebook_pages_short_lived_fallback', {
      provider: 'facebook',
      event: 'trying_short_lived_token',
    })

    const shortLivedPages = await fetchFacebookPages(tokenResponse.short_lived_token, logger)

    logger?.('facebook_pages_short_lived_result', {
      provider: 'facebook',
      pageCount: shortLivedPages.data?.length ?? 0,
    })

    if (shortLivedPages.data && shortLivedPages.data.length > 0) {
      // Short-lived token works but long-lived doesn't — use it and log the anomaly
      logger?.('facebook_pages_short_lived_success', {
        provider: 'facebook',
        event: 'long_lived_token_lost_page_access',
        pageCount: shortLivedPages.data.length,
      })
      pagesResponse = shortLivedPages
      usedShortLivedFallback = true
    }
  }

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

    // Permissions were granted but no pages returned. Possible causes:
    // 1. User didn't select a Page during the OAuth "Choose what to share" screen
    // 2. User's Facebook App access is restricted (e.g. app is in Development Mode
    //    and user is not an app tester/admin)
    // 3. Page access is task-based via Business Manager and not visible to me/accounts
    throw new Error(`No Facebook Pages were found for "${debug?.userName || 'this account'}". All permissions were granted but Facebook returned no Pages. This can happen if: (1) the Page wasn't selected during the login flow — please try again and ensure you select your Page when prompted, (2) Ferdy's Facebook App access is restricted for this user — contact support@ferdy.io for help. If the issue persists after retrying, please reach out to us.`)
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
        profilePictureUrl: primaryPage.picture?.data?.url ?? null,
        accountType: 'Page',
        category: primaryPage.category ?? null,
        about: primaryPage.about ?? null,
        fanCount: primaryPage.fan_count ?? null,
        website: primaryPage.website ?? null,
        pageLink: primaryPage.link ?? null,
        singleLineAddress: primaryPage.single_line_address ?? null,
        phone: primaryPage.phone ?? null,
        profileLastFetchedAt: new Date().toISOString(),
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
          igUserId: instagramAccount.id,
          profilePictureUrl: instagramAccount.profile_picture_url ?? null,
          accountType: 'Business',
          name: instagramAccount.name ?? null,
          username: instagramAccount.username ?? null,
          biography: instagramAccount.biography ?? null,
          followersCount: instagramAccount.followers_count ?? null,
          followsCount: instagramAccount.follows_count ?? null,
          mediaCount: instagramAccount.media_count ?? null,
          website: instagramAccount.website ?? null,
          profileLastFetchedAt: new Date().toISOString(),
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
    const revokeUrl = new URL(`https://graph.facebook.com/v21.0/${pageId}/permissions`)
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

