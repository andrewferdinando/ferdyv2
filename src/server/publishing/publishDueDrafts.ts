import { supabaseAdmin } from '@/lib/supabase-server'

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
  published_at: string | null
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
}

type SocialAccountRow = {
  id: string
  provider: string
  handle: string | null
  status: string
}

type PublishAttemptResult =
  | { success: true; externalId: string; externalUrl: string | null }
  | { success: false; error: string }

type PublishSummary = {
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

const CHANNEL_CANONICAL_MAP: Record<string, string> = {
  facebook: 'facebook',
  'facebook page': 'facebook',
  instagram: 'instagram_feed',
  instagram_feed: 'instagram_feed',
  'instagram feed': 'instagram_feed',
  instagram_story: 'instagram_story',
  'instagram story': 'instagram_story',
  linkedin: 'linkedin_profile',
  linkedin_profile: 'linkedin_profile',
  'linkedin profile': 'linkedin_profile',
}

const LEGACY_CHANNELS: Record<string, string[]> = {
  instagram_feed: ['instagram'],
  linkedin_profile: ['linkedin'],
}

const PROVIDER_BY_CHANNEL: Record<string, string> = {
  facebook: 'facebook',
  instagram_feed: 'instagram',
  instagram_story: 'instagram',
  linkedin_profile: 'linkedin',
}

const SUPPORTED_CHANNELS = new Set([
  'facebook',
  'instagram_feed',
  'instagram_story',
  'linkedin_profile',
])

export async function publishDueDrafts(limit = 20): Promise<PublishSummary> {
  const summary: PublishSummary = {
    draftsConsidered: 0,
    draftsProcessed: 0,
    draftsPublished: 0,
    draftsPartiallyPublished: 0,
    jobsAttempted: 0,
    jobsSucceeded: 0,
    jobsFailed: 0,
    errors: [],
  }

  const nowIso = new Date().toISOString()

  const { data: dueDrafts, error: dueError } = await supabaseAdmin
    .from('drafts')
    .select('id, brand_id, channel, status, scheduled_for, asset_ids, hashtags, copy, published_at')
    .eq('status', 'scheduled')
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
    const targetChannels = getCanonicalChannels(draft.channel)
    if (targetChannels.length === 0) {
      continue
    }

    const scheduledAt = draft.scheduled_for ?? nowIso
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
      continue
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

    // Ensure we have a job per channel
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

    const relevantJobs = jobs.filter((job) => {
      const canonical = canonicalizeChannel(job.channel)
      return canonical ? SUPPORTED_CHANNELS.has(canonical) : false
    })

    if (relevantJobs.length === 0) {
      continue
    }

    summary.draftsProcessed += 1

    for (const job of relevantJobs) {
      const jobChannel = canonicalizeChannel(job.channel)
      if (!jobChannel) {
        continue
      }

      if (!PENDING_STATUSES.has(job.status)) {
        continue
      }

      summary.jobsAttempted += 1

      await supabaseAdmin
        .from('post_jobs')
        .update({ status: 'publishing', last_attempt_at: new Date().toISOString() })
        .eq('id', job.id)

      const provider = PROVIDER_BY_CHANNEL[jobChannel]
      const socialAccount = provider ? socialAccounts[provider] : undefined

      const publishResult = await publishToChannel(jobChannel, draft, socialAccount)

      if (publishResult.success) {
        summary.jobsSucceeded += 1
        const { data: updatedJobs } = await supabaseAdmin
          .from('post_jobs')
          .update({
            status: 'success',
            error: null,
            external_post_id: publishResult.externalId,
            external_url: publishResult.externalUrl,
          })
          .eq('id', job.id)
          .select()
          .single()

        if (updatedJobs) {
          job.status = updatedJobs.status
          job.error = updatedJobs.error
          job.external_post_id = updatedJobs.external_post_id
          job.external_url = updatedJobs.external_url
        } else {
          job.status = 'success'
          job.error = null
          job.external_post_id = publishResult.externalId
          job.external_url = publishResult.externalUrl
        }
      } else {
        summary.jobsFailed += 1
        summary.errors.push({
          draftId: draft.id,
          channel: jobChannel,
          error: publishResult.error,
        })

        const { data: updatedJobs } = await supabaseAdmin
          .from('post_jobs')
          .update({
            status: 'failed',
            error: publishResult.error,
          })
          .eq('id', job.id)
          .select()
          .single()

        if (updatedJobs) {
          job.status = updatedJobs.status
          job.error = updatedJobs.error
        } else {
          job.status = 'failed'
          job.error = publishResult.error
        }
      }
    }

    const updatedJobs = await reloadDraftJobs(draft.id, targetChannels)
    await applyDraftStatusFromJobs(draft, updatedJobs, summary)
  }

  return summary
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
    ...targetChannels.flatMap((channel) => LEGACY_CHANNELS[channel] ?? []),
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

async function applyDraftStatusFromJobs(
  draft: DraftRow,
  jobs: PostJobRow[],
  summary: PublishSummary,
): Promise<void> {
  if (jobs.length === 0) {
    return
  }

  const statuses = jobs.map((job) => job.status)
  const hasPending = statuses.some((status) => PENDING_STATUSES.has(status))
  const hasSuccess = statuses.some((status) => SUCCESS_STATUSES.has(status))
  const hasFailed = statuses.some((status) => status === 'failed')

  let nextStatus: DraftStatus = draft.status
  const updates: Partial<DraftRow> & { published_at?: string | null } = {}

  if (!hasPending && hasSuccess && !hasFailed) {
    nextStatus = 'published'
    updates.published_at = draft.published_at ?? new Date().toISOString()
    summary.draftsPublished += 1
  } else if (!hasPending && hasSuccess && hasFailed) {
    nextStatus = 'partially_published'
    summary.draftsPartiallyPublished += 1
  } else if (!hasSuccess && hasFailed && !hasPending) {
    nextStatus = 'scheduled'
  }

  if (nextStatus !== draft.status) {
    updates.status = nextStatus
    draft.status = nextStatus
  }

  if (Object.keys(updates).length === 0) {
    return
  }

  const { error } = await supabaseAdmin.from('drafts').update(updates).eq('id', draft.id)

  if (error) {
    summary.errors.push({
      draftId: draft.id,
      channel: 'all',
      error: error.message,
    })
  }
}

function getCanonicalChannels(rawChannel: string | null): string[] {
  if (!rawChannel) return []

  const tokens = rawChannel
    .split(',')
    .map((token) => canonicalizeChannel(token))
    .filter((token): token is string => Boolean(token))

  return Array.from(new Set(tokens))
}

function canonicalizeChannel(channel: string | null | undefined): string | null {
  if (!channel) return null
  const normalized = channel.trim().toLowerCase()
  return CHANNEL_CANONICAL_MAP[normalized] ?? null
}

function getTargetMonth(isoString: string) {
  const date = new Date(isoString)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${date.getUTCFullYear()}-${month}-01`
}

async function publishToChannel(
  channel: string,
  draft: DraftRow,
  socialAccount?: SocialAccountRow,
): Promise<PublishAttemptResult> {
  if (!socialAccount) {
    return {
      success: false,
      error: `No connected social account available for ${channel}`,
    }
  }

  // TODO: Replace with real channel-specific publishing logic
  await delay(200)
  const suffix = `${channel}_${Date.now()}`
  return {
    success: true,
    externalId: suffix,
    externalUrl: `https://example.com/${channel}/${suffix}`,
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

