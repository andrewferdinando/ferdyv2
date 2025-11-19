import { NextRequest, NextResponse } from 'next/server'
import { publishDueDrafts } from '@/server/publishing/publishDueDrafts'

function parseLimitFromRequest(req: NextRequest): number {
  const url = new URL(req.url)
  const raw = url.searchParams.get('limit')
  if (!raw) return 20
  const parsed = Number.parseInt(raw, 10)
  return Number.isNaN(parsed) || parsed <= 0 ? 20 : Math.min(parsed, 100)
}

function assertCronAuthorized(req: Request) {
  const secret = (process.env.CRON_SECRET || '').trim()

  // If no secret is configured, don't block anything
  if (!secret) {
    console.warn('[cron auth] CRON_SECRET missing in environment')
    return
  }

  const authRaw = (req.headers.get('authorization') || '').trim()
  const token = authRaw.startsWith('Bearer ')
    ? authRaw.slice(7).trim()
    : authRaw

  const fromCron = req.headers.get('x-vercel-cron')

  const ok = token === secret || !!fromCron

  console.log('[cron auth]', {
    hasSecret: !!secret,
    authRawLength: authRaw.length,
    tokenLength: token.length,
    secretLength: secret.length,
    fromCron,
    matchBySecret: token === secret,
    matchByCronHeader: !!fromCron,
    ok,
  })

  if (!ok) {
    return new Response('Unauthorized', { status: 401 })
  }
}

export async function GET(req: NextRequest) {
  console.log('[cron] /api/publishing/run called', {
    at: new Date().toISOString(),
    method: req.method,
    fromCron: req.headers.get('x-vercel-cron') ?? null,
  })

  const unauthorized = assertCronAuthorized(req)
  if (unauthorized) return unauthorized

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
  })

  const unauthorized = assertCronAuthorized(req)
  if (unauthorized) return unauthorized

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


