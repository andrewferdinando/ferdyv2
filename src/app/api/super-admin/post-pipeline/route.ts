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

    // 3 parallel queries
    const [brandsResult, draftsResult, subcategoriesResult] = await Promise.all([
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
        .select('id, name'),
    ])

    if (brandsResult.error) throw brandsResult.error
    if (draftsResult.error) throw draftsResult.error
    if (subcategoriesResult.error) throw subcategoriesResult.error

    const brands = brandsResult.data ?? []
    const drafts = draftsResult.data ?? []
    const subcategories = subcategoriesResult.data ?? []

    const brandMap = new Map(brands.map((b: any) => [b.id, b]))
    const subcatMap = new Map(subcategories.map((s: any) => [s.id, s.name]))

    // Build rows from actual drafts
    const rows: PipelineRow[] = []

    for (const draft of drafts) {
      const brand = brandMap.get(draft.brand_id)
      if (!brand) continue

      const subcatName =
        (draft.subcategories as any)?.name ??
        subcatMap.get(draft.subcategory_id) ??
        'Unknown'

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
          const subcatName = subcatMap.get(target.subcategory_id) ?? 'Unknown'
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
