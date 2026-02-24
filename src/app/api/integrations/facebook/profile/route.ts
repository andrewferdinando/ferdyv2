import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decryptToken } from '@/lib/encryption'

export const runtime = 'nodejs'

function extractToken(request: Request) {
  const header = request.headers.get('Authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

/**
 * GET /api/integrations/facebook/profile?brandId=xxx
 *
 * Fetches the Facebook Page profile picture from the Graph API for a connected
 * Facebook account, updates the stored metadata, and returns the enriched fields.
 */
export async function GET(request: NextRequest) {
  try {
    const brandId = request.nextUrl.searchParams.get('brandId')
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

    const { data: account, error: accountError } = await supabaseAdmin
      .from('social_accounts')
      .select('id, account_id, token_encrypted, metadata')
      .eq('brand_id', brandId)
      .eq('provider', 'facebook')
      .eq('status', 'connected')
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'No connected Facebook account found' }, { status: 404 })
    }

    // Return cached metadata if already enriched
    const existing = (account.metadata ?? {}) as Record<string, unknown>
    if (existing.profilePictureUrl && existing.accountType) {
      return NextResponse.json({
        profilePictureUrl: existing.profilePictureUrl,
        accountType: existing.accountType,
      })
    }

    let accessToken: string
    try {
      accessToken = decryptToken(account.token_encrypted)
    } catch {
      return NextResponse.json({ error: 'Failed to decrypt token' }, { status: 500 })
    }

    // Facebook Pages use the picture edge with redirect=false to get a URL
    const fbUrl = new URL(`https://graph.facebook.com/v21.0/${account.account_id}/picture`)
    fbUrl.searchParams.set('redirect', 'false')
    fbUrl.searchParams.set('type', 'large')
    fbUrl.searchParams.set('access_token', accessToken)

    const fbResponse = await fetch(fbUrl, { method: 'GET' })
    if (!fbResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch Facebook Page picture' }, { status: 502 })
    }

    const fbData = (await fbResponse.json()) as { data?: { url?: string } }

    const updatedMetadata = {
      ...existing,
      profilePictureUrl: fbData.data?.url ?? null,
      accountType: 'Page',
    }

    await supabaseAdmin
      .from('social_accounts')
      .update({ metadata: updatedMetadata })
      .eq('id', account.id)

    return NextResponse.json({
      profilePictureUrl: fbData.data?.url ?? null,
      accountType: 'Page',
    })
  } catch (error) {
    console.error('[facebook/profile] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
