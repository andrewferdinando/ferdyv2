'use client';

import { supabase } from '@/lib/supabase-browser';
import { canonicalizeChannel, SUPPORTED_CHANNELS } from '@/lib/channels';
import type { PostJobSummary } from '@/types/postJobs';

const CHANNEL_ORDER = SUPPORTED_CHANNELS;
const CHANNEL_ORDER_INDEX = new Map(CHANNEL_ORDER.map((channel, index) => [channel, index]));

/**
 * Fetches post_jobs for given draft IDs and groups them by draft_id
 * @param draftIds Array of draft IDs to fetch post_jobs for
 * @returns Record mapping draft_id to array of PostJobSummary
 */
export async function fetchJobsByDraftId(
  draftIds: string[]
): Promise<Record<string, PostJobSummary[]>> {
  if (!supabase || draftIds.length === 0) {
    return {};
  }

  console.log('fetchJobsByDraftId: Fetching jobs for draftIds:', draftIds);

  const { data: jobsData, error: jobsError } = await supabase
    .from('post_jobs')
    .select('id, draft_id, channel, status, error, external_post_id, external_url, last_attempt_at')
    .in('draft_id', draftIds);

  if (jobsError) {
    console.error('fetchJobsByDraftId: Failed to load post_jobs', jobsError);
    return {};
  }

  console.log('fetchJobsByDraftId: Raw jobsData:', jobsData);
  console.log('fetchJobsByDraftId: jobsData count:', jobsData?.length || 0);

  const map: Record<string, PostJobSummary[]> = {};
  (jobsData ?? []).forEach((job) => {
    if (!job.draft_id) return;
    const canonical = canonicalizeChannel(job.channel) ?? job.channel;
    const entry: PostJobSummary = {
      id: job.id,
      draft_id: job.draft_id,
      channel: canonical,
      status: job.status,
      error: job.error ?? null,
      external_post_id: job.external_post_id ?? null,
      external_url: job.external_url ?? null,
      last_attempt_at: job.last_attempt_at ?? null,
    };

    if (!map[job.draft_id]) {
      map[job.draft_id] = [];
    }

    map[job.draft_id].push(entry);
  });

  // Sort jobs by channel order
  for (const draftId of Object.keys(map)) {
    map[draftId].sort((a, b) => {
      const aIndex = CHANNEL_ORDER_INDEX.get(a.channel) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = CHANNEL_ORDER_INDEX.get(b.channel) ?? Number.MAX_SAFE_INTEGER;
      if (aIndex === bIndex) {
        return a.channel.localeCompare(b.channel);
      }
      return aIndex - bIndex;
    });
  }

  console.log('fetchJobsByDraftId: Final map:', map);
  console.log('fetchJobsByDraftId: Map keys (draftIds):', Object.keys(map));
  Object.entries(map).forEach(([draftId, jobs]) => {
    const channels = jobs.map(j => j.channel);
    console.log(`fetchJobsByDraftId: Draft ${draftId} has ${jobs.length} jobs with channels:`, channels);
    if (jobs.length > 1) {
      console.log(`fetchJobsByDraftId: ⚠️ Draft ${draftId} HAS MULTIPLE JOBS - channels:`, channels);
    }
  });

  return map;
}

