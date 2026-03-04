import { NextRequest, NextResponse } from 'next/server'
import { publishDueDrafts } from '@/server/publishing/publishDueDrafts'
import { supabaseAdmin } from '@/lib/supabase-server'

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

async function handlePublishRun(req: NextRequest) {
  console.log('[cron] /api/publishing/run called', {
    at: new Date().toISOString(),
    method: req.method,
    fromCron: req.headers.get('x-vercel-cron') ?? null,
  })

  const unauthorized = assertCronAuthorized(req)
  if (unauthorized) return unauthorized

  let cronLogId: string | null = null

  try {
    // Log cron start
    const { data: cronLog } = await supabaseAdmin
      .from('cron_logs')
      .insert({ cron_path: '/api/publishing/run', status: 'running' })
      .select('id')
      .single()
    cronLogId = cronLog?.id ?? null

    const limit = parseLimitFromRequest(req)
    const summary = await publishDueDrafts(limit)

    // Log cron completion
    if (cronLogId) {
      await supabaseAdmin.from('cron_logs').update({
        status: 'success',
        completed_at: new Date().toISOString(),
        summary: {
          jobsAttempted: summary.jobsAttempted,
          jobsSucceeded: summary.jobsSucceeded,
          jobsFailed: summary.jobsFailed,
        },
      }).eq('id', cronLogId)
    }

    return NextResponse.json({ ok: true, ...summary })
  } catch (error: unknown) {
    console.error('[cron run] error', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (cronLogId) {
      try {
        await supabaseAdmin.from('cron_logs').update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: errorMessage,
        }).eq('id', cronLogId)
      } catch { /* ignore logging failure */ }
    }
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return handlePublishRun(req)
}

export async function POST(req: NextRequest) {
  return handlePublishRun(req)
}
