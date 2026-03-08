import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSuperAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

function extractToken(request: NextRequest) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

async function authenticateSuperAdmin(request: NextRequest) {
  const token = extractToken(request)
  if (!token) return null

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) return null

  const superAdmin = await isSuperAdmin(user.id)
  if (!superAdmin) return null

  return user
}

export interface CronDaySummary {
  date: string
  dateLabel: string
  generation: {
    ran: boolean
    status: 'success' | 'failed' | null
    startedAt: string | null
    summary: Record<string, unknown> | null
    error: string | null
  }
  publishing: {
    fired: number
    failed: number
    published: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateSuperAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '14', 10) || 14, 1), 90)

    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    // Fetch generation and publishing logs separately.
    // Publishing fires every few minutes, so a single unfiltered query
    // hits Supabase's default 1000-row limit, hiding older days.
    const sinceISO = since.toISOString()

    const [genResult, pubResult] = await Promise.all([
      supabaseAdmin
        .from('cron_logs')
        .select('*')
        .eq('cron_path', '/api/drafts/generate-all')
        .gte('started_at', sinceISO)
        .order('started_at', { ascending: false })
        .limit(days), // At most 1 generation run per day
      supabaseAdmin
        .from('cron_logs')
        .select('started_at, status, summary')
        .eq('cron_path', '/api/publishing/run')
        .gte('started_at', sinceISO)
        .order('started_at', { ascending: false })
        .limit(days * 1000), // Publishing fires frequently
    ])

    if (genResult.error) throw genResult.error
    if (pubResult.error) throw pubResult.error

    // Group by date
    const dayMap = new Map<string, { generation: any[], publishing: any[] }>()

    for (const log of (genResult.data ?? [])) {
      const date = new Date(log.started_at).toISOString().slice(0, 10)
      if (!dayMap.has(date)) dayMap.set(date, { generation: [], publishing: [] })
      dayMap.get(date)!.generation.push(log)
    }

    for (const log of (pubResult.data ?? [])) {
      const date = new Date(log.started_at).toISOString().slice(0, 10)
      if (!dayMap.has(date)) dayMap.set(date, { generation: [], publishing: [] })
      dayMap.get(date)!.publishing.push(log)
    }

    // Fill in missing days
    const result: CronDaySummary[] = []
    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)

    for (let i = 0; i < days; i++) {
      const dateStr = cursor.toISOString().slice(0, 10)
      const dateLabel = cursor.toLocaleDateString('en-NZ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      const dayData = dayMap.get(dateStr)
      const genLogs = dayData?.generation ?? []
      const pubLogs = dayData?.publishing ?? []

      // For generation: take the most recent run of the day
      const latestGen = genLogs[0] ?? null

      result.push({
        date: dateStr,
        dateLabel,
        generation: {
          ran: latestGen !== null,
          status: latestGen?.status === 'success' ? 'success' : latestGen?.status === 'failed' ? 'failed' : null,
          startedAt: latestGen?.started_at ?? null,
          summary: latestGen?.summary ?? null,
          error: latestGen?.error ?? null,
        },
        publishing: {
          fired: pubLogs.length,
          failed: pubLogs.filter((l: any) => l.status === 'failed').length,
          published: pubLogs.filter((l: any) => {
            const s = l.summary as any
            return s && (s.jobsSucceeded > 0)
          }).length,
        },
      })

      cursor.setDate(cursor.getDate() - 1)
    }

    return NextResponse.json({ days: result })
  } catch (error) {
    console.error('[cron-logs GET] unexpected error', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
