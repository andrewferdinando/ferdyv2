'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import DraftCard from '@/components/schedule/DraftCard';
import { useDrafts } from '@/hooks/useDrafts';
import { useScheduled } from '@/hooks/useScheduled';
import { usePublished } from '@/hooks/usePublished';
import { useToast } from '@/components/ui/ToastProvider';
import { Asset } from '@/hooks/assets/useAssets';
import type { PostJobSummary } from '@/types/postJobs';
import { fetchJobsByDraftId } from '@/hooks/usePostJobs';

// Type definitions
type DraftStatus = 'draft' | 'scheduled' | 'partially_published' | 'published';

interface Draft {
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

interface ScheduledPost {
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

interface PublishedPost {
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
  published_at: string | null;
  scheduled_for: string | null;
  post_jobs: {
    id: string;
    scheduled_at: string;
    scheduled_local: string;
    scheduled_tz: string;
    status: string;
    target_month: string;
  };
  publishes: {
    id: string;
    published_at: string;
    external_post_id: string;
    external_url: string;
    status: string;
    error: string;
  } | null;
  assets?: Asset[];
}

// Icons
const PlusIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

interface Tab {
  id: string;
  name: string;
  count?: number;
}

export default function SchedulePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandId = params.brandId as string;
  const { showToast } = useToast();
  
  // Initialize activeTab from URL query parameter, default to 'drafts'
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    return tabParam && ['drafts', 'scheduled', 'published'].includes(tabParam) ? tabParam : 'drafts';
  });
  
  // Update activeTab when URL query parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['drafts', 'scheduled', 'published'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Fetch data for all tabs
  const { drafts, jobsByDraftId: draftsJobsByDraftId, loading: draftsLoading, refetch: refetchDrafts } = useDrafts(brandId);
  const { scheduled, jobsByDraftId: scheduledJobsByDraftId, loading: scheduledLoading, refetch: refetchScheduled } =
    useScheduled(brandId);
  const { published, loading: publishedLoading, refetch: refetchPublished } = usePublished(brandId);

  const tabs: Tab[] = [
    { id: 'drafts', name: 'Drafts', count: drafts.length },
    { id: 'scheduled', name: 'Scheduled', count: scheduled.length },
    { id: 'published', name: 'Published', count: published.length }
  ];

  const handleNewPostClick = () => {
    router.push(`/brands/${brandId}/new-post`);
  };

  const handleEditPost = (draftId: string) => {
    router.push(`/brands/${brandId}/edit-post/${draftId}`);
  };

  // Combined update function that refetches all tabs
  const handleGlobalUpdate = () => {
    refetchDrafts();
    refetchScheduled();
    refetchPublished();
  };

  useEffect(() => {
    if (searchParams.get('welcome') === '1') {
      const brandName =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('welcomeBrandName') ||
            localStorage.getItem('selectedBrandName'))) ||
        'the brand';

      showToast({
        title: `Welcome to ${brandName}.`,
        type: 'success',
      });

      try {
        localStorage.removeItem('welcomeBrandName');
      } catch {
        // noop
      }

      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('welcome');
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [router, searchParams, showToast]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'drafts':
        return (
          <DraftsTab 
            drafts={drafts} 
            loading={draftsLoading} 
            onUpdate={handleGlobalUpdate}
            jobsByDraftId={draftsJobsByDraftId}
          />
        );
      case 'scheduled':
        return (
          <ScheduledTab 
            scheduled={scheduled} 
            loading={scheduledLoading} 
            onUpdate={refetchScheduled}
            jobsByDraftId={scheduledJobsByDraftId}
          />
        );
      case 'published':
        return (
          <PublishedTab 
            published={published} 
            loading={publishedLoading} 
            onUpdate={refetchPublished}
          />
        );
      default:
        return null;
    }
  };

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Schedule</h1>
              </div>

              <button
                onClick={handleNewPostClick}
                className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#4F46E5] hover:to-[#4338CA] text-white px-4 sm:px-6 py-3 rounded-lg flex items-center justify-center space-x-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm w-full sm:w-auto"
              >
                <PlusIcon className="w-4 h-4" />
                <span>New Post</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-4 sm:gap-8 mt-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 border-b-2 font-medium transition-all duration-200 text-sm ${
                    activeTab === tab.id
                      ? 'border-[#6366F1] text-[#6366F1]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.name}
                  {tab.count !== undefined && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      activeTab === tab.id
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-4 sm:px-6 lg:px-10 py-6">
            {renderTabContent()}
          </div>
        </div>

      </AppLayout>
    </RequireAuth>
  );
}

// Drafts Tab Component
interface DraftsTabProps {
  drafts: Draft[];
  loading: boolean;
  onUpdate: () => void;
  jobsByDraftId: Record<string, PostJobSummary[]>;
}

function DraftsTab({ drafts, loading, onUpdate, jobsByDraftId }: DraftsTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No drafts yet</h3>
        <p className="mt-1 text-sm text-gray-500">Create your first post to get started.</p>
      </div>
    );
  }

  // Sort drafts by scheduled date (earliest first), fallback to post_jobs.scheduled_at or created_at if no scheduled_for
  const sortedDrafts = [...drafts].sort((a, b) => {
    const dateA = a.scheduled_for 
      ? new Date(a.scheduled_for).getTime() 
      : (a.post_jobs?.scheduled_at ? new Date(a.post_jobs.scheduled_at).getTime() : new Date(a.created_at).getTime());
    const dateB = b.scheduled_for 
      ? new Date(b.scheduled_for).getTime() 
      : (b.post_jobs?.scheduled_at ? new Date(b.post_jobs.scheduled_at).getTime() : new Date(b.created_at).getTime());
    return dateA - dateB; // Ascending order (earliest first)
  });

  return (
    <div className="space-y-4">
      {sortedDrafts.map((draft) => (
        <DraftCard 
          key={draft.id} 
          draft={draft} 
          onUpdate={onUpdate} 
          status={draft.status}
          jobs={jobsByDraftId[draft.id] || []}
        />
      ))}
    </div>
  );
}

// Scheduled Tab Component
interface ScheduledTabProps {
  scheduled: ScheduledPost[];
  loading: boolean;
  onUpdate: () => void;
  jobsByDraftId: Record<string, PostJobSummary[]>;
}

function ScheduledTab({ scheduled, loading, onUpdate, jobsByDraftId }: ScheduledTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
      </div>
    );
  }

  if (scheduled.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled posts</h3>
        <p className="mt-1 text-sm text-gray-500">Approved drafts will appear here.</p>
      </div>
    );
  }

  // Sort scheduled posts by scheduled date (earliest first), already ordered by useScheduled hook but ensure consistency
  const sortedScheduled = [...scheduled].sort((a, b) => {
    const dateA = a.scheduled_for 
      ? new Date(a.scheduled_for).getTime() 
      : (a.post_jobs?.scheduled_at ? new Date(a.post_jobs.scheduled_at).getTime() : 0);
    const dateB = b.scheduled_for 
      ? new Date(b.scheduled_for).getTime() 
      : (b.post_jobs?.scheduled_at ? new Date(b.post_jobs.scheduled_at).getTime() : 0);
    return dateA - dateB; // Ascending order (earliest first)
  });

  return (
    <div className="space-y-4">
      {sortedScheduled.map((post) => (
        <DraftCard
          key={post.id}
          draft={post}
          onUpdate={onUpdate}
          status={post.status}
          jobs={jobsByDraftId[post.id] || []}
        />
      ))}
    </div>
  );
}

// Published Tab Component
interface PublishedTabProps {
  published: PublishedPost[];
  loading: boolean;
  onUpdate: () => void;
}

function PublishedTab({ published, loading, onUpdate }: PublishedTabProps) {
  const [publishedJobsByDraftId, setPublishedJobsByDraftId] = useState<Record<string, PostJobSummary[]>>({});

  useEffect(() => {
    const loadJobs = async () => {
      const draftIds = published.map((post) => post.id).filter((id): id is string => Boolean(id));
      if (draftIds.length > 0) {
        const jobsMap = await fetchJobsByDraftId(draftIds);
        setPublishedJobsByDraftId(jobsMap);
      }
    };
    if (published.length > 0) {
      void loadJobs();
    }
  }, [published]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
      </div>
    );
  }

  if (published.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No published posts</h3>
        <p className="mt-1 text-sm text-gray-500">Published posts will appear here.</p>
      </div>
    );
  }

  // Sort published posts by scheduled date (earliest first) - chronological order by when they were scheduled
  const sortedPublished = [...published].sort((a, b) => {
    const dateA = a.scheduled_for 
      ? new Date(a.scheduled_for).getTime() 
      : (a.post_jobs?.scheduled_at ? new Date(a.post_jobs.scheduled_at).getTime() : (a.published_at ? new Date(a.published_at).getTime() : 0));
    const dateB = b.scheduled_for 
      ? new Date(b.scheduled_for).getTime() 
      : (b.post_jobs?.scheduled_at ? new Date(b.post_jobs.scheduled_at).getTime() : (b.published_at ? new Date(b.published_at).getTime() : 0));
    return dateA - dateB; // Ascending order (earliest first)
  });

  return (
    <div className="space-y-4">
      {sortedPublished.map((post) => (
        <DraftCard 
          key={post.id} 
          draft={post} 
          onUpdate={onUpdate} 
          status={post.status}
          jobs={publishedJobsByDraftId[post.id] || []}
        />
      ))}
    </div>
  );
}

// Scheduled Card Component - Currently unused
/*
function ScheduledCard({ post }: { post: ScheduledPost; onUpdate: () => void }) {
  const formatDateTime = (scheduledAt: string, timezone: string) => {
    const date = new Date(scheduledAt);
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800';
      case 'publishing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {post.assets && post.assets.length > 0 && (
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src={`/api/assets/${post.assets[0]?.storage_path || ''}`}
                alt={post.assets[0]?.title || 'Asset'}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(post.post_jobs?.status || 'pending')}`}>
                {post.post_jobs?.status || 'pending'}
              </span>
              <span className="text-sm text-gray-500 capitalize">{post.channel}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {post.post_jobs?.scheduled_at ? 
                formatDateTime(post.post_jobs.scheduled_at, post.post_jobs?.scheduled_tz || '') : 
                'Not scheduled'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-gray-900 text-sm leading-relaxed">{post.copy}</p>
        
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.map((hashtag: string, index: number) => (
              <span key={index} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                {hashtag}
              </span>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Ready for publishing</span>
          <span>{post.asset_ids.length} asset(s)</span>
        </div>
      </div>
    </div>
  );
}
*/

// Published Card Component - Currently unused
/*
function PublishedCard({ post }: { post: PublishedPost; onUpdate: () => void }) {
  const formatDateTime = (publishedAt: string) => {
    const date = new Date(publishedAt);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {post.assets && post.assets.length > 0 && (
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src={`/api/assets/${post.assets[0]?.storage_path || ''}`}
                alt={post.assets[0]?.title || 'Asset'}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                Published
              </span>
              <span className="text-sm text-gray-500 capitalize">{post.channel}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formatDateTime(post.publishes?.published_at || post.published_at || post.scheduled_for || post.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-gray-900 text-sm leading-relaxed">{post.copy}</p>
        
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.map((hashtag: string, index: number) => (
              <span key={index} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                {hashtag}
              </span>
            ))}
          </div>
        )}
        
        {post.publishes && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            {post.publishes.external_url && (
              <a 
                href={post.publishes.external_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#6366F1] hover:underline"
              >
                View Post →
              </a>
            )}
            {post.publishes.external_post_id && (
              <span>ID: {post.publishes.external_post_id}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
*/
