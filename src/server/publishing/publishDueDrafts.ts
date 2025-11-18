import { supabaseAdmin } from '@/lib/supabase-server'
import {
  canonicalizeChannel,
  LEGACY_CHANNEL_ALIASES,
  SUPPORTED_CHANNELS,
} from '@/lib/channels'
import { publishJob } from './publishJob'

type DraftStatus = 'draft' | 'scheduled' | 'partially_published' | 'published'

type DraftRow = {
  id: string
  brand_id: string
  channel: string | null
  status: DraftStatus
  scheduled_for: string | null
  asset_ids: string[] | null
  hashtags: string[] | null
  copy: string | null
  approved: boolean
}

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
  last_attempt_at?: string | null
}

type SocialAccountRow = {
  id: string
  provider: string
  account_id: string
  handle: string | null
  status: string
  token_encrypted: string | null
  metadata?: Record<string, unknown> | null
}

export type PublishSummary = {
  draftsConsidered: number
  draftsProcessed: number
  draftsPublished: number
  draftsPartiallyPublished: number
  jobsAttempted: number
  jobsSucceeded: number
  jobsFailed: number
  errors: Array<{ draftId: string; channel: string; error: string }>
}

const PENDING_STATUSES = new Set(['pending', 'generated', 'ready', 'publishing'])
const SUCCESS_STATUSES = new Set(['success', 'published'])
const RETRY_STATUSES = new Set(['failed'])
const SUPPORTED_CHANNEL_SET = new Set(SUPPORTED_CHANNELS)

/**
 * Updates draft status based on post_jobs statuses
 * - All jobs = 'success' → 'published'
 * - Some success + some failed → 'partially_published'
 * - All pending/ready/generated → 'scheduled'
 * Returns the new status
 */
export async function updateDraftStatusFromJobs(draftId: string): Promise<DraftStatus> {
  // Load all post_jobs for this draft
  const { data: jobsData, error: jobsError } = await supabaseAdmin
    .from('post_jobs')
    .select('status')
    .eq('draft_id', draftId)

  if (jobsError || !jobsData || jobsData.length === 0) {
    // If no jobs, return current status (don't change)
    const { data: draft } = await supabaseAdmin
      .from('drafts')
      .select('status')
      .eq('id', draftId)
      .single()
    return (draft?.status as DraftStatus) || 'scheduled'
  }

  const statuses = jobsData.map((job) => job.status)
  const successCount = statuses.filter((status) => SUCCESS_STATUSES.has(status)).length
  const failedCount = statuses.filter((status) => status === 'failed').length
  const pendingCount = statuses.filter((status) => PENDING_STATUSES.has(status)).length
  const total = statuses.length

  let newStatus: DraftStatus

  // All jobs are success → published
  if (successCount === total && total > 0 && failedCount === 0 && pendingCount === 0) {
    newStatus = 'published'
  }
  // Some success + some failed → partially_published
  else if (successCount > 0 && failedCount > 0) {
    newStatus = 'partially_published'
  }
  // All pending/ready/generated → scheduled
  else if (pendingCount === total && total > 0) {
    newStatus = 'scheduled'
  }
  // Otherwise, keep existing status
  else {
    const { data: draft } = await supabaseAdmin
      .from('drafts')
      .select('status')
      .eq('id', draftId)
      .single()
    return (draft?.status as DraftStatus) || 'scheduled'
  }

  // Update draft status
  await supabaseAdmin
    .from('drafts')
    .update({ status: newStatus })
    .eq('id', draftId)

  return newStatus
}

function createEmptySummary(): PublishSummary {
  return {
    draftsConsidered: 0,
    draftsProcessed: 0,
    draftsPublished: 0,
    draftsPartiallyPublished: 0,
    jobsAttempted: 0,
    jobsSucceeded: 0,
    jobsFailed: 0,
    errors: [],
  }
}

export async function publishDueDrafts(limit = 20): Promise<PublishSummary> {
  const summary = createEmptySummary()
  const nowIso = new Date().toISOString()

  const { data: dueDrafts, error: dueError } = await supabaseAdmin
    .from('drafts')
    .select('id, brand_id, channel, status, scheduled_for, asset_ids, hashtags, copy, approved')
    .in('status', ['scheduled', 'partially_published'])
    .eq('approved', true)
    .lte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(limit)

  if (dueError) {
    throw dueError
  }

  if (!dueDrafts || dueDrafts.length === 0) {
    summary.draftsConsidered = 0
    return summary
  }

  summary.draftsConsidered = dueDrafts.length

  for (const draft of dueDrafts) {
    const attempted = await processDraft(draft, {
      allowedStatuses: PENDING_STATUSES,
      ensureJobs: true,
      summary,
    })

    if (attempted) {
      summary.draftsProcessed += 1
    }
  }

  return summary
}

export async function retryFailedChannels(draftId: string): Promise<PublishSummary> {
  const summary = createEmptySummary()
  summary.draftsConsidered = 1

  const { data: draft, error } = await supabaseAdmin
    .from('drafts')
    .select('id, brand_id, channel, status, scheduled_for, asset_ids, hashtags, copy, approved')
    .eq('id', draftId)
    .single()

  if (error || !draft) {
    summary.errors.push({
      draftId,
      channel: 'all',
      error: error?.message ?? 'Draft not found',
    })
    return summary
  }

  const attempted = await processDraft(draft, {
    allowedStatuses: RETRY_STATUSES,
    ensureJobs: false,
    summary,
  })

  if (attempted) {
    summary.draftsProcessed += 1
  }

  return summary
}

export type PublishDraftNowResult = {
  ok: true
  draftId: string
  draftStatus: DraftStatus
  jobs: Array<{
    id: string
    draft_id: string | null
    channel: string
    status: string
    error: string | null
    external_post_id: string | null
    external_url: string | null
    last_attempt_at: string | null
  }>
}

export async function publishDraftNow(draftId: string): Promise<PublishDraftNowResult> {
  const nowIso = new Date().toISOString()

  // Load the draft
  const { data: draft, error: draftError } = await supabaseAdmin
    .from('drafts')
    .select('id, brand_id, channel, status, scheduled_for, asset_ids, hashtags, copy, approved')
    .eq('id', draftId)
    .single()

  if (draftError || !draft) {
    throw new Error('Draft not found')
  }

  // Load all post_jobs for this draft
  const { data: existingJobsData, error: jobsError } = await supabaseAdmin
    .from('post_jobs')
    .select('*')
    .eq('draft_id', draftId)

  if (jobsError) {
    throw new Error(`Failed to load post jobs: ${jobsError.message}`)
  }

  const jobs: PostJobRow[] = (existingJobsData ?? []).map((job) => {
    const canonical = canonicalizeChannel(job.channel)
    return canonical && job.channel !== canonical
      ? { ...job, channel: canonical }
      : (job as PostJobRow)
  })

  if (jobs.length === 0) {
    throw new Error('No post jobs found for this draft')
  }

  // Update post_jobs to be ready for immediate publishing
  // Set scheduled_at to now() and status to 'ready' if it's in a publishable state
  const publishableStatuses = new Set(['pending', 'ready', 'generated', 'failed'])
  const jobsToUpdate = jobs.filter((job) => publishableStatuses.has(job.status))

  if (jobsToUpdate.length > 0) {
    await Promise.all(
      jobsToUpdate.map((job) =>
        supabaseAdmin
          .from('post_jobs')
          .update({
            scheduled_at: nowIso,
            status: job.status === 'failed' ? 'ready' : job.status === 'pending' ? 'ready' : job.status,
            last_attempt_at: null, // Clear previous attempt timestamp
          })
          .eq('id', job.id),
      ),
    )
  }

  // Use processDraft to publish the jobs
  const summary = createEmptySummary()
  summary.draftsConsidered = 1

  const attempted = await processDraft(draft, {
    allowedStatuses: new Set(['pending', 'ready', 'generated', 'failed']),
    ensureJobs: false,
    summary,
  })

  if (!attempted) {
    throw new Error('No jobs were processed')
  }

  // Reload all jobs to get updated statuses
  const { data: updatedJobsData } = await supabaseAdmin
    .from('post_jobs')
    .select('*')
    .eq('draft_id', draftId)

  const updatedJobs: PostJobRow[] = (updatedJobsData ?? []).map((job) => {
    const canonical = canonicalizeChannel(job.channel)
    return canonical && job.channel !== canonical
      ? { ...job, channel: canonical }
      : (job as PostJobRow)
  })

  // Update draft status from jobs
  const newStatus = await updateDraftStatusFromJobs(draftId)

  // Return result
  return {
    ok: true,
    draftId: draft.id,
    draftStatus: newStatus,
    jobs: updatedJobs.map((job) => ({
      id: job.id,
      draft_id: job.draft_id,
      channel: canonicalizeChannel(job.channel) ?? job.channel,
      status: job.status,
      error: job.error,
      external_post_id: job.external_post_id,
      external_url: job.external_url,
      last_attempt_at: job.last_attempt_at ?? null,
    })),
  }
}

async function processDraft(
  draft: DraftRow,
  options: { allowedStatuses: Set<string>; ensureJobs: boolean; summary: PublishSummary },
): Promise<boolean> {
  const { allowedStatuses, ensureJobs, summary } = options
  const nowIso = new Date().toISOString()

  const targetChannels = getCanonicalChannels(draft.channel)
  if (targetChannels.length === 0) {
    return false
  }

  const scheduledAt = draft.scheduled_for ?? nowIso
  const { data: socialAccountsData } = await supabaseAdmin
    .from('social_accounts')
    .select('id, provider, account_id, handle, status, token_encrypted, metadata')
    .eq('brand_id', draft.brand_id)
    .in('provider', ['facebook', 'instagram', 'linkedin'])
    .eq('status', 'connected')

  const socialAccounts =
    socialAccountsData?.reduce<Record<string, SocialAccountRow>>((acc, account) => {
      acc[account.provider] = account
      return acc
    }, {}) ?? {}

  const { data: existingJobsData, error: jobsError } = await supabaseAdmin
    .from('post_jobs')
    .select('*')
    .eq('draft_id', draft.id)

  if (jobsError) {
    summary.errors.push({
      draftId: draft.id,
      channel: 'all',
      error: jobsError.message,
    })
    return false
  }

  const jobs: PostJobRow[] = (existingJobsData ?? []).map((job) => {
    const canonical = canonicalizeChannel(job.channel)
    return canonical && job.channel !== canonical
      ? { ...job, channel: canonical }
      : (job as PostJobRow)
  })

  // Normalize job channels if legacy values exist
  await Promise.all(
    jobs
      .filter((job) => canonicalizeChannel(job.channel) !== job.channel)
      .map((job) =>
        supabaseAdmin
          .from('post_jobs')
          .update({ channel: canonicalizeChannel(job.channel)! })
          .eq('id', job.id),
      ),
  )

  if (ensureJobs) {
    for (const channel of targetChannels) {
      let job = jobs.find((existingJob) => canonicalizeChannel(existingJob.channel) === channel)
      if (!job) {
        const insertedJob = await createPostJob({
          draft,
          channel,
          scheduledAt,
        })

        if (insertedJob) {
          jobs.push(insertedJob)
          job = insertedJob
        }
      }
    }
  }

  const relevantJobs = jobs.filter((job) => {
    const canonical = canonicalizeChannel(job.channel)
    return canonical ? SUPPORTED_CHANNEL_SET.has(canonical) : false
  })

  if (relevantJobs.length === 0) {
    return false
  }

  let attempted = 0

  for (const job of relevantJobs) {
    const jobChannel = canonicalizeChannel(job.channel)
    if (!jobChannel) {
      continue
    }

    if (!allowedStatuses.has(job.status)) {
      continue
    }

    attempted += 1
    summary.jobsAttempted += 1

    const result = await publishJob(job, draft, socialAccounts)

    if (result.success) {
      summary.jobsSucceeded += 1
      // Reload job to get updated status
      const { data: updatedJobs } = await supabaseAdmin
        .from('post_jobs')
        .select('*')
        .eq('id', job.id)
        .single()

      if (updatedJobs) {
        job.status = updatedJobs.status
        job.error = updatedJobs.error
        job.external_post_id = updatedJobs.external_post_id
        job.external_url = updatedJobs.external_url
      }
    } else {
      summary.jobsFailed += 1
      summary.errors.push({
        draftId: draft.id,
        channel: jobChannel,
        error: result.error || 'Unknown error',
      })

      // Reload job to get updated status
      const { data: updatedJobs } = await supabaseAdmin
        .from('post_jobs')
        .select('*')
        .eq('id', job.id)
        .single()

      if (updatedJobs) {
        job.status = updatedJobs.status
        job.error = updatedJobs.error
      }
    }
  }

  if (attempted === 0) {
    return false
  }

  // Update draft status from jobs after processing
  await updateDraftStatusFromJobs(draft.id)

  return true
}

async function createPostJob({
  draft,
  channel,
  scheduledAt,
}: {
  draft: DraftRow
  channel: string
  scheduledAt: string
}): Promise<PostJobRow | null> {
  if (!draft.scheduled_for) {
    return null
  }

  const targetMonth = getTargetMonth(scheduledAt)

  const { data, error } = await supabaseAdmin
    .from('post_jobs')
    .insert({
      brand_id: draft.brand_id,
      draft_id: draft.id,
      channel,
      scheduled_at: scheduledAt,
      scheduled_local: scheduledAt,
      scheduled_tz: 'UTC',
      status: 'pending',
      target_month: targetMonth,
    })
    .select()
    .single()

  if (error) {
    return null
  }

  return data as PostJobRow
}

async function reloadDraftJobs(draftId: string, targetChannels: string[]) {
  const candidates = [
    ...targetChannels,
    ...targetChannels.flatMap((channel) => LEGACY_CHANNEL_ALIASES[channel] ?? []),
  ]

  const { data: jobsData } = await supabaseAdmin
    .from('post_jobs')
    .select('*')
    .eq('draft_id', draftId)
    .in('channel', candidates.length > 0 ? candidates : targetChannels)

  return (jobsData ?? []).map((job) => ({
    ...job,
    channel: canonicalizeChannel(job.channel) ?? job.channel,
  })) as PostJobRow[]
}

// Removed applyDraftStatusFromJobs - replaced by updateDraftStatusFromJobs

function getCanonicalChannels(rawChannel: string | null): string[] {
  if (!rawChannel) return []

  const tokens = rawChannel
    .split(',')
    .map((token) => canonicalizeChannel(token))
    .filter((token): token is string => Boolean(token))

  return Array.from(new Set(tokens))
}

function getTargetMonth(isoString: string) {
  const date = new Date(isoString)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${date.getUTCFullYear()}-${month}-01`
}


