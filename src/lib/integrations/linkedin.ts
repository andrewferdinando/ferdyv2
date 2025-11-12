import { ConnectedAccount, OAuthCallbackArgs, OAuthCallbackResult, OAuthStartOptions, OAuthStartResult } from './types'

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

export function getLinkedInAuthorizationUrl({ state }: OAuthStartOptions): OAuthStartResult {
  const { clientId, redirectUri } = getLinkedInConfig()
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('scope', LINKEDIN_SCOPES)

  return { url: authUrl.toString() }
}

async function exchangeLinkedInCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getLinkedInConfig()
  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('code', code)
  body.set('redirect_uri', redirectUri)
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`LinkedIn token exchange failed: ${response.status} ${detail}`)
  }

  return (await response.json()) as {
    access_token: string
    expires_in: number
    refresh_token?: string
    refresh_token_expires_in?: number
  }
}

async function fetchLinkedInOrganizations(accessToken: string) {
  const aclUrl = new URL('https://api.linkedin.com/v2/organizationAcls')
  aclUrl.searchParams.set('q', 'roleAssignee')
  aclUrl.searchParams.set('role', 'ADMINISTRATOR')
  aclUrl.searchParams.set('state', 'APPROVED')
  aclUrl.searchParams.set('projection', '(elements*(organization~(id,localizedName,vanityName)))')

  const response = await fetch(aclUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Failed to list LinkedIn organizations: ${response.status} ${detail}`)
  }

  return (await response.json()) as {
    elements?: Array<{
      'organization~'?: {
        id: number
        localizedName?: string
        vanityName?: string
      }
    }>
  }
}

export async function handleLinkedInCallback({ code }: OAuthCallbackArgs): Promise<OAuthCallbackResult> {
  const tokenResponse = await exchangeLinkedInCode(code)
  const organizations = await fetchLinkedInOrganizations(tokenResponse.access_token)
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

