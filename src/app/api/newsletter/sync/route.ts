import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSuperAdmin } from '@/lib/supabase-server'
import { syncCustomersToResend } from '@/lib/newsletter/sync-customers'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function extractToken(request: NextRequest) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

async function authenticate(request: NextRequest): Promise<boolean> {
  // Check CRON_SECRET first (for Vercel Cron)
  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '') ||
    request.headers.get('x-cron-secret') ||
    request.headers.get('cron-secret')

  const expectedSecret = process.env.CRON_SECRET
  if (expectedSecret && cronSecret === expectedSecret) {
    return true
  }

  // Fall back to Super Admin auth (for manual trigger)
  const token = extractToken(request)
  if (!token) return false

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return false

  return isSuperAdmin(user.id)
}

async function handleSync(request: NextRequest) {
  const authorized = await authenticate(request)
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[newsletter/sync] Starting customer sync...')
    const result = await syncCustomersToResend()

    return NextResponse.json({
      success: true,
      result,
      syncedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[newsletter/sync] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return handleSync(request)
}

export async function POST(request: NextRequest) {
  return handleSync(request)
}
