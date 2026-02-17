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
 * GET /api/integrations/instagram/profile?brandId=xxx
 *
 * Fetches the Instagram profile picture and account type from the Graph API
 * for a connected Instagram account, updates the stored metadata, and returns
 * the enriched fields.
 */
export async function GET(request: NextRequest) {
  try {
    const brandId = request.nextUrl.searchParams.get('brandId')
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    // Authenticate
    const token = extractToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load the Instagram social account for this brand
    const { data: account, error: accountError } = await supabaseAdmin
      .from('social_accounts')
      .select('id, account_id, token_encrypted, metadata')
      .eq('brand_id', brandId)
      .eq('provider', 'instagram')
      .eq('status', 'connected')
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'No connected Instagram account found' }, { status: 404 })
    }

    // If metadata already has profilePictureUrl, return it without hitting Graph API
    const existing = (account.metadata ?? {}) as Record<string, unknown>
    if (existing.profilePictureUrl && existing.accountType) {
      return NextResponse.json({
        profilePictureUrl: existing.profilePictureUrl,
        accountType: existing.accountType,
      })
    }

    // Decrypt token and fetch from Graph API
    let accessToken: string
    try {
      accessToken = decryptToken(account.token_encrypted)
    } catch {
      return NextResponse.json({ error: 'Failed to decrypt token' }, { status: 500 })
    }

    const igUrl = new URL(`https://graph.facebook.com/v19.0/${account.account_id}`)
    igUrl.searchParams.set('fields', 'profile_picture_url')
    igUrl.searchParams.set('access_token', accessToken)

    const igResponse = await fetch(igUrl, { method: 'GET' })
    if (!igResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch Instagram profile' }, { status: 502 })
    }

    const igData = (await igResponse.json()) as { profile_picture_url?: string }

    // Merge into existing metadata and persist
    const updatedMetadata = {
      ...existing,
      profilePictureUrl: igData.profile_picture_url ?? null,
      accountType: 'Business',
    }

    await supabaseAdmin
      .from('social_accounts')
      .update({ metadata: updatedMetadata })
      .eq('id', account.id)

    return NextResponse.json({
      profilePictureUrl: igData.profile_picture_url ?? null,
      accountType: 'Business',
    })
  } catch (error) {
    console.error('[instagram/profile] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
