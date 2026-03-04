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

export interface PipelineRow {
  key: string
  brandId: string
  brandName: string
  subcategoryId: string | null
  subcategoryName: string
  scheduledFor: string
  scheduledForLocal: string
  status: 'draft' | 'approved_scheduled' | 'published' | 'needs_attention' | 'not_created'
  draftId: string | null
  cadence: string | null
  notCreatedReason: 'setup_incomplete' | 'outside_window' | 'pending_generation' | null
}

function formatInTimezone(isoString: string, timezone: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleString('en-NZ', {
      timeZone: timezone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return isoString
  }
}

function mapDraftStatus(
  draft: { status: string; approved: boolean | null }
): PipelineRow['status'] {
  if (draft.status === 'published') return 'published'
  if (draft.status === 'failed' || draft.status === 'partially_published')
    return 'needs_attention'
  if (draft.status === 'scheduled' && draft.approved) return 'approved_scheduled'
  return 'draft'
}

// --- Cadence formatting helpers ---

function formatTimeString(timeStr: string): string {
  let cleaned = timeStr.trim()
  if (cleaned.startsWith('@')) cleaned = cleaned.substring(1).trim()
  const parts = cleaned.split(':')
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`
  return cleaned
}

function formatOrdinal(num: number): string {
  const suffix = ['th', 'st', 'nd', 'rd']
  const v = num % 100
  return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0])
}

function formatNthWeekday(nthWeek: number, weekday: number): string {
  const ordinals: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: 'Last' }
  const dayNames: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }
  return `${ordinals[nthWeek] || nthWeek + 'th'} ${dayNames[weekday] || 'day'}`
}

function buildCadenceString(rule: any): string {
  const times: string[] = (rule.time_of_day ?? rule.times_of_day ?? [])
  const timeStr = times.map(formatTimeString).join(' & ')

  switch (rule.frequency) {
    case 'daily':
      return `Daily at ${timeStr || '?'}`
    case 'weekly': {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const days: number[] = rule.days_of_week ?? []
      const dayList = days.sort((a: number, b: number) => a - b).map((d: number) => dayNames[d] ?? d).join(', ')
      return `Weekly on ${dayList || '?'} at ${timeStr || '?'}`
    }
    case 'monthly': {
      if (rule.nth_week && rule.weekday != null) {
        return `${formatNthWeekday(rule.nth_week, rule.weekday)} of month at ${timeStr || '?'}`
      }
      const dom = rule.day_of_month
      if (Array.isArray(dom)) {
        const dayList = dom.map((d: number) => formatOrdinal(d)).join(' & ')
        return `Monthly on ${dayList} at ${timeStr || '?'}`
      }
      if (dom != null) {
        return `Monthly on ${formatOrdinal(dom)} at ${timeStr || '?'}`
      }
      return `Monthly at ${timeStr || '?'}`
    }
    case 'specific':
      return 'Specific (event-based)'
    default:
      return rule.frequency ?? 'Unknown'
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateSuperAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const now = new Date()

    const defaultFrom = new Date(now)
    defaultFrom.setDate(defaultFrom.getDate() - 5)
    const defaultTo = new Date(now)
    defaultTo.setDate(defaultTo.getDate() + 10)

    const fromStr = searchParams.get('from') || defaultFrom.toISOString().slice(0, 10)
    const toStr = searchParams.get('to') || defaultTo.toISOString().slice(0, 10)

    // Build date range for queries (full days in UTC)
    const fromDate = `${fromStr}T00:00:00Z`
    const toDate = `${toStr}T23:59:59Z`

    // 4 parallel queries (added schedule_rules, updated subcategories to include setup_complete)
    const [brandsResult, draftsResult, subcategoriesResult, rulesResult] = await Promise.all([
      supabaseAdmin
        .from('brands')
        .select('id, name, timezone')
        .eq('status', 'active'),
      supabaseAdmin
        .from('drafts')
        .select('id, brand_id, subcategory_id, scheduled_for, status, approved, subcategories(name)')
        .not('status', 'eq', 'deleted')
        .gte('scheduled_for', fromDate)
        .lte('scheduled_for', toDate),
      supabaseAdmin
        .from('subcategories')
        .select('id, name, setup_complete'),
      supabaseAdmin
        .from('schedule_rules')
        .select('id, brand_id, subcategory_id, frequency, days_of_week, day_of_month, nth_week, weekday, time_of_day, times_of_day')
        .eq('is_active', true),
    ])

    if (brandsResult.error) throw brandsResult.error
    if (draftsResult.error) throw draftsResult.error
    if (subcategoriesResult.error) throw subcategoriesResult.error
    if (rulesResult.error) throw rulesResult.error

    const brands = brandsResult.data ?? []
    const drafts = draftsResult.data ?? []
    const subcategories = subcategoriesResult.data ?? []
    const rules = rulesResult.data ?? []

    const brandMap = new Map(brands.map((b: any) => [b.id, b]))
    const subcatMap = new Map(subcategories.map((s: any) => [s.id, { name: s.name, setup_complete: s.setup_complete }]))

    // Build cadence lookup: brand_id|subcategory_id -> cadence string
    const cadenceMap = new Map<string, string>()
    for (const rule of rules) {
      const key = `${rule.brand_id}|${rule.subcategory_id}`
      cadenceMap.set(key, buildCadenceString(rule))
    }

    // 30-day window boundary for notCreatedReason
    const thirtyDaysFromNow = new Date(now)
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    // Build rows from actual drafts
    const rows: PipelineRow[] = []

    for (const draft of drafts) {
      const brand = brandMap.get(draft.brand_id)
      if (!brand) continue

      const subcatName =
        (draft.subcategories as any)?.name ??
        subcatMap.get(draft.subcategory_id)?.name ??
        'Unknown'

      const cadenceKey = `${draft.brand_id}|${draft.subcategory_id}`

      rows.push({
        key: `draft-${draft.id}`,
        brandId: draft.brand_id,
        brandName: brand.name,
        subcategoryId: draft.subcategory_id,
        subcategoryName: subcatName,
        scheduledFor: new Date(draft.scheduled_for).toISOString(),
        scheduledForLocal: formatInTimezone(draft.scheduled_for, brand.timezone),
        status: mapDraftStatus(draft),
        draftId: draft.id,
        cadence: cadenceMap.get(cadenceKey) ?? null,
        notCreatedReason: null,
      })
    }

    // Build a set of existing draft keys for dedup
    const existingDraftKeys = new Set(
      drafts.map((d: any) => {
        const normalized = new Date(d.scheduled_for).toISOString()
        return `${d.brand_id}|${d.subcategory_id}|${normalized}`
      })
    )

    // For future dates: call RPC per brand to get expected targets
    const toDateObj = new Date(toDate)
    const rpcResults = await Promise.all(
      brands.map(async (brand: any) => {
        const { data: targets, error } = await supabaseAdmin.rpc(
          'rpc_framework_targets',
          { p_brand_id: brand.id }
        )
        if (error || !targets) return []
        return (targets as any[])
          .filter((t: any) => {
            const scheduledAt = new Date(t.scheduled_at)
            return scheduledAt >= now && scheduledAt <= toDateObj
          })
          .map((t: any) => ({ ...t, brandId: brand.id }))
      })
    )

    // Add "not_created" rows for targets without drafts
    for (const targets of rpcResults) {
      for (const target of targets) {
        const brand = brandMap.get(target.brandId)
        if (!brand) continue

        const normalized = new Date(target.scheduled_at).toISOString()
        const dedupKey = `${target.brandId}|${target.subcategory_id}|${normalized}`

        if (!existingDraftKeys.has(dedupKey)) {
          const subcat = subcatMap.get(target.subcategory_id)
          const subcatName = subcat?.name ?? 'Unknown'
          const cadenceKey = `${target.brandId}|${target.subcategory_id}`
          const scheduledDate = new Date(normalized)

          let notCreatedReason: PipelineRow['notCreatedReason'] = 'pending_generation'
          if (subcat && subcat.setup_complete === false) {
            notCreatedReason = 'setup_incomplete'
          } else if (scheduledDate > thirtyDaysFromNow) {
            notCreatedReason = 'outside_window'
          }

          rows.push({
            key: `target-${target.brandId}-${target.subcategory_id}-${normalized}`,
            brandId: target.brandId,
            brandName: brand.name,
            subcategoryId: target.subcategory_id,
            subcategoryName: subcatName,
            scheduledFor: normalized,
            scheduledForLocal: formatInTimezone(normalized, brand.timezone),
            status: 'not_created',
            draftId: null,
            cadence: cadenceMap.get(cadenceKey) ?? null,
            notCreatedReason,
          })
        }
      }
    }

    // Sort: scheduledFor asc, then brandName, then subcategoryName
    rows.sort((a, b) => {
      const dateCompare = a.scheduledFor.localeCompare(b.scheduledFor)
      if (dateCompare !== 0) return dateCompare
      const brandCompare = a.brandName.localeCompare(b.brandName)
      if (brandCompare !== 0) return brandCompare
      return a.subcategoryName.localeCompare(b.subcategoryName)
    })

    return NextResponse.json({ rows })
  } catch (error) {
    console.error('[post-pipeline GET] unexpected error', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
