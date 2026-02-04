'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { getChannelLabel } from '@/lib/channels';

// Mirror the type definitions from the schedule page
type DraftStatus = 'draft' | 'scheduled' | 'partially_published' | 'published';

interface BaseDraft {
  id: string;
  channel: string;
  copy: string;
  status: DraftStatus;
  scheduled_for?: string | null;
  post_jobs: {
    scheduled_at: string;
    scheduled_local: string;
    scheduled_tz: string;
  };
}

interface ScheduleCalendarProps {
  drafts: BaseDraft[];
  scheduled: BaseDraft[];
  published: BaseDraft[];
  brandId: string;
}

type CalendarStatus = 'draft' | 'scheduled' | 'published';

interface CalendarEntry {
  id: string;
  channel: string;
  copy: string;
  calendarStatus: CalendarStatus;
  date: string; // YYYY-MM-DD in local time
}

const STATUS_CONFIG: Record<CalendarStatus, { dot: string; label: string }> = {
  draft: { dot: 'bg-amber-400', label: 'Draft' },
  scheduled: { dot: 'bg-indigo-500', label: 'Scheduled' },
  published: { dot: 'bg-emerald-500', label: 'Published' },
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Platform colours matching DraftCard
const CHANNEL_COLORS: Record<string, string> = {
  facebook: 'bg-[#1877F2]',
  instagram_feed: 'bg-gradient-to-br from-[#833AB4] via-[#C13584] to-[#E1306C]',
  instagram_story: 'bg-gradient-to-br from-[#833AB4] via-[#C13584] to-[#E1306C]',
  linkedin_profile: 'bg-[#0A66C2]',
  tiktok: 'bg-black',
  x: 'bg-black',
};

function getLocalDateString(utcDateStr: string): string {
  const d = new Date(utcDateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 0=Mon … 6=Sun */
function getFirstDayOffset(year: number, month: number): number {
  const d = new Date(year, month, 1);
  return (d.getDay() + 6) % 7;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function truncate(text: string, maxLen: number): string {
  if (!text) return '';
  const clean = text.replace(/\n/g, ' ').trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + '…' : clean;
}

/** Encode year+month as a single comparable number */
function ym(year: number, month: number): number {
  return year * 12 + month;
}

// Icons
const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default function ScheduleCalendar({ drafts, scheduled, published, brandId }: ScheduleCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const todayStr = getTodayString();

  // Merge all posts into CalendarEntry[], grouped by date
  const entriesByDate = useMemo(() => {
    const entries: CalendarEntry[] = [];

    const addEntries = (items: BaseDraft[], calendarStatus: CalendarStatus) => {
      for (const item of items) {
        const dateSource = item.scheduled_for || item.post_jobs?.scheduled_at;
        if (!dateSource) continue;

        entries.push({
          id: item.id,
          channel: item.channel,
          copy: item.copy,
          calendarStatus,
          date: getLocalDateString(dateSource),
        });
      }
    };

    addEntries(drafts, 'draft');
    addEntries(scheduled, 'scheduled');
    addEntries(published, 'published');

    const grouped: Record<string, CalendarEntry[]> = {};
    for (const entry of entries) {
      if (!grouped[entry.date]) grouped[entry.date] = [];
      grouped[entry.date].push(entry);
    }
    return grouped;
  }, [drafts, scheduled, published]);

  // Compute navigable month range: current month + any month that has posts
  const { minYM, maxYM } = useMemo(() => {
    const todayYM = ym(today.getFullYear(), today.getMonth());
    let min = todayYM;
    let max = todayYM;
    for (const dateStr of Object.keys(entriesByDate)) {
      const [y, m] = dateStr.split('-').map(Number);
      const v = ym(y, m - 1);
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return { minYM: min, maxYM: max };
  }, [entriesByDate, today]);

  const currentYM = ym(currentYear, currentMonth);
  const canGoPrev = currentYM > minYM;
  const canGoNext = currentYM < maxYM;

  // Navigation
  const goToPrevMonth = () => {
    if (!canGoPrev) return;
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (!canGoNext) return;
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Grid calculations
  const firstDayOffset = getFirstDayOffset(currentYear, currentMonth);
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYearVal = currentMonth === 0 ? currentYear - 1 : currentYear;
  const daysInPrevMonth = getDaysInMonth(prevYearVal, prevMonthIdx);

  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

  for (let i = firstDayOffset - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, month: prevMonthIdx, year: prevYearVal, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: currentMonth, year: currentYear, isCurrentMonth: true });
  }
  const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYearVal = currentMonth === 11 ? currentYear + 1 : currentYear;
  const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, month: nextMonthIdx, year: nextYearVal, isCurrentMonth: false });
  }

  const MAX_VISIBLE = 3;
  const isCurrentMonthToday = currentMonth === today.getMonth() && currentYear === today.getFullYear();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            disabled={!canGoPrev}
            className={`p-1.5 rounded-lg transition-colors ${
              canGoPrev
                ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                : 'text-gray-200 cursor-not-allowed'
            }`}
          >
            <ChevronLeftIcon />
          </button>
          <h2 className="text-base font-semibold text-gray-900 min-w-[160px] text-center select-none">
            {getMonthLabel(currentYear, currentMonth)}
          </h2>
          <button
            onClick={goToNextMonth}
            disabled={!canGoNext}
            className={`p-1.5 rounded-lg transition-colors ${
              canGoNext
                ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                : 'text-gray-200 cursor-not-allowed'
            }`}
          >
            <ChevronRightIcon />
          </button>
        </div>

        <div className="flex items-center gap-5">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
            {(Object.keys(STATUS_CONFIG) as CalendarStatus[]).map((status) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].dot}`} />
                {STATUS_CONFIG[status].label}
              </span>
            ))}
          </div>

          {!isCurrentMonthToday && (
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Mobile legend */}
      <div className="flex sm:hidden items-center justify-center gap-4 px-5 pb-3 text-xs text-gray-500">
        {(Object.keys(STATUS_CONFIG) as CalendarStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].dot}`} />
            {STATUS_CONFIG[status].label}
          </span>
        ))}
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-t border-b border-gray-200 bg-gray-50/80">
        {DAY_LABELS.map((label) => (
          <div key={label} className="py-2.5 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const dateStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const dayEntries = entriesByDate[dateStr] || [];
          const visibleEntries = dayEntries.slice(0, MAX_VISIBLE);
          const overflowEntries = dayEntries.slice(MAX_VISIBLE);
          const overflowCount = overflowEntries.length;

          // Borders: right on all except last column, bottom on all
          const isLastCol = (idx + 1) % 7 === 0;

          return (
            <div
              key={idx}
              className={`min-h-[100px] sm:min-h-[116px] border-b ${!isLastCol ? 'border-r' : ''} border-gray-100 px-1.5 py-1.5 sm:px-2 sm:py-2 transition-colors ${
                !cell.isCurrentMonth ? 'bg-gray-50/60' : 'bg-white'
              } ${isToday ? 'ring-1 ring-inset ring-[#6366F1]/30 bg-[#EEF2FF]/40' : ''}`}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs leading-none ${
                    !cell.isCurrentMonth
                      ? 'text-gray-300'
                      : isToday
                      ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#6366F1] text-white text-[11px] font-semibold'
                      : 'text-gray-500 font-medium'
                  }`}
                >
                  {cell.day}
                </span>
              </div>

              {/* Post entries */}
              <div className="space-y-px">
                {visibleEntries.map((entry) => {
                  const channelColor = CHANNEL_COLORS[entry.channel] || 'bg-gray-400';
                  return (
                    <Link
                      key={entry.id}
                      href={`/brands/${brandId}/edit-post/${entry.id}`}
                      className="flex items-center gap-1.5 px-1 py-[3px] rounded-md hover:bg-gray-100 transition-colors group"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[entry.calendarStatus].dot}`} />
                      <span className={`w-3 h-3 rounded-[3px] flex-shrink-0 ${channelColor}`} />
                      <span className="text-[11px] text-gray-600 group-hover:text-gray-900 truncate leading-tight">
                        {truncate(entry.copy || getChannelLabel(entry.channel), 22)}
                      </span>
                    </Link>
                  );
                })}
                {overflowCount > 0 && (
                  <div className="relative group/overflow">
                    <button
                      type="button"
                      className="text-[11px] font-medium text-gray-400 hover:text-[#6366F1] pl-1 transition-colors cursor-default"
                    >
                      +{overflowCount} more
                    </button>
                    {/* Hover popover */}
                    <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover/overflow:block">
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 min-w-[220px]">
                        {overflowEntries.map((entry) => {
                          const channelColor = CHANNEL_COLORS[entry.channel] || 'bg-gray-400';
                          return (
                            <Link
                              key={entry.id}
                              href={`/brands/${brandId}/edit-post/${entry.id}`}
                              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[entry.calendarStatus].dot}`} />
                              <span className={`w-3.5 h-3.5 rounded-[3px] flex-shrink-0 ${channelColor}`} />
                              <span className="text-xs text-gray-700 truncate">
                                {getChannelLabel(entry.channel)}
                                <span className="text-gray-400"> &middot; {truncate(entry.copy, 24)}</span>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
