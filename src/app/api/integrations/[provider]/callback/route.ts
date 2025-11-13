import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '@/lib/supabase-server'
import { handleOAuthCallback } from '@/lib/integrations'
import type { SupportedProvider } from '@/lib/integrations/types'
import { encryptToken } from '@/lib/encryption'
import { verifyOAuthState } from '@/lib/oauthState'

export const runtime = 'nodejs'

const ENV_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
const DEFAULT_SITE_URL = (ENV_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

function resolveOrigin(request: Request, fallback?: string) {
  if (ENV_SITE_URL) {
    return ENV_SITE_URL.replace(/\/$/, '')
  }

  if (fallback) {
    return fallback.replace(/\/$/, '')
  }

  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost ?? request.headers.get('host')
  const scheme = forwardedProto ?? (host?.startsWith('localhost') ? 'http' : 'https')

  if (!host) {
    return DEFAULT_SITE_URL
  }

  return `${scheme}://${host}`.replace(/\/$/, '')
}

function getRedirectUrl(origin: string, brandId: string, params: Record<string, string>) {
  const pathBrandId = brandId || 'unknown'
  const base = origin || DEFAULT_SITE_URL
  const url = new URL(`/brands/${pathBrandId}/engine-room/integrations`, base)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return url
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await context.params
  const raw = (providerParam || '').toLowerCase()
  const providerMap: Record<string, SupportedProvider> = {
    fb: 'facebook',
    facebook: 'facebook',
    ig: 'instagram',
    instagram: 'instagram',
    instagram_via_facebook: 'instagram',
    li: 'linkedin',
    linkedin: 'linkedin',
    linkedin_oidc: 'linkedin',
  }
  const provider = providerMap[raw]
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description') || 'OAuth flow was cancelled.'

  const requestOrigin = resolveOrigin(request)
  console.log('[OAuth callback:start]', {
    raw,
    provider,
    hasCode: Boolean(code),
    stateRaw: stateParam,
    origin: requestOrigin,
    requestUrl: request.url,
  })
  console.log('[runtime]', { provider, runtime: process.env.NEXT_RUNTIME || 'nodejs' })

  if (!provider) {
    const redirect = getRedirectUrl(requestOrigin, '', {
      error: 'unsupported_provider',
      reason: `provider_${raw || 'missing'}`,
    })
    return NextResponse.redirect(redirect)
  }

  if (errorParam) {
    console.warn('[OAuth callback:error]', {
      provider,
      error: errorParam,
      description: errorDescription,
      url: request.url,
    })

    let message = errorDescription || 'OAuth flow was cancelled.'
    let reason = errorParam || 'general_failure'

    if (provider === 'linkedin' && errorParam === 'unauthorized_scope_error') {
      message =
        'We couldn’t complete the LinkedIn connection. Please reconnect your LinkedIn profile and try again.'
      reason = 'linkedin_scope_denied'
    }

    const errorRedirect = getRedirectUrl(requestOrigin, '', {
      error: 'linkedin_auth_failed',
      error_description: message.substring(0, 200),
      reason,
    })
    return NextResponse.redirect(errorRedirect)
  }

  if (!code || !stateParam) {
    const redirect = getRedirectUrl(requestOrigin, '', {
      error: 'missing_parameters',
      error_description: 'Missing OAuth parameters.',
    })
    return NextResponse.redirect(redirect)
  }

  let brandIdForRedirect = ''
  let originForRedirect = requestOrigin

  try {
    const state = verifyOAuthState(stateParam)
    brandIdForRedirect = state.brandId
    originForRedirect = state.origin ? state.origin.replace(/\/$/, '') : requestOrigin

    const redirectWith = (reason: string, description: string) => {
      const redirect = getRedirectUrl(originForRedirect, state.brandId, {
        error: 'integration_failed',
        error_description: description.substring(0, 200),
        reason,
      })
      console.log('OAuth callback redirect ->', redirect.toString())
      return NextResponse.redirect(redirect)
    }

    const stateProvider = state.provider as SupportedProvider
    if (stateProvider !== provider && !(provider === 'instagram' && stateProvider === 'facebook')) {
      throw new Error('OAuth provider mismatch.')
    }

    const normalizedProvider = stateProvider === 'instagram' ? 'facebook' : stateProvider

    if (normalizedProvider === 'facebook') {
      const FB_CLIENT_ID =
        process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID || ''
      const FB_CLIENT_SECRET =
        process.env.FACEBOOK_CLIENT_SECRET || process.env.FACEBOOK_APP_SECRET || ''
      const fbEnvKeys = Object.keys(process.env).filter((key) => key.startsWith('FACEBOOK'))
      console.log('[fb env keys]', fbEnvKeys)
      console.log('[fb env chosen]', {
        idLen: FB_CLIENT_ID.length,
        idStart: FB_CLIENT_ID.slice(0, 4),
        idEnd: FB_CLIENT_ID.slice(-4),
        secretLen: FB_CLIENT_SECRET.length,
        secretStart: FB_CLIENT_SECRET.slice(0, 4),
        secretEnd: FB_CLIENT_SECRET.slice(-4),
      })

      if (!FB_CLIENT_ID || !FB_CLIENT_SECRET) {
        return redirectWith('missing_client_secret', 'Facebook client credentials are not configured.')
      }

      process.env.FACEBOOK_CLIENT_ID = FB_CLIENT_ID
      process.env.FACEBOOK_CLIENT_SECRET = FB_CLIENT_SECRET
    }

    if (normalizedProvider === 'linkedin') {
      const liId = process.env.LINKEDIN_CLIENT_ID
      const liSecret = process.env.LINKEDIN_CLIENT_SECRET
      console.log('[li env]', {
        hasId: Boolean(liId),
        id: liId,
        secretLen: liSecret?.length ?? 0,
        secretStart: liSecret?.slice(0, 3) ?? null,
        secretEnd: liSecret?.slice(-3) ?? null,
      })
      if (!liId || !liSecret) {
        return redirectWith('missing_client_secret', 'LinkedIn client credentials are not configured.')
      }
    }

    const hasAccess = await requireAdmin(state.brandId, state.userId)
    if (!hasAccess) {
      throw new Error('You no longer have permission to manage this brand.')
    }

    const callbackRedirect = `${originForRedirect}/api/integrations/${normalizedProvider}/callback`
    console.log('[oauth callback]', { provider, normalizedProvider, redirectUri: callbackRedirect, hasCode: Boolean(code) })
    console.log('[OAuth callback:state_verified]', {
      provider,
      brandId: state.brandId,
      userId: state.userId,
      stateProvider,
      callbackRedirect,
    })

    const debugLogger = (event: string, payload: Record<string, unknown>) => {
      console.log('[OAuth callback:debug]', {
        provider: stateProvider,
        event,
        ...payload,
      })
    }

    const { accounts } = await handleOAuthCallback(stateProvider, { code, redirectUri: callbackRedirect }, debugLogger)
    if (!accounts.length) {
      throw new Error('No accounts were returned by the provider.')
    }

    const targetProviders = Array.from(new Set(accounts.map((account) => account.provider)))
    console.log('[OAuth callback:accounts]', {
      provider: stateProvider,
      brandId: state.brandId,
      targetProviders,
      accountCount: accounts.length,
    })

    await supabaseAdmin
      .from('social_accounts')
      .delete()
      .eq('brand_id', state.brandId)
      .in('provider', targetProviders)

    const nowIso = new Date().toISOString()

    for (const account of accounts) {
      const tokenEncrypted = encryptToken(account.accessToken)
      const refreshEncrypted = account.refreshToken ? encryptToken(account.refreshToken) : null

      const { error: upsertError } = await supabaseAdmin.from('social_accounts').upsert(
        {
          brand_id: state.brandId,
          provider: account.provider,
          account_id: account.accountId,
          handle: account.handle,
          token_encrypted: tokenEncrypted,
          refresh_token_encrypted: refreshEncrypted,
          token_expires_at: account.expiresAt ? account.expiresAt.toISOString() : null,
          status: 'connected',
          connected_by_user_id: state.userId,
          last_refreshed_at: nowIso,
        },
        {
          onConflict: 'brand_id,provider',
        },
      )

      if (upsertError) {
        throw new Error(`Failed to store ${account.provider} account: ${upsertError.message}`)
      }

      console.log('[OAuth callback:upsert]', {
        provider: account.provider,
        brandId: state.brandId,
        accountId: account.accountId,
      })
    }

    const successRedirect = getRedirectUrl(originForRedirect, state.brandId, {
      connected: targetProviders.join(','),
    })
    console.log('OAuth callback redirect ->', successRedirect.toString())
    return NextResponse.redirect(successRedirect)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete integration.'
    console.error(`Integration callback error for ${provider}:`, message)

    let reason = 'general_failure'
    const tokenMatch = message.match(/^TOKEN_EXCHANGE_FAILED:([^:]+):([^:]+):?/i)
    if (tokenMatch) {
      reason = `token_${tokenMatch[1]}_${tokenMatch[2]}`
    } else {
      const segments = message.split(':')
      if (segments[0]) {
        reason = segments[0].toLowerCase().replace(/[^a-z0-9_-]/g, '_')
      }
    }

    const redirect = getRedirectUrl(originForRedirect, brandIdForRedirect, {
      error: 'integration_failed',
      error_description: message.substring(0, 200),
      reason: reason.substring(0, 60),
    })
    console.log('OAuth callback redirect ->', redirect.toString())
    return NextResponse.redirect(redirect)
  }
}
