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

export interface BrandHealthRow {
  id: string
  name: string
  groupId: string
  timezone: string
  createdAt: string
  subscriptionStatus: string | null
  draftsGenerated30d: number
  upcoming30d: number
  draftCount: number
  scheduledCount: number
  publishedCount: number
  partialCount: number
  failedCount: number
  failedDraftIds: string[]
  partialDraftIds: string[]
  socialStatus: 'active' | 'disconnected' | 'none'
  lastDraftGenerated: string | null
  lastDraftInfo: {
    id: string
    copy: string | null
    status: string
    scheduledFor: string | null
    subcategoryName: string | null
  } | null
  nextDraftCreation: string | null
  nextDraftInfo: {
    targetDate: string
    frequency: string
    frontier: string
  } | null
  nextScheduledPublish: string | null
  lowMediaCount: number
  daysActive: number
}

/**
 * Compute the next target date from a schedule rule after a given date.
 * Returns a Date (start of day UTC) or null if no future target can be computed.
 */
function computeNextTargetDate(
  rule: {
    frequency: string
    days_of_week: number[] | null
    day_of_month: number[] | null
  },
  afterDate: Date
): Date | null {
  // Normalize to start of day
  const after = new Date(afterDate)
  after.setUTCHours(0, 0, 0, 0)

  switch (rule.frequency) {
    case 'daily': {
      // Next day after afterDate
      const next = new Date(after)
      next.setUTCDate(next.getUTCDate() + 1)
      return next
    }

    case 'weekly': {
      const dow = rule.days_of_week ?? []
      if (dow.length === 0) return null
      // days_of_week is ISO (1=Mon, 7=Sun)
      // JS getUTCDay() returns 0=Sun, 6=Sat — convert to ISO
      for (let offset = 1; offset <= 7; offset++) {
        const candidate = new Date(after)
        candidate.setUTCDate(candidate.getUTCDate() + offset)
        const jsDay = candidate.getUTCDay() // 0=Sun
        const isoDay = jsDay === 0 ? 7 : jsDay // convert to ISO (1=Mon, 7=Sun)
        if (dow.includes(isoDay)) return candidate
      }
      return null
    }

    case 'monthly': {
      const doms = rule.day_of_month ?? []
      if (doms.length === 0) return null
      const sorted = [...doms].sort((a, b) => a - b)
      // Try current month, then up to 2 months ahead
      for (let monthOffset = 0; monthOffset <= 2; monthOffset++) {
        const year = after.getUTCFullYear()
        const month = after.getUTCMonth() + monthOffset
        for (const dom of sorted) {
          const candidate = new Date(Date.UTC(year, month, dom))
          // Check the day wasn't clamped (e.g. Feb 30 → Mar 2)
          if (candidate.getUTCDate() !== dom) continue
          if (candidate > after) return candidate
        }
      }
      return null
    }

    default:
      // 'specific' or unknown — can't predict next occurrence
      return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateSuperAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const thirtyDaysFromNowISO = thirtyDaysFromNow.toISOString()

    const [brandsRes, draftsRes, failedJobsRes, socialRes, tagsRes, assetTagsRes, rulesRes] =
      await Promise.all([
        // 1. Active brands with group subscription status
        supabaseAdmin
          .from('brands')
          .select('id, name, group_id, timezone, created_at, groups(subscription_status)')
          .eq('status', 'active'),

        // 2. Non-deleted drafts (include id/copy/subcategory for last-draft popup + schedule_source for frontier)
        supabaseAdmin
          .from('drafts')
          .select('id, brand_id, status, created_at, scheduled_for, copy, subcategory_id, schedule_source, subcategories(name)')
          .not('status', 'eq', 'deleted'),

        // 3. Failed post_jobs
        supabaseAdmin
          .from('post_jobs')
          .select('brand_id, draft_id')
          .eq('status', 'failed'),

        // 4. Social accounts
        supabaseAdmin
          .from('social_accounts')
          .select('brand_id, status'),

        // 5. Active subcategory tags
        supabaseAdmin
          .from('tags')
          .select('id, brand_id')
          .eq('kind', 'subcategory')
          .eq('is_active', true),

        // 6. Asset-tag links
        supabaseAdmin
          .from('asset_tags')
          .select('tag_id'),

        // 7. Active schedule rules
        supabaseAdmin
          .from('schedule_rules')
          .select('id, brand_id, frequency, days_of_week, day_of_month')
          .eq('is_active', true),
      ])

    if (brandsRes.error) {
      return NextResponse.json({ error: brandsRes.error.message }, { status: 500 })
    }

    const brands = brandsRes.data ?? []
    const drafts = draftsRes.data ?? []
    const failedJobs = failedJobsRes.data ?? []
    const socialAccounts = socialRes.data ?? []
    const tags = tagsRes.data ?? []
    const assetTags = assetTagsRes.data ?? []
    const rules = rulesRes.data ?? []

    // Build lookup maps
    const assetCountByTag = new Map<string, number>()
    for (const at of assetTags) {
      assetCountByTag.set(at.tag_id, (assetCountByTag.get(at.tag_id) ?? 0) + 1)
    }

    // Per-brand aggregation
    const draftsByBrand = new Map<string, typeof drafts>()
    for (const d of drafts) {
      const list = draftsByBrand.get(d.brand_id) ?? []
      list.push(d)
      draftsByBrand.set(d.brand_id, list)
    }

    const failedByBrand = new Map<string, number>()
    const failedDraftIdsByBrand = new Map<string, Set<string>>()
    for (const j of failedJobs) {
      failedByBrand.set(j.brand_id, (failedByBrand.get(j.brand_id) ?? 0) + 1)
      if (j.draft_id) {
        const set = failedDraftIdsByBrand.get(j.brand_id) ?? new Set()
        set.add(j.draft_id)
        failedDraftIdsByBrand.set(j.brand_id, set)
      }
    }

    const socialByBrand = new Map<string, string[]>()
    for (const s of socialAccounts) {
      const list = socialByBrand.get(s.brand_id) ?? []
      list.push(s.status)
      socialByBrand.set(s.brand_id, list)
    }

    const tagsByBrand = new Map<string, typeof tags>()
    for (const t of tags) {
      const list = tagsByBrand.get(t.brand_id) ?? []
      list.push(t)
      tagsByBrand.set(t.brand_id, list)
    }

    const rulesByBrand = new Map<string, typeof rules>()
    for (const r of rules) {
      const list = rulesByBrand.get(r.brand_id) ?? []
      list.push(r)
      rulesByBrand.set(r.brand_id, list)
    }

    const nowISO = now.toISOString()

    const rows: BrandHealthRow[] = brands.map((brand: any) => {
      const brandDrafts = draftsByBrand.get(brand.id) ?? []

      // Drafts generated in last 30 days
      const draftsGenerated30d = brandDrafts.filter(
        (d) => d.created_at && d.created_at >= thirtyDaysAgo
      ).length

      // Upcoming 30 days
      const upcoming30d = brandDrafts.filter(
        (d) =>
          d.scheduled_for &&
          d.scheduled_for >= nowISO &&
          d.scheduled_for <= thirtyDaysFromNowISO &&
          (d.status === 'draft' || d.status === 'scheduled')
      ).length

      // Status counts
      let draftCount = 0
      let scheduledCount = 0
      let publishedCount = 0
      let partialCount = 0
      const partialDraftIds: string[] = []

      for (const d of brandDrafts) {
        if (d.status === 'draft') draftCount++
        else if (d.status === 'scheduled') scheduledCount++
        else if (d.status === 'published') publishedCount++
        else if (d.status === 'partially_published') {
          partialCount++
          partialDraftIds.push(d.id)
        }
      }

      // Failed post_jobs
      const failedCount = failedByBrand.get(brand.id) ?? 0

      // Social status
      const statuses = socialByBrand.get(brand.id) ?? []
      let socialStatus: 'active' | 'disconnected' | 'none' = 'none'
      if (statuses.length > 0) {
        socialStatus = statuses.some((s) => s === 'connected') ? 'active' : 'disconnected'
      }

      // Last draft generated (framework/auto-generated only, not manual posts)
      let lastDraftGenerated: string | null = null
      let lastDraftObj: (typeof brandDrafts)[0] | null = null
      for (const d of brandDrafts) {
        if (
          d.schedule_source === 'framework' &&
          d.created_at &&
          (!lastDraftGenerated || d.created_at > lastDraftGenerated)
        ) {
          lastDraftGenerated = d.created_at
          lastDraftObj = d
        }
      }

      // Next scheduled publish
      let nextScheduledPublish: string | null = null
      for (const d of brandDrafts) {
        if (
          d.scheduled_for &&
          d.scheduled_for >= nowISO &&
          (d.status === 'draft' || d.status === 'scheduled')
        ) {
          if (!nextScheduledPublish || d.scheduled_for < nextScheduledPublish) {
            nextScheduledPublish = d.scheduled_for
          }
        }
      }

      // Next draft creation: when will the cron next create a new draft for this brand?
      // Find the frontier = max scheduled_for of framework drafts
      // Then compute the next target from schedule rules after the frontier
      // Creation date = max(today, nextTarget - 30 days)
      let nextDraftCreation: string | null = null
      let nextDraftInfo: BrandHealthRow['nextDraftInfo'] = null
      const brandRules = rulesByBrand.get(brand.id) ?? []

      if (brandRules.length > 0) {
        // Find frontier: the furthest-out scheduled_for from framework drafts
        let frontier: Date = now
        for (const d of brandDrafts) {
          if (d.schedule_source === 'framework' && d.scheduled_for) {
            const sf = new Date(d.scheduled_for)
            if (sf > frontier) frontier = sf
          }
        }

        // Find the earliest next target across all rules
        let earliestNextTarget: Date | null = null
        let matchedFrequency: string | null = null
        for (const rule of brandRules) {
          const nextTarget = computeNextTargetDate(rule, frontier)
          if (nextTarget && (!earliestNextTarget || nextTarget < earliestNextTarget)) {
            earliestNextTarget = nextTarget
            matchedFrequency = rule.frequency
          }
        }

        if (earliestNextTarget) {
          // Draft gets created when this target enters the 30-day window
          // i.e., when today >= (target - 30 days)
          const creationDate = new Date(earliestNextTarget.getTime() - 30 * 24 * 60 * 60 * 1000)
          // If the creation date is in the past or today, the cron will create it on the next run
          const effectiveDate = creationDate < now ? now : creationDate
          nextDraftCreation = effectiveDate.toISOString()
          nextDraftInfo = {
            targetDate: earliestNextTarget.toISOString(),
            frequency: matchedFrequency ?? 'unknown',
            frontier: frontier.toISOString(),
          }
        }
      }

      // Low media: subcategory tags with < 3 linked assets
      const brandTags = tagsByBrand.get(brand.id) ?? []
      const lowMediaCount = brandTags.filter(
        (t) => (assetCountByTag.get(t.id) ?? 0) < 3
      ).length

      // Subscription
      const subscriptionStatus = brand.groups?.subscription_status ?? null

      // Days active
      const daysActive = Math.floor(
        (now.getTime() - new Date(brand.created_at).getTime()) / (24 * 60 * 60 * 1000)
      )

      return {
        id: brand.id,
        name: brand.name,
        groupId: brand.group_id,
        timezone: brand.timezone,
        createdAt: brand.created_at,
        subscriptionStatus,
        draftsGenerated30d,
        upcoming30d,
        draftCount,
        scheduledCount,
        publishedCount,
        partialCount,
        failedCount,
        failedDraftIds: [...(failedDraftIdsByBrand.get(brand.id) ?? [])],
        partialDraftIds,
        socialStatus,
        lastDraftGenerated,
        lastDraftInfo: lastDraftObj
          ? {
              id: lastDraftObj.id,
              copy: (lastDraftObj as any).copy ?? null,
              status: lastDraftObj.status,
              scheduledFor: lastDraftObj.scheduled_for,
              subcategoryName: (lastDraftObj as any).subcategories?.name ?? null,
            }
          : null,
        nextDraftCreation,
        nextDraftInfo,
        nextScheduledPublish,
        lowMediaCount,
        daysActive,
      }
    })

    return NextResponse.json({ brands: rows })
  } catch (error) {
    console.error('[system-health GET] unexpected error', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
