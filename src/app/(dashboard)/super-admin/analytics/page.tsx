'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useSystemHealth } from './useSystemHealth';
import HealthBanner from './HealthBanner';
import PublishingSection from './PublishingSection';
import DraftGenerationSection from './DraftGenerationSection';
import SocialHealthSection from './SocialHealthSection';

function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AnalyticsPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const health = useSystemHealth(selectedDate);
  const isToday = isSameDay(selectedDate, new Date());

  function goToPrevDay() {
    setSelectedDate((d) => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      return prev;
    });
  }

  function goToNextDay() {
    if (isToday) return;
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }

  function goToToday() {
    setSelectedDate(new Date());
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">
                System Health
              </h1>
            </div>

            {/* Date navigator */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevDay}
                className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 transition-colors"
                aria-label="Previous day"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="min-w-[160px] text-center text-sm font-medium text-gray-700">
                {formatDisplayDate(selectedDate)}
              </span>
              <button
                onClick={goToNextDay}
                disabled={isToday}
                className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next day"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="ml-1 rounded-lg border border-[#6366F1] bg-white px-3 py-2 text-sm font-medium text-[#6366F1] hover:bg-[#EEF2FF] transition-colors"
                >
                  Today
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="mx-auto max-w-5xl space-y-8">
            {health.error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {health.error}
              </div>
            )}

            {health.loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-sm text-gray-500">Loading health data...</div>
              </div>
            ) : (
              <>
                {/* Overall banner */}
                <HealthBanner overall={health.overall} overallMessage={health.overallMessage} />

                {/* Publishing Pipeline */}
                <PublishingSection
                  dueToday={health.publishing.dueToday}
                  published={health.publishing.published}
                  failed={health.publishing.failed}
                  pending={health.publishing.pending}
                  overdue={health.publishing.overdue}
                  successRate={health.publishing.successRate}
                  failedJobs={health.publishing.failedJobs}
                  lastCronRun={health.publishing.lastCronRun}
                />

                {/* Draft Generation */}
                <DraftGenerationSection
                  activeRules={health.drafts.activeRules}
                  createdToday={health.drafts.createdToday}
                  unapprovedUpcoming={health.drafts.unapprovedUpcoming}
                  brandsWithoutDrafts={health.drafts.brandsWithoutDrafts}
                />

                {/* Social Connections */}
                <SocialHealthSection
                  connected={health.social.connected}
                  disconnected={health.social.disconnected}
                  expiringSoon={health.social.expiringSoon}
                  disconnectedAccounts={health.social.disconnectedAccounts}
                  expiringAccounts={health.social.expiringAccounts}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
