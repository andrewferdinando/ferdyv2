'use client';

import React from 'react';

// Clock icon component
const ClockIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Frequency input types
export type FrequencyInput =
  | { kind: "daily" }
  | { kind: "weekly"; daysOfWeek: number[]; time?: string }
  | { kind: "monthly"; daysOfMonth: number[]; time?: string }
  | { kind: "offsetDate"; anchorDate: string; offsetDays: number }
  | { kind: "rangeDuring"; start: string; end: string; offsetDays?: number }
  | { kind: "oneOff"; date: string };

export interface PostContextBarProps {
  categoryName: string;
  subcategoryName?: string;
  frequency?: FrequencyInput;
  brandTimezone: string;
  scheduledFor?: string;
  eventWindow?: {
    start: string;
    end: string;
  };
  className?: string;
}

// Utility: Calculate day difference in a specific timezone
function diffDays(a: string, b: string, tz: string): number {
  const dateA = new Date(a);
  const dateB = new Date(b);
  
  // Convert to the target timezone's date strings
  const dateAStr = dateA.toLocaleDateString('en-CA', { timeZone: tz });
  const dateBStr = dateB.toLocaleDateString('en-CA', { timeZone: tz });
  
  // Parse back as dates in the timezone
  const [yearA, monthA, dayA] = dateAStr.split('-').map(Number);
  const [yearB, monthB, dayB] = dateBStr.split('-').map(Number);
  
  const dateAInTz = new Date(yearA, monthA - 1, dayA);
  const dateBInTz = new Date(yearB, monthB - 1, dayB);
  
  const diffTime = dateBInTz.getTime() - dateAInTz.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Utility: Format day list (0-6) to day names
function formatDayList(days: number[]): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days
    .sort((a, b) => a - b)
    .map(d => dayNames[d])
    .join(', ');
}

// Utility: Format date in timezone
function formatDateInTimezone(dateStr: string, tz: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    timeZone: tz,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Utility: Format time string - remove seconds and ensure proper format
function formatTimeString(timeStr: string): string {
  // Handle formats like "19:53:00" or "19:53" or "19:53:00.000" or "@ 19:53:00"
  // Remove any leading "@" or whitespace, then remove seconds
  let cleaned = timeStr.trim();
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.substring(1).trim();
  }
  const parts = cleaned.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return cleaned;
}

// Utility: Format number as ordinal (1st, 2nd, 3rd, 4th, etc.)
function formatOrdinal(num: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
}

// Main frequency formatter
function formatFrequency(
  frequency: FrequencyInput | undefined,
  brandTimezone: string,
  scheduledFor?: string,
  eventWindow?: { start: string; end: string }
): string | React.ReactNode | null {
  if (!frequency) return null;

  switch (frequency.kind) {
    case "daily":
      return "Daily";

    case "weekly": {
      let result = "Weekly";
      if (frequency.daysOfWeek && frequency.daysOfWeek.length > 0) {
        const dayList = formatDayList(frequency.daysOfWeek);
        if (frequency.time) {
          // Format time: remove seconds and replace @ with "at"
          const formattedTime = formatTimeString(frequency.time);
          result += ` (${dayList} at ${formattedTime})`;
        } else {
          result += ` (${dayList})`;
        }
      } else if (frequency.time) {
        const formattedTime = formatTimeString(frequency.time);
        result += ` at ${formattedTime}`;
      }
      return result;
    }

    case "monthly": {
      if (frequency.daysOfMonth && frequency.daysOfMonth.length > 0) {
        const sortedDays = [...frequency.daysOfMonth].sort((a, b) => a - b);
        const formattedDays = sortedDays.map(day => formatOrdinal(day));
        
        // Determine which day to highlight based on scheduledFor
        let highlightedDay: number | null = null;
        if (scheduledFor && brandTimezone) {
          try {
            const scheduledDate = new Date(scheduledFor);
            const scheduledDateStr = scheduledDate.toLocaleDateString('en-CA', { timeZone: brandTimezone });
            const dayOfMonth = parseInt(scheduledDateStr.split('-')[2], 10);
            if (sortedDays.includes(dayOfMonth)) {
              highlightedDay = dayOfMonth;
            }
          } catch (e) {
            // If date parsing fails, don't highlight
          }
        }
        
        const formattedTime = frequency.time ? formatTimeString(frequency.time) : null;
        
        // Return JSX with highlighted date
        return (
          <span>
            Monthly (
            {formattedDays.map((dayStr, index) => {
              const dayNum = sortedDays[index];
              const isHighlighted = highlightedDay === dayNum;
              return (
                <React.Fragment key={dayNum}>
                  {index > 0 && ', '}
                  <span
                    className={isHighlighted ? 'font-semibold text-[#6366F1] bg-[#EEF2FF] px-1.5 py-0.5 rounded' : ''}
                  >
                    {dayStr}
                  </span>
                </React.Fragment>
              );
            })}
            {formattedTime && ` at ${formattedTime}`}
            )
          </span>
        );
      } else if (frequency.time) {
        const formattedTime = formatTimeString(frequency.time);
        return `Monthly at ${formattedTime}`;
      }
      return "Monthly";
    }

    case "oneOff": {
      if (!frequency.date) return "Scheduled";
      return `On ${formatDateInTimezone(frequency.date, brandTimezone)}`;
    }

    case "offsetDate": {
      const { offsetDays } = frequency;
      if (offsetDays < 0) {
        return `${Math.abs(offsetDays)} ${Math.abs(offsetDays) === 1 ? 'day' : 'days'} before`;
      } else if (offsetDays > 0) {
        return `${offsetDays} ${offsetDays === 1 ? 'day' : 'days'} after`;
      } else {
        return "On the day";
      }
    }

    case "rangeDuring": {
      const { offsetDays } = frequency;
      
      // Prioritize checking scheduled date position when we have both scheduledFor and eventWindow
      if (scheduledFor && eventWindow) {
        // Convert dates to date-only strings in brand timezone for accurate comparison
        const scheduledDateStr = new Date(scheduledFor).toLocaleDateString('en-CA', { timeZone: brandTimezone });
        const startDateStr = new Date(eventWindow.start).toLocaleDateString('en-CA', { timeZone: brandTimezone });
        const endDateStr = new Date(eventWindow.end).toLocaleDateString('en-CA', { timeZone: brandTimezone });
        
        // Parse as dates for comparison (year, month, day only)
        const [sy, sm, sd] = scheduledDateStr.split('-').map(Number);
        const [sty, stm, std] = startDateStr.split('-').map(Number);
        const [edy, edm, edd] = endDateStr.split('-').map(Number);
        
        const scheduledDay = new Date(sy, sm - 1, sd);
        const startDay = new Date(sty, stm - 1, std);
        const endDay = new Date(edy, edm - 1, edd);
        
        if (scheduledDay < startDay) {
          // Before window - calculate days before
          const daysBefore = diffDays(scheduledFor, eventWindow.start, brandTimezone);
          return `${daysBefore} ${daysBefore === 1 ? 'day' : 'days'} before`;
        } else if (scheduledDay > endDay) {
          // After window - calculate days after
          const daysAfter = diffDays(eventWindow.end, scheduledFor, brandTimezone);
          return `${daysAfter} ${daysAfter === 1 ? 'day' : 'days'} after`;
        } else {
          // Inside window - calculate which day of the range this is (1-based)
          // For example, if range is Dec 20-25 and post is Dec 22, it's day 3 of 6
          const dayOfRange = diffDays(eventWindow.start, scheduledFor, brandTimezone) + 1;
          const totalDays = diffDays(eventWindow.start, eventWindow.end, brandTimezone) + 1;
          return `Day ${dayOfRange} of ${totalDays} during`;
        }
      }
      
      // Fallback: calculate from frequency start/end if available
      if (frequency.start && frequency.end) {
        const duringDays = diffDays(frequency.start, frequency.end, brandTimezone) + 1;
        return `${duringDays} ${duringDays === 1 ? 'day' : 'days'} during`;
      }
      
      // Final fallback: use offsetDays if provided (legacy support)
      if (offsetDays !== undefined && offsetDays > 0) {
        return `${offsetDays} ${offsetDays === 1 ? 'day' : 'days'} during`;
      }
      return "During";
    }

    default:
      return "Scheduled cadence";
  }
}

export default function PostContextBar({
  categoryName,
  subcategoryName,
  frequency,
  brandTimezone,
  scheduledFor,
  eventWindow,
  className = "",
}: PostContextBarProps) {
  const frequencyText = formatFrequency(frequency, brandTimezone, scheduledFor, eventWindow);

  return (
    <div
      role="contentinfo"
      className={`pt-4 border-t border-gray-200 bg-gray-50/50 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Category Pill */}
        <span
          className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full truncate max-w-[200px]"
          title={categoryName}
        >
          {categoryName || "Uncategorized"}
        </span>

        {/* Subcategory Pill */}
        {subcategoryName && (
          <span
            className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full truncate max-w-[200px]"
            title={subcategoryName}
          >
            {subcategoryName}
          </span>
        )}

        {/* Frequency Text */}
        {frequencyText && (
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <ClockIcon className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            {typeof frequencyText === 'string' ? <span>{frequencyText}</span> : frequencyText}
          </div>
        )}
      </div>
    </div>
  );
}

