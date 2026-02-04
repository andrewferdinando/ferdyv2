'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';

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

const CHANNEL_LABELS: Record<string, string> = {
  instagram: 'IG',
  facebook: 'FB',
  tiktok: 'TT',
  linkedin: 'LI',
  twitter: 'X',
  x: 'X',
  youtube: 'YT',
  pinterest: 'Pin',
  threads: 'Thr',
};

function getChannelLabel(channel: string): string {
  return CHANNEL_LABELS[channel.toLowerCase()] || channel.slice(0, 3).toUpperCase();
}

function getLocalDateString(utcDateStr: string): string {
  // Parse the UTC date and return YYYY-MM-DD in the user's local timezone
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

/** Returns day-of-week for the 1st of the month, 0=Mon ... 6=Sun */
function getFirstDayOffset(year: number, month: number): number {
  const d = new Date(year, month, 1);
  // JS getDay(): 0=Sun,1=Mon...6=Sat → convert to Mon-start
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

// Icons
const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        // Use scheduled_for from the draft, falling back to post_jobs.scheduled_at
        const dateSource = item.scheduled_for || item.post_jobs?.scheduled_at;
        if (!dateSource) continue; // Skip items with no date

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

    // Group by date
    const grouped: Record<string, CalendarEntry[]> = {};
    for (const entry of entries) {
      if (!grouped[entry.date]) grouped[entry.date] = [];
      grouped[entry.date].push(entry);
    }
    return grouped;
  }, [drafts, scheduled, published]);

  // Navigation
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
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

  // Previous month trailing days
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  // Build grid cells
  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

  // Trailing days from previous month
  for (let i = firstDayOffset - 1; i >= 0; i--) {
    cells.push({
      day: daysInPrevMonth - i,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      month: currentMonth,
      year: currentYear,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete the grid (fill to multiple of 7)
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      day: d,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
    });
  }

  const MAX_VISIBLE = 3;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeftIcon />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
            {getMonthLabel(currentYear, currentMonth)}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronRightIcon />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
            {(Object.keys(STATUS_CONFIG) as CalendarStatus[]).map((status) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].dot}`} />
                {STATUS_CONFIG[status].label}
              </span>
            ))}
          </div>

          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Mobile legend */}
      <div className="flex sm:hidden items-center justify-center gap-4 py-2 border-b border-gray-100 text-xs text-gray-500">
        {(Object.keys(STATUS_CONFIG) as CalendarStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].dot}`} />
            {STATUS_CONFIG[status].label}
          </span>
        ))}
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {DAY_LABELS.map((label) => (
          <div key={label} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
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
          const overflowCount = dayEntries.length - MAX_VISIBLE;

          return (
            <div
              key={idx}
              className={`min-h-[90px] sm:min-h-[110px] border-b border-r border-gray-100 p-1.5 sm:p-2 ${
                !cell.isCurrentMonth ? 'bg-gray-50/50' : ''
              } ${isToday ? 'ring-1 ring-inset ring-indigo-300 bg-indigo-50/50' : ''}`}
            >
              {/* Day number */}
              <div
                className={`text-xs font-medium mb-1 ${
                  !cell.isCurrentMonth
                    ? 'text-gray-300'
                    : isToday
                    ? 'text-indigo-600 font-semibold'
                    : 'text-gray-700'
                }`}
              >
                {cell.day}
              </div>

              {/* Post entries */}
              <div className="space-y-0.5">
                {visibleEntries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/brands/${brandId}/edit-post/${entry.id}`}
                    className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-100 transition-colors group"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[entry.calendarStatus].dot}`} />
                    <span className="text-[10px] sm:text-xs text-gray-600 group-hover:text-gray-900 truncate leading-tight">
                      <span className="font-medium">{getChannelLabel(entry.channel)}</span>
                      <span className="hidden sm:inline text-gray-400"> {truncate(entry.copy, 18)}</span>
                    </span>
                  </Link>
                ))}
                {overflowCount > 0 && (
                  <div className="text-[10px] text-gray-400 pl-1">
                    +{overflowCount} more
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
