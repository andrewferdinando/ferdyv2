import { NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '@/lib/supabase-server'
import { handleOAuthCallback } from '@/lib/integrations'
import type { SupportedProvider } from '@/lib/integrations/types'
import { encryptToken } from '@/lib/encryption'
import { verifyOAuthState } from '@/lib/oauthState'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

function getRedirectUrl(brandId: string, params: Record<string, string>) {
  const pathBrandId = brandId || 'unknown'
  const url = new URL(`/brands/${pathBrandId}/engine-room/integrations`, SITE_URL)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return url
}

export async function GET(
  request: Request,
  context: { params: { provider?: unknown } },
) {
  const provider = context.params?.provider as SupportedProvider
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description') || 'OAuth flow was cancelled.'

  if (errorParam) {
    const errorRedirect = getRedirectUrl('', { error: errorParam, error_description: errorDescription })
    return NextResponse.redirect(errorRedirect)
  }

  if (!code || !stateParam) {
    const redirect = getRedirectUrl('', {
      error: 'missing_parameters',
      error_description: 'Missing OAuth parameters.',
    })
    return NextResponse.redirect(redirect)
  }

  let brandIdForRedirect = ''

  try {
    const state = verifyOAuthState(stateParam)
    brandIdForRedirect = state.brandId

    const stateProvider = state.provider as SupportedProvider
    if (stateProvider !== provider && !(provider === 'instagram' && stateProvider === 'facebook')) {
      throw new Error('OAuth provider mismatch.')
    }

    const hasAccess = await requireAdmin(state.brandId, state.userId)
    if (!hasAccess) {
      throw new Error('You no longer have permission to manage this brand.')
    }

    const { accounts } = await handleOAuthCallback(stateProvider, { code })
    if (!accounts.length) {
      throw new Error('No accounts were returned by the provider.')
    }

    const targetProviders = Array.from(new Set(accounts.map((account) => account.provider)))

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
    }

    const successRedirect = getRedirectUrl(state.brandId, {
      connected: targetProviders.join(','),
    })
    return NextResponse.redirect(successRedirect)
  } catch (error) {
    console.error('Integration callback error:', error)
    const redirect = getRedirectUrl(brandIdForRedirect, {
      error: 'integration_failed',
      error_description: error instanceof Error ? error.message : 'Failed to complete integration.',
    })
    return NextResponse.redirect(redirect)
  }
}

