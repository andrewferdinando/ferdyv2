import { NextResponse } from 'next/server'
import type { SupportedProvider } from '@/lib/integrations/types'
import { getAuthorizationUrl } from '@/lib/integrations'
import { createOAuthState } from '@/lib/oauthState'
import { supabaseAdmin, requireAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

function extractToken(request: Request) {
  const header = request.headers.get('Authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

function resolveOrigin(request: Request) {
  const canonical = process.env.NEXT_PUBLIC_SITE_URL
  if (canonical) {
    return canonical.replace(/\/$/, '')
  }

  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost ?? request.headers.get('host')
  const scheme = forwardedProto ?? (host?.startsWith('localhost') ? 'http' : 'https')
  const fallback = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return host ? `${scheme}://${host}` : fallback
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(request: Request, context: any) {
  try {
    const raw = String(context?.params?.provider ?? '').toLowerCase()
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

    const origin = resolveOrigin(request)
    console.log('[oauth start]', { raw, provider, url: request.url })
    console.log('[env check]', {
      FACEBOOK_CLIENT_ID: process.env.FACEBOOK_CLIENT_ID?.length ?? 0,
      FACEBOOK_CLIENT_SECRET: process.env.FACEBOOK_CLIENT_SECRET?.length ?? 0,
      LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID?.length ?? 0,
      LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET?.length ?? 0,
      INSTAGRAM_CLIENT_ID: process.env.INSTAGRAM_CLIENT_ID?.length ?? 0,
      INSTAGRAM_CLIENT_SECRET: process.env.INSTAGRAM_CLIENT_SECRET?.length ?? 0,
      REDIRECT_URI: process.env.FACEBOOK_REDIRECT_URI || process.env.NEXT_PUBLIC_REDIRECT_URI || null,
      RUNTIME: process.env.NEXT_RUNTIME || 'nodejs',
    })

    if (!provider) {
      const redirect = new URL('/api/integrations/unsupported', origin)
      redirect.searchParams.set('error', 'unsupported_provider')
      redirect.searchParams.set('prov', raw)
      return NextResponse.redirect(redirect)
    }

    const { brandId } = await request.json().catch(() => ({}))
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    const token = extractToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await requireAdmin(brandId, userData.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const normalizedProvider = provider === 'instagram' ? 'facebook' : provider
    const redirectUri = `${origin}/api/integrations/${normalizedProvider}/callback`

    const state = createOAuthState({
      brandId,
      userId: userData.user.id,
      provider,
      origin,
    })

    console.log('[oauth start]', { provider, brandId, redirectUri })

    const { url } = getAuthorizationUrl(provider, { state, redirectUri })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Integration start error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start integration flow' },
      { status: 500 },
    )
  }
}

