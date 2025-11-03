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

// Main frequency formatter
function formatFrequency(
  frequency: FrequencyInput | undefined,
  brandTimezone: string,
  scheduledFor?: string,
  eventWindow?: { start: string; end: string }
): string | null {
  if (!frequency) return null;

  switch (frequency.kind) {
    case "daily":
      return "Daily";

    case "weekly": {
      let result = "Weekly";
      if (frequency.daysOfWeek && frequency.daysOfWeek.length > 0) {
        const dayList = formatDayList(frequency.daysOfWeek);
        if (frequency.time) {
          result += ` (${dayList} @ ${frequency.time})`;
        } else {
          result += ` (${dayList})`;
        }
      } else if (frequency.time) {
        result += ` @ ${frequency.time}`;
      }
      return result;
    }

    case "monthly": {
      let result = "Monthly";
      if (frequency.daysOfMonth && frequency.daysOfMonth.length > 0) {
        const daysStr = frequency.daysOfMonth.sort((a, b) => a - b).join(", ");
        if (frequency.time) {
          result += ` (${daysStr} @ ${frequency.time})`;
        } else {
          result += ` (${daysStr})`;
        }
      } else if (frequency.time) {
        result += ` @ ${frequency.time}`;
      }
      return result;
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
      if (offsetDays !== undefined && offsetDays > 0) {
        return `${offsetDays} ${offsetDays === 1 ? 'day' : 'days'} during`;
      }
      
      // If scheduledFor and eventWindow are provided, check position
      if (scheduledFor && eventWindow) {
        const scheduledDate = new Date(scheduledFor);
        const startDate = new Date(eventWindow.start);
        const endDate = new Date(eventWindow.end);
        
        if (scheduledDate >= startDate && scheduledDate <= endDate) {
          // Inside window - use "During" or offsetDays if provided
          if (offsetDays !== undefined && offsetDays > 0) {
            return `${offsetDays} ${offsetDays === 1 ? 'day' : 'days'} during`;
          }
          return "During";
        } else if (scheduledDate < startDate) {
          // Before window
          const daysBefore = diffDays(scheduledFor, eventWindow.start, brandTimezone);
          return `${daysBefore} ${daysBefore === 1 ? 'day' : 'days'} before`;
        } else {
          // After window
          const daysAfter = diffDays(eventWindow.end, scheduledFor, brandTimezone);
          return `${daysAfter} ${daysAfter === 1 ? 'day' : 'days'} after`;
        }
      }
      
      // Default fallback
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
      className={`mt-4 pt-3 border-t border-gray-200 bg-gray-50/50 ${className}`}
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
            <span>{frequencyText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

