import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { publishJob } from '@/server/publishing/publishJob'
import { canonicalizeChannel } from '@/lib/channels'

type PostJobRow = {
  id: string
  draft_id: string | null
  brand_id: string
  channel: string
  status: string
  error: string | null
  external_post_id: string | null
  external_url: string | null
  scheduled_at: string
  target_month: string
  last_attempt_at: string | null
}

type DraftRow = {
  id: string
  brand_id: string
  channel: string | null
  status: string
  scheduled_for: string | null
  asset_ids: string[] | null
  hashtags: string[] | null
  copy: string | null
  published_at: string | null
}

type SocialAccountRow = {
  id: string
  provider: string
  handle: string | null
  status: string
}

const PENDING_STATUSES = new Set(['pending', 'generated', 'ready', 'publishing'])
const SUCCESS_STATUSES = new Set(['success', 'published'])

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json()
    
    // Tolerant parsing: accept draftId, draft_id, or id
    const draftId = body.draftId || body.draft_id || body.id

    // Temporary logging for debugging
    console.log('[retry] draftId from body:', draftId)
    console.log('[retry] full body:', JSON.stringify(body))

    if (!draftId || typeof draftId !== 'string') {
      return NextResponse.json(
        { error: 'draftId is required' },
        { status: 400 }
      )
    }

    // Load the draft and verify it exists (same client pattern as /api/publishing/run)
    const { data: draft, error: draftError } = await supabaseAdmin
      .from('drafts')
      .select('id, brand_id, channel, status, scheduled_for, asset_ids, hashtags, copy, published_at')
      .eq('id', draftId)
      .single()

    if (draftError || !draft) {
      console.error('Error loading draft:', draftError)
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    // Load all failed post_jobs for this draft
    const { data: failedJobs, error: jobsError } = await supabaseAdmin
      .from('post_jobs')
      .select('*')
      .eq('draft_id', draftId)
      .eq('status', 'failed')

    if (jobsError) {
      console.error('Error loading failed jobs:', jobsError)
      return NextResponse.json(
        { error: 'Failed to load post jobs' },
        { status: 500 }
      )
    }

    if (!failedJobs || failedJobs.length === 0) {
      // No failed jobs to retry
      return NextResponse.json({
        ok: true,
        retried: 0,
        draftStatus: draft.status,
        jobs: [],
      })
    }

    // Load social accounts for this brand
    const { data: socialAccountsData } = await supabaseAdmin
      .from('social_accounts')
      .select('id, provider, handle, status')
      .eq('brand_id', draft.brand_id)
      .in('provider', ['facebook', 'instagram', 'linkedin'])
      .eq('status', 'connected')

    const socialAccounts =
      socialAccountsData?.reduce<Record<string, SocialAccountRow>>((acc, account) => {
        acc[account.provider] = account
        return acc
      }, {}) ?? {}

    // Retry each failed job
    let retried = 0
    const jobResults: PostJobRow[] = []

    for (const job of failedJobs) {
      const result = await publishJob(job as PostJobRow, draft as DraftRow, socialAccounts)
      retried += 1

      // Reload the job to get updated status
      const { data: updatedJob } = await supabaseAdmin
        .from('post_jobs')
        .select('*')
        .eq('id', job.id)
        .single()

      if (updatedJob) {
        jobResults.push(updatedJob as PostJobRow)
      }
    }

    // Reload all jobs for this draft to compute status
    const { data: allJobs } = await supabaseAdmin
      .from('post_jobs')
      .select('*')
      .eq('draft_id', draftId)

    const updatedDraftStatus = computeDraftStatusFromJobs(allJobs || [])

    // Update draft status if it changed
    if (updatedDraftStatus !== draft.status) {
      const updates: Partial<DraftRow> & { published_at?: string | null } = {}
      updates.status = updatedDraftStatus

      if (updatedDraftStatus === 'published' && !draft.published_at) {
        updates.published_at = new Date().toISOString()
      }

      await supabaseAdmin
        .from('drafts')
        .update(updates)
        .eq('id', draftId)
    }

    // Return response
    return NextResponse.json({
      ok: true,
      retried,
      draftStatus: updatedDraftStatus,
      jobs: jobResults.map((job) => ({
        id: job.id,
        draft_id: job.draft_id,
        channel: canonicalizeChannel(job.channel) ?? job.channel,
        status: job.status,
        error: job.error,
        external_post_id: job.external_post_id,
        external_url: job.external_url,
        last_attempt_at: job.last_attempt_at,
      })),
    })
  } catch (error) {
    console.error('Error in retry endpoint:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

function computeDraftStatusFromJobs(jobs: PostJobRow[]): string {
  if (jobs.length === 0) {
    return 'scheduled'
  }

  const statuses = jobs.map((job) => job.status)
  const hasPending = statuses.some((status) => PENDING_STATUSES.has(status))
  const hasSuccess = statuses.some((status) => SUCCESS_STATUSES.has(status))
  const hasFailed = statuses.some((status) => status === 'failed')

  if (!hasPending && hasSuccess && !hasFailed) {
    return 'published'
  } else if (!hasPending && hasSuccess && hasFailed) {
    return 'partially_published'
  } else if (!hasSuccess && hasFailed && !hasPending) {
    return 'scheduled'
  }

  // Default: keep current status (scheduled or partially_published)
  return 'scheduled'
}
