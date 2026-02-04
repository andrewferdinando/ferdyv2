'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import DraftCard from '@/components/schedule/DraftCard';
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar';
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
  scheduled_for?: string; // UTC timestamp from drafts table
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
  
  const [view, setView] = useState<'list' | 'calendar'>('list');

  // Update activeTab when URL query parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['drafts', 'scheduled', 'published'].includes(tabParam)) {
      setActiveTab(tabParam);
      setView('list');
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
            <div className="flex items-end justify-between mt-6">
              <div className="flex flex-wrap gap-4 sm:gap-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setView('list'); }}
                    className={`pb-3 border-b-2 font-medium transition-all duration-200 text-sm ${
                      view === 'list' && activeTab === tab.id
                        ? 'border-[#6366F1] text-[#6366F1]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.name}
                    {tab.count !== undefined && (
                      <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        view === 'list' && activeTab === tab.id
                          ? 'bg-[#6366F1] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setView('calendar')}
                className={`pb-3 border-b-2 font-medium transition-all duration-200 text-sm flex items-center gap-1.5 ${
                  view === 'calendar'
                    ? 'border-[#6366F1] text-[#6366F1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Calendar
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-4 sm:px-6 lg:px-10 py-6">
            {view === 'calendar' ? (
              <ScheduleCalendar
                drafts={drafts}
                scheduled={scheduled}
                published={published}
                brandId={brandId}
              />
            ) : (
              renderTabContent()
            )}
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

  // Sort drafts by scheduled date (earliest first), fallback to created_at if no scheduled_at
  const sortedDrafts = [...drafts].sort((a, b) => {
    // Use scheduled_for from draft (which comes from drafts table), not post_jobs
    const dateA = a.scheduled_for 
      ? new Date(a.scheduled_for).getTime() 
      : new Date(a.created_at).getTime();
    const dateB = b.scheduled_for 
      ? new Date(b.scheduled_for).getTime() 
      : new Date(b.created_at).getTime();
    return dateA - dateB; // Ascending order (earliest first)
  });

  return (
    <div className="space-y-4">
      {sortedDrafts.map((draft) => {
        const draftJobs = jobsByDraftId[draft.id] || [];
        
        return (
          <DraftCard 
            key={draft.id} 
            draft={draft} 
            onUpdate={onUpdate} 
            status={draft.status}
            jobs={draftJobs}
          />
        );
      })}
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
    const dateA = a.post_jobs?.scheduled_at 
      ? new Date(a.post_jobs.scheduled_at).getTime() 
      : new Date(a.created_at).getTime();
    const dateB = b.post_jobs?.scheduled_at 
      ? new Date(b.post_jobs.scheduled_at).getTime() 
      : new Date(b.created_at).getTime();
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

  // Sort published posts by published_at descending (most recently published first)
  const sortedPublished = [...published].sort((a, b) => {
    const aTime = a.publishes?.published_at || a.published_at || a.scheduled_for || a.created_at;
    const bTime = b.publishes?.published_at || b.published_at || b.scheduled_for || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime(); // Descending order (most recent first)
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
