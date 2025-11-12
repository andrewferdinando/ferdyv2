import { NextResponse } from 'next/server'
import type { SupportedProvider } from '@/lib/integrations/types'
import { getAuthorizationUrl } from '@/lib/integrations'
import { createOAuthState } from '@/lib/oauthState'
import { supabaseAdmin, requireAdmin } from '@/lib/supabase-server'

function extractToken(request: Request) {
  const header = request.headers.get('Authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(request: Request, context: any) {
  try {
    const provider = context?.params?.provider as SupportedProvider
    if (!['facebook', 'instagram', 'linkedin'].includes(provider)) {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
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

    const state = createOAuthState({
      brandId,
      userId: userData.user.id,
      provider,
    })

    const { url } = getAuthorizationUrl(provider, { state })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Integration start error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start integration flow' },
      { status: 500 },
    )
  }
}

