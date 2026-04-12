import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decryptToken } from '@/lib/encryption'
import type { FacebookPageData } from '@/lib/integrations/types'

export const runtime = 'nodejs'

function extractToken(request: Request) {
  const header = request.headers.get('Authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pendingId = request.nextUrl.searchParams.get('pendingId')
    if (!pendingId) {
      return NextResponse.json({ error: 'pendingId is required' }, { status: 400 })
    }

    // Lazy cleanup of expired records
    await supabaseAdmin
      .from('pending_oauth_connections')
      .delete()
      .lt('expires_at', new Date().toISOString())

    const { data: pending, error: fetchError } = await supabaseAdmin
      .from('pending_oauth_connections')
      .select('*')
      .eq('id', pendingId)
      .single()

    if (fetchError || !pending) {
      return NextResponse.json(
        { error: 'Connection request not found or expired. Please reconnect your Facebook account.' },
        { status: 404 },
      )
    }

    // Validate ownership
    if (pending.user_id !== userData.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check expiry
    if (new Date(pending.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Connection request has expired. Please reconnect your Facebook account.' },
        { status: 410 },
      )
    }

    // Decrypt pages and strip tokens before returning to client
    const pages: FacebookPageData[] = JSON.parse(decryptToken(pending.pages_encrypted))

    const safePages = pages.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category ?? null,
      pictureUrl: p.picture?.data?.url ?? null,
      hasInstagram: !!p.instagram_business_account?.id,
    }))

    return NextResponse.json({
      pages: safePages,
      brandId: pending.brand_id,
    })
  } catch (error) {
    console.error('[pending-pages] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load available pages.' },
      { status: 500 },
    )
  }
}
