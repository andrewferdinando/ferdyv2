'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';
import DraftCard from '@/components/schedule/DraftCard';
import { resolveActionableMessage, type ActionableMessage } from '@/lib/needsAttention/resolveActionableMessage';
import { getChannelLabel } from '@/lib/channels';
import type { PostJobSummary } from '@/types/postJobs';
import type { SocialAccountSummary } from '@/hooks/useSocialAccounts';
import type { Asset } from '@/hooks/assets/useAssets';

type DraftStatus = 'draft' | 'scheduled' | 'partially_published' | 'published' | 'failed';

interface NeedsAttentionPost {
  id: string;
  brand_id: string;
  post_job_id: string;
  channel: string;
  copy: string;
  hashtags: string[];
  asset_ids: string[];
  tone: string;
  generated_by: 'ai' | 'human' | 'ai+human';
  created_by: string;
  created_at: string;
  approved: boolean;
  status: DraftStatus;
  scheduled_for?: string;
  category_name?: string;
  subcategory_name?: string;
  post_jobs: {
    id: string;
    scheduled_at: string;
    scheduled_local: string;
    scheduled_tz: string;
    status: string;
    target_month: string;
  };
  assets?: Asset[];
}

interface NeedsAttentionTabProps {
  posts: NeedsAttentionPost[];
  loading: boolean;
  onUpdate: () => void;
  jobsByDraftId: Record<string, PostJobSummary[]>;
  socialAccounts: SocialAccountSummary[];
}

export default function NeedsAttentionTab({
  posts,
  loading,
  onUpdate,
  jobsByDraftId,
  socialAccounts,
}: NeedsAttentionTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">All clear</h3>
        <p className="mt-1 text-sm text-gray-500">No posts need your attention right now.</p>
      </div>
    );
  }

  // Sort by scheduled date, most recent first
  const sortedPosts = [...posts].sort((a, b) => {
    const dateA = a.scheduled_for ? new Date(a.scheduled_for).getTime() : new Date(a.created_at).getTime();
    const dateB = b.scheduled_for ? new Date(b.scheduled_for).getTime() : new Date(b.created_at).getTime();
    return dateB - dateA;
  });

  return (
    <div className="space-y-4">
      {sortedPosts.map((post) => {
        const jobs = jobsByDraftId[post.id] || [];
        const message = resolveActionableMessage(post.status, jobs, socialAccounts);

        return (
          <AttentionCard
            key={post.id}
            post={post}
            jobs={jobs}
            message={message}
            socialAccounts={socialAccounts}
            onUpdate={onUpdate}
          />
        );
      })}
    </div>
  );
}

interface AttentionCardProps {
  post: NeedsAttentionPost;
  jobs: PostJobSummary[];
  message: ActionableMessage;
  socialAccounts: SocialAccountSummary[];
  onUpdate: () => void;
}

function AttentionCard({ post, jobs, message, socialAccounts, onUpdate }: AttentionCardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetrying(true);
    try {
      const res = await fetch('/api/publishing/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: post.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ title: data.error || 'Retry failed. Please try again.', type: 'error' });
      } else {
        const retried = data.retried ?? 0;
        const succeeded = (data.jobs ?? []).filter((j: any) => j.status === 'success').length;
        if (succeeded === retried && retried > 0) {
          showToast({ title: 'Post published successfully.', type: 'success' });
        } else if (succeeded > 0) {
          showToast({ title: `Published ${succeeded} of ${retried} channels. Some still need attention.`, type: 'warning' });
        } else {
          showToast({ title: 'Retry attempted but publishing still failed.', type: 'error' });
        }
      }
      onUpdate();
    } catch (err) {
      console.error('[AttentionCard] Retry error:', err);
      showToast({ title: 'Something went wrong. Please try again.', type: 'error' });
    } finally {
      setRetrying(false);
    }
  };

  const handleReconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/brands/${post.brand_id}/integrations`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/brands/${post.brand_id}/edit-post/${post.id}`);
  };

  const bannerColor = message.severity === 'error'
    ? 'border-red-200 bg-red-50'
    : 'border-amber-200 bg-amber-50';

  const iconColor = message.severity === 'error' ? 'text-red-500' : 'text-amber-500';

  const succeededJobs = jobs.filter((j) => j.status === 'success');
  const failedJobs = jobs.filter((j) => j.status === 'failed');

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Attention Banner */}
      <div className={`px-5 py-4 border-b ${bannerColor}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{message.headline}</h3>
            <p className="text-sm text-gray-600 mt-0.5">{message.explanation}</p>
            <p className="text-sm text-gray-700 font-medium mt-1">{message.instruction}</p>

            {/* Channel Breakdown Pills */}
            {(succeededJobs.length > 0 || failedJobs.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {succeededJobs.map((job) => (
                  <span
                    key={job.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {getChannelLabel(job.channel)} published
                  </span>
                ))}
                {failedJobs.map((job) => {
                  const provider = job.channel;
                  const account = socialAccounts.find(
                    (a) => a.provider === provider || job.channel.startsWith(a.provider),
                  );
                  const isDisconnected = !account || account.status !== 'connected';

                  return (
                    <span
                      key={job.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700"
                      title={job.error || undefined}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {getChannelLabel(job.channel)} failed
                      {isDisconnected && (
                        <span className="text-red-500 ml-0.5">(disconnected)</span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {message.actions.map((action) => {
                if (action.type === 'reconnect') {
                  return (
                    <button
                      key={`reconnect-${action.provider}`}
                      onClick={handleReconnect}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {action.label}
                    </button>
                  );
                }
                if (action.type === 'retry') {
                  return (
                    <button
                      key="retry"
                      onClick={handleRetry}
                      disabled={retrying}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] disabled:opacity-50 transition-colors"
                    >
                      {retrying ? 'Retrying...' : action.label}
                    </button>
                  );
                }
                if (action.type === 'edit') {
                  return (
                    <button
                      key="edit"
                      onClick={handleEdit}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {action.label}
                    </button>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Post Content — reuse DraftCard */}
      <div className="p-0">
        <DraftCard
          draft={post}
          onUpdate={onUpdate}
          status={post.status}
          jobs={jobs}
          socialAccounts={socialAccounts}
        />
      </div>
    </div>
  );
}
