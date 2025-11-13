import {
  ConnectedAccount,
  OAuthCallbackArgs,
  OAuthCallbackResult,
  OAuthLogger,
  OAuthStartOptions,
  OAuthStartResult,
} from './types'

const LINKEDIN_SCOPES = ['w_member_social'].join(' ')

function getLinkedInConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectUri =
    process.env.LINKEDIN_REDIRECT_URI || `${siteUrl.replace(/\/$/, '')}/api/integrations/linkedin/callback`

  if (!clientId || !clientSecret) {
    throw new Error(
      'LinkedIn OAuth configuration is missing. Ensure LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are set.',
    )
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  }
}

export function getLinkedInAuthorizationUrl({ state, redirectUri }: OAuthStartOptions): OAuthStartResult {
  const { clientId, redirectUri: defaultRedirect } = getLinkedInConfig()
  const finalRedirect = redirectUri ?? defaultRedirect
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', finalRedirect)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('scope', LINKEDIN_SCOPES)

  console.log('[linkedin scopes]', LINKEDIN_SCOPES)

  return { url: authUrl.toString() }
}

async function exchangeLinkedInCode(
  code: string,
  overrideRedirect: string | undefined,
  logger?: OAuthLogger,
) {
  const { clientId, clientSecret, redirectUri } = getLinkedInConfig()
  const finalRedirect = overrideRedirect ?? redirectUri
  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('code', code)
  body.set('redirect_uri', finalRedirect)
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)

  logger?.('token_request', {
    provider: 'linkedin',
    url: 'https://www.linkedin.com/oauth/v2/accessToken',
    body: {
      grant_type: 'authorization_code',
      code: `${code.slice(0, 8)}…`,
      redirect_uri: finalRedirect,
      client_id: clientId,
      client_secret: '[redacted]',
    },
  })

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const raw = await response.text()

  console.log('[token]', { provider: 'linkedin', status: response.status, raw: raw.slice(0, 500) })

  logger?.('token_response', {
    provider: 'linkedin',
    status: response.status,
    ok: response.ok,
    raw: raw.slice(0, 500),
  })

  if (!response.ok) {
    throw new Error(`TOKEN_EXCHANGE_FAILED:linkedin:${response.status}:${raw.slice(0, 200)}`)
  }

  try {
    return JSON.parse(raw) as {
      access_token: string
      expires_in: number
      refresh_token?: string
      refresh_token_expires_in?: number
    }
  } catch (error) {
    logger?.('token_parse_error', {
      provider: 'linkedin',
      error: error instanceof Error ? error.message : 'unknown',
      raw: raw.slice(0, 200),
    })
    throw new Error('TOKEN_EXCHANGE_FAILED:linkedin:invalid_json')
  }
}

export async function handleLinkedInCallback({
  code,
  redirectUri,
}: OAuthCallbackArgs, logger?: OAuthLogger): Promise<OAuthCallbackResult> {
  const tokenResponse = await exchangeLinkedInCode(code, redirectUri, logger)
  const profile = await fetchLinkedInMemberProfile(tokenResponse.access_token, logger)

  if (!profile) {
    console.warn('[linkedin profile] insufficient permissions for /me endpoint, continuing without profile details')
  }

  const memberUrn = profile?.id ? `urn:li:person:${profile.id}` : null
  const fullName = profile
    ? [profile.localizedFirstName, profile.localizedLastName].filter(Boolean).join(' ').trim()
    : ''

  if (profile) {
    logger?.('linkedin_member_profile', {
      provider: 'linkedin',
      id: profile.id,
      memberUrn,
      fullName,
    })
    console.log('[linkedin member]', { id: profile.id, memberUrn, fullName })
  }

  const accountId = memberUrn ?? 'linkedin-member'

  const accounts: ConnectedAccount[] = [
    {
      provider: 'linkedin',
      accountId,
      handle: fullName || 'LinkedIn profile connected',
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : undefined,
      metadata: {
        memberUrn,
        linkedInId: profile?.id ?? null,
        localizedFirstName: profile?.localizedFirstName ?? null,
        localizedLastName: profile?.localizedLastName ?? null,
      },
    },
  ]

  return { accounts }
}

async function fetchLinkedInMemberProfile(accessToken: string, logger?: OAuthLogger) {
  const meUrl = new URL('https://api.linkedin.com/v2/me')
  meUrl.searchParams.set('projection', '(id,localizedFirstName,localizedLastName)')

  logger?.('linkedin_me_request', {
    provider: 'linkedin',
    url: `${meUrl.origin}${meUrl.pathname}`,
  })

  const response = await fetch(meUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const raw = await response.text()

  logger?.('linkedin_me_response', {
    provider: 'linkedin',
    status: response.status,
    ok: response.ok,
    raw: raw.slice(0, 500),
  })

  if (!response.ok) {
    if (response.status === 403) {
      logger?.('linkedin_me_forbidden', {
        provider: 'linkedin',
        status: response.status,
        raw: raw.slice(0, 200),
      })
      return null
    }
    throw new Error(`LINKEDIN_PROFILE_FAILED:${response.status}:${raw.slice(0, 200)}`)
  }

  try {
    return JSON.parse(raw) as {
      id: string
      localizedFirstName?: string
      localizedLastName?: string
    }
  } catch (error) {
    logger?.('linkedin_me_parse_error', {
      provider: 'linkedin',
      error: error instanceof Error ? error.message : 'unknown',
      raw: raw.slice(0, 200),
    })
    throw new Error('LINKEDIN_PROFILE_FAILED:invalid_json')
  }
}

export async function revokeLinkedInAccess(accessToken: string) {
  try {
    const { clientId, clientSecret } = getLinkedInConfig()
    const body = new URLSearchParams()
    body.set('token', accessToken)
    body.set('client_id', clientId)
    body.set('client_secret', clientSecret)

    const response = await fetch('https://www.linkedin.com/oauth/v2/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.warn(`Failed to revoke LinkedIn access token: ${response.status} ${detail}`)
    }
  } catch (error) {
    console.warn('Error revoking LinkedIn access token:', error)
  }
}

