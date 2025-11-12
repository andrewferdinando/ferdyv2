import {
  ConnectedAccount,
  OAuthCallbackArgs,
  OAuthCallbackResult,
  OAuthLogger,
  OAuthStartOptions,
  OAuthStartResult,
} from './types'

const LINKEDIN_SCOPES = ['r_organization_admin', 'w_member_social'].join(' ')

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

async function fetchLinkedInOrganizations(accessToken: string, logger?: OAuthLogger) {
  const aclUrl = new URL('https://api.linkedin.com/v2/organizationAcls')
  aclUrl.searchParams.set('q', 'roleAssignee')
  aclUrl.searchParams.set('role', 'ADMINISTRATOR')
  aclUrl.searchParams.set('state', 'APPROVED')
  aclUrl.searchParams.set('projection', '(elements*(organization~(id,localizedName,vanityName)))')

  logger?.('linkedin_org_request', {
    provider: 'linkedin',
    url: `${aclUrl.origin}${aclUrl.pathname}`,
  })

  const response = await fetch(aclUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const raw = await response.text()

  logger?.('linkedin_org_response', {
    provider: 'linkedin',
    status: response.status,
    ok: response.ok,
    raw: raw.slice(0, 500),
  })

  if (!response.ok) {
    throw new Error(`LINKEDIN_ORGS_FAILED:${response.status}:${raw.slice(0, 200)}`)
  }

  try {
    return JSON.parse(raw) as {
      elements?: Array<{
        'organization~'?: {
          id: number
          localizedName?: string
          vanityName?: string
        }
      }>
    }
  } catch (error) {
    logger?.('linkedin_org_parse_error', {
      provider: 'linkedin',
      error: error instanceof Error ? error.message : 'unknown',
      raw: raw.slice(0, 200),
    })
    throw new Error('LINKEDIN_ORGS_FAILED:invalid_json')
  }
}

export async function handleLinkedInCallback({
  code,
  redirectUri,
}: OAuthCallbackArgs, logger?: OAuthLogger): Promise<OAuthCallbackResult> {
  const tokenResponse = await exchangeLinkedInCode(code, redirectUri, logger)
  const organizations = await fetchLinkedInOrganizations(tokenResponse.access_token, logger)
  const element = organizations.elements?.find((item) => item['organization~'])

  if (!element || !element['organization~']) {
    throw new Error('No LinkedIn organization found. You must be an administrator of at least one company page.')
  }

  const { id, localizedName, vanityName } = element['organization~']
  const handle = localizedName || vanityName || `LinkedIn Org ${id}`

  const accounts: ConnectedAccount[] = [
    {
      provider: 'linkedin',
      accountId: id.toString(),
      handle,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : undefined,
    },
  ]

  return { accounts }
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

