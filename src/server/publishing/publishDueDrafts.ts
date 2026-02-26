import { supabaseAdmin } from '@/lib/supabase-server'
import {
  canonicalizeChannel,
  LEGACY_CHANNEL_ALIASES,
  SUPPORTED_CHANNELS,
} from '@/lib/channels'
import { publishJob, notifyPostPublishedBatched } from './publishJob'
import { notifyPublishingFailed } from './notifyPublishingFailed'

type DraftStatus = 'draft' | 'scheduled' | 'partially_published' | 'published' | 'failed'

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
  attempt_count?: number
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

/** Max times a post_job will be attempted before declaring terminal failure */
export const MAX_PUBLISH_ATTEMPTS = 3
/** Delay between in-call retries (ms) */
const RETRY_BACKOFF_MS = 30_000
/** Minimum elapsed time before a cron run will retry a failed job (ms) */
const MIN_RETRY_INTERVAL_MS = 60_000

/**
 * Safely queries post_jobs that are ready to publish.
 * Only returns jobs where:
 * - post_jobs.status is in the allowed statuses
 * - The associated draft exists and has status = 'scheduled' or 'partially_published'
 * 
 * This prevents processing jobs for deleted or invalid drafts.
 * 
 * @param allowedJobStatuses - Set of post_jobs.status values to include
 * @param limit - Maximum number of jobs to return
 * @returns Array of PostJobRow with draft information
 */
export async function getPublishableJobs(
  allowedJobStatuses: Set<string> = PENDING_STATUSES,
  limit = 50,
): Promise<PostJobRow[]> {
  const statusArray = Array.from(allowedJobStatuses)
  
  // Query post_jobs with inner join to drafts to ensure draft exists and is in valid status
  const { data: jobsData, error: jobsError } = await supabaseAdmin
    .from('post_jobs')
    .select(`
      *,
      drafts!post_jobs_draft_id_fkey!inner(id, status)
    `)
    .in('status', statusArray)
    .in('drafts.status', ['scheduled', 'partially_published', 'failed'])
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  if (jobsError) {
    console.error('[getPublishableJobs] Error fetching jobs:', jobsError)
    return []
  }

  if (!jobsData || jobsData.length === 0) {
    return []
  }

  // Map the data to PostJobRow format
  return jobsData.map((job: any) => ({
    id: job.id,
    draft_id: job.draft_id,
    brand_id: job.brand_id,
    channel: job.channel,
    status: job.status,
    error: job.error,
    external_post_id: job.external_post_id,
    external_url: job.external_url,
    scheduled_at: job.scheduled_at,
    target_month: job.target_month,
    last_attempt_at: job.last_attempt_at ?? null,
    attempt_count: job.attempt_count ?? 0,
  })) as PostJobRow[]
}

/**
 * Updates draft status based on post_jobs statuses
 * - All jobs = 'success' → 'published'
 * - Some success + some failed → 'partially_published'
 * - All pending/ready/generated → 'scheduled'
 * Returns the new status
 */
export async function updateDraftStatusFromJobs(draftId: string): Promise<DraftStatus> {
  // Load all post_jobs for this draft (include attempt_count for retry awareness)
  const { data: jobsData, error: jobsError } = await supabaseAdmin
    .from('post_jobs')
    .select('status, attempt_count')
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
  const pendingCount = statuses.filter((status) => PENDING_STATUSES.has(status)).length
  const total = statuses.length

  // Separate terminal failures (exhausted retries) from retriable failures
  const terminalFailedCount = jobsData.filter(
    (job) => job.status === 'failed' && (job.attempt_count ?? 0) >= MAX_PUBLISH_ATTEMPTS,
  ).length
  const retriableFailedCount = jobsData.filter(
    (job) => job.status === 'failed' && (job.attempt_count ?? 0) < MAX_PUBLISH_ATTEMPTS,
  ).length

  let newStatus: DraftStatus

  // All jobs are success → published
  if (successCount === total && total > 0 && terminalFailedCount === 0 && retriableFailedCount === 0 && pendingCount === 0) {
    newStatus = 'published'
  }
  // Some success + some terminal failures (no retriable left) → partially_published
  else if (successCount > 0 && terminalFailedCount > 0 && retriableFailedCount === 0 && pendingCount === 0) {
    newStatus = 'partially_published'
  }
  // All terminal failures → failed
  else if (terminalFailedCount === total && total > 0) {
    newStatus = 'failed'
  }
  // Retries still pending (retriable failures or pending jobs exist) → stay scheduled
  else if (retriableFailedCount > 0 || pendingCount > 0) {
    newStatus = 'scheduled'
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

  // Check if draft is transitioning to a published status and published_at is not set
  const isBecomingPublished = (newStatus === 'published' || newStatus === 'partially_published')
  
  // Get current draft to check published_at
  const { data: currentDraft } = await supabaseAdmin
    .from('drafts')
    .select('published_at')
    .eq('id', draftId)
    .single()

  // Prepare update object
  const updateData: { status: DraftStatus; published_at?: string } = { status: newStatus }

  // Set published_at if draft is becoming published and published_at is not already set
  if (isBecomingPublished && !currentDraft?.published_at) {
    updateData.published_at = new Date().toISOString()
  }

  // Update draft status (and published_at if needed)
  await supabaseAdmin
    .from('drafts')
    .update(updateData)
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
    .in('status', ['scheduled', 'partially_published', 'failed'])
    .eq('approved', true)
    .lte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(limit)

  if (dueError) {
    throw dueError
  }

  // Record cron heartbeat so System Health page knows the cron ran,
  // even when no jobs are due.
  await supabaseAdmin
    .from('cron_heartbeats')
    .upsert({ cron_name: 'publish', last_ran_at: new Date().toISOString() })

  if (!dueDrafts || dueDrafts.length === 0) {
    summary.draftsConsidered = 0
    return summary
  }

  summary.draftsConsidered = dueDrafts.length

  for (const draft of dueDrafts) {
    // Defensive guard: double-check draft status before processing
    // This ensures we never process deleted or non-scheduled drafts
    if (draft.status !== 'scheduled' && draft.status !== 'partially_published' && draft.status !== 'failed') {
      console.warn(`[publishDueDrafts] Skipping draft ${draft.id} with invalid status: ${draft.status}`)
      continue
    }

    // Verify draft still exists and has correct status
    const { data: currentDraft } = await supabaseAdmin
      .from('drafts')
      .select('id, status')
      .eq('id', draft.id)
      .single()

    if (!currentDraft || (currentDraft.status !== 'scheduled' && currentDraft.status !== 'partially_published' && currentDraft.status !== 'failed')) {
      console.warn(`[publishDueDrafts] Draft ${draft.id} no longer exists or has invalid status, cancelling related jobs`)
      
      // Cancel any pending jobs for this draft
      await supabaseAdmin
        .from('post_jobs')
        .update({ status: 'canceled' })
        .eq('draft_id', draft.id)
        .in('status', ['pending', 'generated', 'ready', 'publishing'])
      
      continue
    }

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

  // Defensive guard: never process deleted drafts
  if (draft.status === 'deleted') {
    summary.errors.push({
      draftId,
      channel: 'all',
      error: 'Cannot retry failed channels for deleted draft',
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

  // Defensive guard: never process deleted drafts
  if (draft.status === 'deleted') {
    throw new Error('Cannot publish deleted draft')
  }

  // Auto-fix: If draft status is 'draft' but approved=true, update to 'scheduled'
  // This handles cases where the frontend update didn't complete
  if (draft.status === 'draft' && draft.approved) {
    console.log(`[publishDraftNow] Auto-fixing draft ${draftId} status from 'draft' to 'scheduled'`)
    const { error: statusUpdateError } = await supabaseAdmin
      .from('drafts')
      .update({ status: 'scheduled' })
      .eq('id', draftId)
    
    if (statusUpdateError) {
      console.error(`[publishDraftNow] Failed to update draft status:`, statusUpdateError)
      throw new Error(`Draft has invalid status 'draft' and could not be updated: ${statusUpdateError.message}`)
    }
    
    // Update local draft object
    draft.status = 'scheduled'
  }

  // Defensive guard: verify draft is in a valid status for publishing
  if (draft.status !== 'scheduled' && draft.status !== 'partially_published' && draft.status !== 'failed') {
    throw new Error(`Draft has invalid status '${draft.status}'. Expected 'scheduled', 'partially_published', or 'failed'.`)
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
            attempt_count: 0, // Reset retries for fresh publish
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

  console.log(`[processDraft] Starting for draft ${draft.id}`, {
    draftStatus: draft.status,
    allowedStatuses: Array.from(allowedStatuses),
  })
  
  // Defensive guard: verify draft still exists and is in a valid status
  const { data: currentDraft } = await supabaseAdmin
    .from('drafts')
    .select('id, status')
    .eq('id', draft.id)
    .single()

  console.log(`[processDraft] Current draft from DB:`, currentDraft)

  if (!currentDraft) {
    console.warn(`[processDraft] Draft ${draft.id} no longer exists, cancelling related jobs`)
    // Cancel any pending jobs for this missing draft
    await supabaseAdmin
      .from('post_jobs')
      .update({ status: 'canceled' })
      .eq('draft_id', draft.id)
      .in('status', ['pending', 'generated', 'ready', 'publishing'])
    return false
  }

  if (currentDraft.status !== 'scheduled' && currentDraft.status !== 'partially_published' && currentDraft.status !== 'failed') {
    console.warn(`[processDraft] Draft ${draft.id} has invalid status: ${currentDraft.status}, cancelling related jobs`)
    // Cancel any pending jobs for this invalid draft
    await supabaseAdmin
      .from('post_jobs')
      .update({ status: 'canceled' })
      .eq('draft_id', draft.id)
      .in('status', ['pending', 'generated', 'ready', 'publishing'])
    return false
  }

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

  // Safely query post_jobs for this draft - only get jobs where draft status is valid
  // This is a defensive check even though we already verified the draft above
  console.log(`[processDraft] Querying post_jobs for draft ${draft.id}`)
  
  const { data: existingJobsData, error: jobsError } = await supabaseAdmin
    .from('post_jobs')
    .select(`
      *,
      drafts!post_jobs_draft_id_fkey!inner(id, status)
    `)
    .eq('draft_id', draft.id)
    .in('drafts.status', ['scheduled', 'partially_published', 'failed'])

  console.log(`[processDraft] Post jobs query result:`, {
    found: existingJobsData?.length || 0,
    error: jobsError,
    jobs: existingJobsData?.map(j => ({ id: j.id, status: j.status, channel: j.channel })),
  })

  if (jobsError) {
    console.error(`[processDraft] Error querying post_jobs:`, jobsError)
    summary.errors.push({
      draftId: draft.id,
      channel: 'all',
      error: jobsError.message,
    })
    return false
  }

  // If no jobs found, it might be because draft status changed - cancel any orphaned jobs
  if (!existingJobsData || existingJobsData.length === 0) {
    console.warn(`[processDraft] No jobs found for draft ${draft.id} with inner join`)
    // Check if there are any orphaned jobs (jobs without valid draft)
    const { data: orphanedJobs } = await supabaseAdmin
      .from('post_jobs')
      .select('id, status')
      .eq('draft_id', draft.id)
      .in('status', ['pending', 'generated', 'ready', 'publishing'])
    
    if (orphanedJobs && orphanedJobs.length > 0) {
      console.warn(`[processDraft] Found ${orphanedJobs.length} orphaned jobs for draft ${draft.id}, cancelling them`)
      await supabaseAdmin
        .from('post_jobs')
        .update({ status: 'canceled' })
        .eq('draft_id', draft.id)
        .in('status', ['pending', 'generated', 'ready', 'publishing'])
    }
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
  const successfulJobs: Array<{ job: PostJobRow; channel: string; externalUrl: string | null }> = []

  for (const job of relevantJobs) {
    const jobChannel = canonicalizeChannel(job.channel)
    if (!jobChannel) {
      continue
    }

    if (!allowedStatuses.has(job.status)) {
      // Also allow 'failed' jobs that have retries remaining (cron-based retry)
      const isRetriableFailure =
        job.status === 'failed' && (job.attempt_count ?? 0) < MAX_PUBLISH_ATTEMPTS
      if (!isRetriableFailure) {
        continue
      }
      // Ensure enough time has elapsed since last attempt to avoid rapid retry
      if (job.last_attempt_at) {
        const elapsed = Date.now() - new Date(job.last_attempt_at).getTime()
        if (elapsed < MIN_RETRY_INTERVAL_MS) {
          console.log(`[processDraft] Skipping retriable job ${job.id} (${jobChannel}) - only ${Math.round(elapsed / 1000)}s since last attempt`)
          continue
        }
      }
      console.log(`[processDraft] Retrying failed job ${job.id} (${jobChannel}) - attempt ${(job.attempt_count ?? 0) + 1}/${MAX_PUBLISH_ATTEMPTS}`)
    }

    // Guard against race conditions: skip jobs in 'publishing' status that were
    // started recently (within the last 10 minutes). These are actively being
    // processed by another invocation (e.g. publish-now). Only retry 'publishing'
    // jobs that appear stuck (last_attempt_at > 10 minutes ago or not set).
    if (job.status === 'publishing' && job.last_attempt_at) {
      const lastAttempt = new Date(job.last_attempt_at).getTime()
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000
      if (lastAttempt > tenMinutesAgo) {
        console.log(`[processDraft] Skipping job ${job.id} (${jobChannel}) - still actively publishing (last attempt ${job.last_attempt_at})`)
        continue
      }
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
        job.attempt_count = updatedJobs.attempt_count

        // Track successful job for batched email notification
        successfulJobs.push({
          job: updatedJobs as PostJobRow,
          channel: jobChannel,
          externalUrl: updatedJobs.external_url,
        })
      }
    } else {
      summary.jobsFailed += 1
      summary.errors.push({
        draftId: draft.id,
        channel: jobChannel,
        error: result.error || 'Unknown error',
      })

      // Reload job to get updated status and attempt_count
      const { data: updatedJobs } = await supabaseAdmin
        .from('post_jobs')
        .select('*')
        .eq('id', job.id)
        .single()

      if (updatedJobs) {
        job.status = updatedJobs.status
        job.error = updatedJobs.error
        job.attempt_count = updatedJobs.attempt_count
      }
    }
  }

  if (attempted === 0) {
    return false
  }

  // In-call retry: retry any jobs that failed but were reset to 'ready' (non-terminal).
  // This gives slow channels (e.g. Instagram container processing) a second
  // chance within the same function invocation before deferring to the next cron.
  const retryableJobs = relevantJobs.filter(
    (job) => job.status === 'ready' && (job.attempt_count ?? 0) > 0 && (job.attempt_count ?? 0) < MAX_PUBLISH_ATTEMPTS,
  )

  if (retryableJobs.length > 0) {
    console.log(`[processDraft] Retrying ${retryableJobs.length} failed job(s) for draft ${draft.id}`)

    // Wait before retrying to give external APIs more processing time
    await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS))

    for (const job of retryableJobs) {
      const jobChannel = canonicalizeChannel(job.channel)
      if (!jobChannel) continue

      const retryResult = await publishJob(job, draft, socialAccounts)

      if (retryResult.success) {
        console.log(`[processDraft] In-call retry succeeded for job ${job.id} (${jobChannel})`)
        summary.jobsFailed -= 1
        summary.jobsSucceeded += 1

        // Reload job to get updated status
        const { data: updatedJob } = await supabaseAdmin
          .from('post_jobs')
          .select('*')
          .eq('id', job.id)
          .single()

        if (updatedJob) {
          job.status = updatedJob.status
          job.error = updatedJob.error
          job.external_post_id = updatedJob.external_post_id
          job.external_url = updatedJob.external_url
          job.attempt_count = updatedJob.attempt_count

          successfulJobs.push({
            job: updatedJob as PostJobRow,
            channel: jobChannel,
            externalUrl: updatedJob.external_url,
          })
        }
      } else {
        console.log(`[processDraft] In-call retry failed for job ${job.id} (${jobChannel}):`, retryResult.error)
        // Reload to get updated attempt_count
        const { data: updatedJob } = await supabaseAdmin
          .from('post_jobs')
          .select('*')
          .eq('id', job.id)
          .single()
        if (updatedJob) {
          job.status = updatedJob.status
          job.error = updatedJob.error
          job.attempt_count = updatedJob.attempt_count
        }
      }
    }
  }

  // Update draft status from jobs after processing
  await updateDraftStatusFromJobs(draft.id)

  // Determine if all jobs have reached a terminal state before sending any email.
  // Terminal = succeeded OR failed with attempt_count >= MAX_PUBLISH_ATTEMPTS.
  // If retries are still pending, defer notifications to a later cron run.
  const { data: finalJobsData } = await supabaseAdmin
    .from('post_jobs')
    .select('*')
    .eq('draft_id', draft.id)

  const finalJobs = (finalJobsData ?? []) as PostJobRow[]

  const allTerminal = finalJobs.every(
    (job) =>
      SUCCESS_STATUSES.has(job.status) ||
      (job.status === 'failed' && (job.attempt_count ?? 0) >= MAX_PUBLISH_ATTEMPTS),
  )

  if (!allTerminal) {
    console.log(
      `[processDraft] Deferring notifications for draft ${draft.id} — retries still pending`,
      finalJobs.map((j) => ({ id: j.id, ch: j.channel, st: j.status, att: j.attempt_count })),
    )
    return true
  }

  // All jobs are terminal — send ONE consolidated notification
  const allSucceeded = finalJobs.filter((j) => SUCCESS_STATUSES.has(j.status))
  const allFailed = finalJobs.filter((j) => j.status === 'failed')

  if (allFailed.length === 0 && allSucceeded.length > 0) {
    // Every channel succeeded — send success email
    try {
      const successData = allSucceeded.map((j) => ({
        job: j,
        channel: canonicalizeChannel(j.channel) ?? j.channel,
        externalUrl: j.external_url,
      }))
      await notifyPostPublishedBatched(draft, successData)
    } catch (emailError) {
      console.error('[processDraft] Failed to send post published email:', emailError)
    }
  } else if (allFailed.length > 0) {
    // Some or all channels failed (terminal) — send failure email which includes
    // both the failed and succeeded channel lists
    try {
      await notifyPublishingFailed({
        brandId: draft.brand_id,
        draftId: draft.id,
        failedChannels: allFailed.map((j) => canonicalizeChannel(j.channel) ?? j.channel),
        succeededChannels: allSucceeded.map((j) => canonicalizeChannel(j.channel) ?? j.channel),
      })
    } catch (emailError) {
      console.error('[processDraft] Failed to send publishing failed email:', emailError)
    }
  }

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


