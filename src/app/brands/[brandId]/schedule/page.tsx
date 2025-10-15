'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import NewPostModal from '@/components/schedule/NewPostModal';
import DraftCard from '@/components/schedule/DraftCard';
import { useDrafts } from '@/hooks/useDrafts';
import { useScheduled } from '@/hooks/useScheduled';
import { usePublished } from '@/hooks/usePublished';

// Type definitions
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
  post_jobs: {
    id: string;
    scheduled_at: string;
    scheduled_local: string;
    scheduled_tz: string;
    status: string;
    target_month: string;
  };
  assets?: {
    id: string;
    title: string;
    storage_path: string;
    aspect_ratio: string;
  }[];
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
  post_jobs: {
    id: string;
    scheduled_at: string;
    scheduled_local: string;
    scheduled_tz: string;
    status: string;
    target_month: string;
  };
  assets?: {
    id: string;
    title: string;
    storage_path: string;
    aspect_ratio: string;
  }[];
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
  };
  assets?: {
    id: string;
    title: string;
    storage_path: string;
    aspect_ratio: string;
  }[];
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
  const brandId = params.brandId as string;
  
  const [activeTab, setActiveTab] = useState('drafts');
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);

  // Fetch data for all tabs
  const { drafts, loading: draftsLoading, refetch: refetchDrafts } = useDrafts(brandId, 'pending,generated,ready');
  const { scheduled, loading: scheduledLoading, refetch: refetchScheduled } = useScheduled(brandId);
  const { published, loading: publishedLoading, refetch: refetchPublished } = usePublished(brandId);

  const tabs: Tab[] = [
    { id: 'drafts', name: 'Drafts', count: drafts.length },
    { id: 'scheduled', name: 'Scheduled', count: scheduled.length },
    { id: 'published', name: 'Published', count: published.length }
  ];

  const handleNewPostSuccess = () => {
    refetchDrafts();
    refetchScheduled();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'drafts':
        return (
          <DraftsTab 
            drafts={drafts} 
            loading={draftsLoading} 
            onUpdate={refetchDrafts}
          />
        );
      case 'scheduled':
        return (
          <ScheduledTab 
            scheduled={scheduled} 
            loading={scheduledLoading} 
            onUpdate={refetchScheduled}
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
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
            <p className="text-gray-600 mt-1">Manage your scheduled posts and drafts</p>
          </div>
          
          <button
            onClick={() => setIsNewPostModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all font-medium"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            New Post
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#6366F1] text-[#6366F1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {renderTabContent()}
        </div>
      </div>

      {/* New Post Modal */}
      <NewPostModal
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
        brandId={brandId}
        onSuccess={handleNewPostSuccess}
      />
    </AppLayout>
  );
}

// Drafts Tab Component
interface DraftsTabProps {
  drafts: Draft[];
  loading: boolean;
  onUpdate: () => void;
}

function DraftsTab({ drafts, loading, onUpdate }: DraftsTabProps) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {drafts.map((draft) => (
        <DraftCard key={draft.id} draft={draft} onUpdate={onUpdate} />
      ))}
    </div>
  );
}

// Scheduled Tab Component
interface ScheduledTabProps {
  scheduled: ScheduledPost[];
  loading: boolean;
  onUpdate: () => void;
}

function ScheduledTab({ scheduled, loading, onUpdate }: ScheduledTabProps) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {scheduled.map((post) => (
        <ScheduledCard key={post.id} post={post} onUpdate={onUpdate} />
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {published.map((post) => (
        <PublishedCard key={post.id} post={post} onUpdate={onUpdate} />
      ))}
    </div>
  );
}

// Scheduled Card Component (read-only version of DraftCard)
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
                src={`/api/assets/${post.assets[0].storage_path}`} 
                alt={post.assets[0].title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(post.post_jobs.status)}`}>
                {post.post_jobs.status}
              </span>
              <span className="text-sm text-gray-500 capitalize">{post.channel}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formatDateTime(post.post_jobs.scheduled_at, post.post_jobs.scheduled_tz)}
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

// Published Card Component
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
                src={`/api/assets/${post.assets[0].storage_path}`} 
                alt={post.assets[0].title}
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
              {formatDateTime(post.publishes.published_at)}
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
          <a 
            href={post.publishes.external_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#6366F1] hover:underline"
          >
            View Post →
          </a>
          <span>ID: {post.publishes.external_post_id}</span>
        </div>
      </div>
    </div>
  );
}
