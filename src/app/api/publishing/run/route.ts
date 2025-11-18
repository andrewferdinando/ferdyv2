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
  const header =
    req.headers.get('authorization') || req.headers.get('Authorization')

  // If the header is present, it must match CRON_SECRET.
  // This keeps Vercel cron secured, but still allows manual calls
  // from the browser (which won't send an Authorization header).
  if (header) {
    const expected = process.env.CRON_SECRET
    if (!expected || header !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  return null
}

export async function GET(req: NextRequest) {
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

