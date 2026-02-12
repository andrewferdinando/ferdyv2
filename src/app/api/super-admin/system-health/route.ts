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
  socialStatus: 'active' | 'disconnected' | 'none'
  lastDraftGenerated: string | null
  nextScheduledPublish: string | null
  lowMediaCount: number
  daysActive: number
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateSuperAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const [brandsRes, draftsRes, failedJobsRes, socialRes, tagsRes, assetTagsRes] =
      await Promise.all([
        // 1. Active brands with group subscription status
        supabaseAdmin
          .from('brands')
          .select('id, name, group_id, timezone, created_at, groups(subscription_status)')
          .eq('status', 'active'),

        // 2. Non-deleted drafts
        supabaseAdmin
          .from('drafts')
          .select('brand_id, status, created_at, scheduled_for')
          .not('status', 'eq', 'deleted'),

        // 3. Failed post_jobs
        supabaseAdmin
          .from('post_jobs')
          .select('brand_id')
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
    for (const j of failedJobs) {
      failedByBrand.set(j.brand_id, (failedByBrand.get(j.brand_id) ?? 0) + 1)
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
          d.scheduled_for <= thirtyDaysFromNow &&
          (d.status === 'draft' || d.status === 'scheduled')
      ).length

      // Status counts
      let draftCount = 0
      let scheduledCount = 0
      let publishedCount = 0
      let partialCount = 0

      for (const d of brandDrafts) {
        if (d.status === 'draft') draftCount++
        else if (d.status === 'scheduled') scheduledCount++
        else if (d.status === 'published') publishedCount++
        else if (d.status === 'partially_published') partialCount++
      }

      // Failed post_jobs
      const failedCount = failedByBrand.get(brand.id) ?? 0

      // Social status
      const statuses = socialByBrand.get(brand.id) ?? []
      let socialStatus: 'active' | 'disconnected' | 'none' = 'none'
      if (statuses.length > 0) {
        socialStatus = statuses.some((s) => s === 'connected') ? 'active' : 'disconnected'
      }

      // Last draft generated
      let lastDraftGenerated: string | null = null
      for (const d of brandDrafts) {
        if (d.created_at && (!lastDraftGenerated || d.created_at > lastDraftGenerated)) {
          lastDraftGenerated = d.created_at
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
        socialStatus,
        lastDraftGenerated,
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
