import { NextRequest, NextResponse } from 'next/server'
import { publishDueDrafts } from '@/server/publishing/publishDueDrafts'

function parseLimitFromRequest(req: NextRequest): number {
  const url = new URL(req.url)
  const raw = url.searchParams.get('limit')
  if (!raw) return 20
  const parsed = Number.parseInt(raw, 10)
  return Number.isNaN(parsed) || parsed <= 0 ? 20 : Math.min(parsed, 100)
}

function checkCronAuth(req: NextRequest): NextResponse | null {
  // In production, require CRON_SECRET authentication
  // In non-production (local dev), allow without auth for easy testing
  const isProduction = process.env.NODE_ENV === 'production'

  if (!isProduction) {
    return null // Allow in non-production environments
  }

  // In production, check for Authorization header
  const header =
    req.headers.get('authorization') || req.headers.get('Authorization')

  const expected = process.env.CRON_SECRET

  // In production, CRON_SECRET must be set
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // In production, Authorization header must be present and match
  if (!header || header !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

export async function GET(req: NextRequest) {
  console.log('[cron] /api/publishing/run called', {
    at: new Date().toISOString(),
    method: req.method,
    fromCron: req.headers.get('x-vercel-cron') ?? null,
  });

  const authError = checkCronAuth(req)
  if (authError) return authError

  try {
    const limit = parseLimitFromRequest(req)
    const summary = await publishDueDrafts(limit)
    return NextResponse.json({ ok: true, ...summary })
  } catch (error: unknown) {
    console.error('[cron run GET] error', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  console.log('[cron] /api/publishing/run called', {
    at: new Date().toISOString(),
    method: req.method,
    fromCron: req.headers.get('x-vercel-cron') ?? null,
  });

  const authError = checkCronAuth(req)
  if (authError) return authError

  try {
    const limit = parseLimitFromRequest(req)
    const summary = await publishDueDrafts(limit)
    return NextResponse.json({ ok: true, ...summary })
  } catch (error: unknown) {
    console.error('[cron run POST] error', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

