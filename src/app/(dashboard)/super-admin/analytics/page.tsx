'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PostsReportTab from './PostsReportTab';
import UsersLastLoginTab from './UsersLastLoginTab';
import NewUserInvitesTab from './NewUserInvitesTab';
import NotificationsSentTab from './NotificationsSentTab';

const tabs = [
  { id: 'posts-report', label: 'Posts Report' },
  { id: 'users-last-login', label: 'Users – Last Login' },
  { id: 'new-user-invites', label: 'New User Invites' },
  { id: 'notifications-sent', label: 'Notifications Sent' },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('posts-report');

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">
              Analytics
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Internal visibility into app activity
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10">
          <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-[#6366F1] text-[#6366F1]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="mx-auto max-w-7xl">
            {activeTab === 'posts-report' && <PostsReportTab />}
            {activeTab === 'users-last-login' && <UsersLastLoginTab />}
            {activeTab === 'new-user-invites' && <NewUserInvitesTab />}
            {activeTab === 'notifications-sent' && <NotificationsSentTab />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
