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

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Check if a Graph API error response indicates an expired/invalid token.
 * Error code 190 = invalid access token; subcodes 463/467 = expired.
 */
function isTokenExpiredError(errorBody: string): boolean {
  try {
    const parsed = JSON.parse(errorBody) as { error?: { code?: number } }
    return parsed?.error?.code === 190
  } catch {
    return false
  }
}

const INSTAGRAM_FIELDS =
  'id,username,name,profile_picture_url,biography,followers_count,follows_count,media_count,website'

const FACEBOOK_PAGE_FIELDS =
  'id,name,picture{url},category,about,fan_count,website,link,single_line_address,phone'

/**
 * GET /api/integrations/{facebook|instagram}/full-profile?brandId=xxx[&force_refresh=true]
 *
 * Returns the full Graph API profile for a connected social account.
 * Caches results in the social_accounts.metadata jsonb column.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params

    if (provider !== 'facebook' && provider !== 'instagram') {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
    }

    const brandId = request.nextUrl.searchParams.get('brandId')
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    const forceRefresh = request.nextUrl.searchParams.get('force_refresh') === 'true'

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
      .eq('provider', provider)
      .eq('status', 'connected')
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: `No connected ${provider} account found` },
        { status: 404 },
      )
    }

    const existing = (account.metadata ?? {}) as Record<string, unknown>

    // Return cached data if fresh enough
    if (!forceRefresh && existing.profileLastFetchedAt) {
      const fetchedAt = new Date(existing.profileLastFetchedAt as string).getTime()
      if (Date.now() - fetchedAt < CACHE_TTL_MS) {
        return NextResponse.json({ profile: existing, cached: true })
      }
    }

    // Decrypt token
    let accessToken: string
    try {
      accessToken = decryptToken(account.token_encrypted)
    } catch {
      return NextResponse.json({ error: 'Failed to decrypt token' }, { status: 500 })
    }

    let updatedMetadata: Record<string, unknown>

    if (provider === 'instagram') {
      const igUrl = new URL(`https://graph.facebook.com/v19.0/${account.account_id}`)
      igUrl.searchParams.set('fields', INSTAGRAM_FIELDS)
      igUrl.searchParams.set('access_token', accessToken)

      const igResponse = await fetch(igUrl, { method: 'GET' })

      if (!igResponse.ok) {
        const errorText = await igResponse.text()
        console.warn('[full-profile/instagram] Graph API error:', igResponse.status, errorText.slice(0, 300))
        if (isTokenExpiredError(errorText)) {
          return NextResponse.json({ error: 'token_expired' }, { status: 401 })
        }
        // Non-fatal: return cached metadata if available
        if (existing.profileLastFetchedAt) {
          return NextResponse.json({ profile: existing, cached: true })
        }
        return NextResponse.json(
          { error: `Instagram Graph API error: ${igResponse.status}` },
          { status: 502 },
        )
      }

      const igData = (await igResponse.json()) as {
        id?: string
        username?: string
        name?: string
        profile_picture_url?: string
        biography?: string
        followers_count?: number
        follows_count?: number
        media_count?: number
        website?: string
      }

      updatedMetadata = {
        ...existing,
        igUserId: igData.id ?? existing.igUserId ?? null,
        username: igData.username ?? existing.username ?? null,
        name: igData.name ?? existing.name ?? null,
        profilePictureUrl: igData.profile_picture_url ?? existing.profilePictureUrl ?? null,
        biography: igData.biography ?? null,
        followersCount: igData.followers_count ?? null,
        followsCount: igData.follows_count ?? null,
        mediaCount: igData.media_count ?? null,
        website: igData.website ?? null,
        accountType: existing.accountType ?? 'Business',
        profileLastFetchedAt: new Date().toISOString(),
      }
    } else {
      // Facebook Page
      const fbUrl = new URL(`https://graph.facebook.com/v19.0/${account.account_id}`)
      fbUrl.searchParams.set('fields', FACEBOOK_PAGE_FIELDS)
      fbUrl.searchParams.set('access_token', accessToken)

      const fbResponse = await fetch(fbUrl, { method: 'GET' })

      if (!fbResponse.ok) {
        const errorText = await fbResponse.text()
        console.warn('[full-profile/facebook] Graph API error:', fbResponse.status, errorText.slice(0, 300))
        if (isTokenExpiredError(errorText)) {
          return NextResponse.json({ error: 'token_expired' }, { status: 401 })
        }
        // Non-fatal: return cached metadata if available
        if (existing.profileLastFetchedAt) {
          return NextResponse.json({ profile: existing, cached: true })
        }
        return NextResponse.json(
          { error: `Facebook Graph API error: ${fbResponse.status}` },
          { status: 502 },
        )
      }

      const fbData = (await fbResponse.json()) as {
        id?: string
        name?: string
        picture?: { data?: { url?: string } }
        category?: string
        about?: string
        fan_count?: number
        website?: string
        link?: string
        single_line_address?: string
        phone?: string
      }

      updatedMetadata = {
        ...existing,
        pageId: fbData.id ?? existing.pageId ?? null,
        pageName: fbData.name ?? existing.pageName ?? null,
        profilePictureUrl: fbData.picture?.data?.url ?? existing.profilePictureUrl ?? null,
        accountType: 'Page',
        category: fbData.category ?? null,
        about: fbData.about ?? null,
        fanCount: fbData.fan_count ?? null,
        website: fbData.website ?? null,
        pageLink: fbData.link ?? null,
        singleLineAddress: fbData.single_line_address ?? null,
        phone: fbData.phone ?? null,
        profileLastFetchedAt: new Date().toISOString(),
      }
    }

    // Persist updated metadata
    await supabaseAdmin
      .from('social_accounts')
      .update({ metadata: updatedMetadata })
      .eq('id', account.id)

    return NextResponse.json({ profile: updatedMetadata, cached: false })
  } catch (error) {
    console.error('[full-profile] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
