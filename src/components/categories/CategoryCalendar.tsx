'use client'

import React, { useMemo, useState } from 'react'

// ---------- Types ----------
interface ScheduleRule {
  id: string
  subcategory_id: string
  frequency: string
  days_of_week: number[]
  day_of_month: number | number[]
  nth_week: number
  weekday: number
  start_date?: string | null
  end_date?: string | null
  days_before?: number[] | null
  days_during?: number[] | null
  is_active: boolean
  subcategories: {
    name: string
    subcategory_type?: string
    [key: string]: any
  } | null
}

interface CategoryCalendarProps {
  rules: ScheduleRule[]
}

// ---------- Helpers (same as ScheduleCalendar) ----------
function getFirstDayOffset(year: number, month: number): number {
  const d = new Date(year, month, 1)
  return (d.getDay() + 6) % 7  // 0=Mon … 6=Sun
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

// ---------- Color palette ----------
const COLORS = [
  { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  { bg: 'bg-amber-100', text: 'text-amber-800' },
  { bg: 'bg-rose-100', text: 'text-rose-800' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  { bg: 'bg-violet-100', text: 'text-violet-800' },
  { bg: 'bg-orange-100', text: 'text-orange-800' },
  { bg: 'bg-teal-100', text: 'text-teal-800' },
  { bg: 'bg-pink-100', text: 'text-pink-800' },
  { bg: 'bg-lime-100', text: 'text-lime-800' },
]

// ---------- Icons ----------
const ChevronLeftIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRightIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str
}

// ---------- Date computation ----------

interface DayEntry {
  name: string
  colorIdx: number
}

function computeCalendarEntries(
  rules: ScheduleRule[],
  year: number,
  month: number,
  colorMap: Map<string, number>
): Map<number, DayEntry[]> {
  const result = new Map<number, DayEntry[]>()
  const daysInMonth = getDaysInMonth(year, month)

  for (const rule of rules) {
    if (!rule.is_active) continue
    const name = rule.subcategories?.name || 'Unnamed'
    const colorIdx = colorMap.get(rule.subcategory_id) ?? 0

    const addEntry = (day: number) => {
      if (day < 1 || day > daysInMonth) return
      if (!result.has(day)) result.set(day, [])
      const entries = result.get(day)!
      // Avoid duplicate category names on same day
      if (!entries.some(e => e.name === name)) {
        entries.push({ name, colorIdx })
      }
    }

    switch (rule.frequency) {
      case 'daily': {
        for (let d = 1; d <= daysInMonth; d++) addEntry(d)
        break
      }

      case 'weekly': {
        if (!rule.days_of_week?.length) break
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month, d)
          const jsDay = date.getDay()
          const isoDow = jsDay === 0 ? 7 : jsDay
          if (rule.days_of_week.includes(isoDow)) addEntry(d)
        }
        break
      }

      case 'monthly': {
        if (rule.nth_week && rule.weekday) {
          // Nth weekday of month (e.g. 2nd Tuesday)
          const targetIsoDow = rule.weekday
          let count = 0
          for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d)
            const jsDay = date.getDay()
            const isoDow = jsDay === 0 ? 7 : jsDay
            if (isoDow === targetIsoDow) {
              count++
              if (count === rule.nth_week) {
                addEntry(d)
                break
              }
            }
          }
        } else if (Array.isArray(rule.day_of_month) && rule.day_of_month.length) {
          for (const dom of rule.day_of_month) {
            addEntry(dom)
          }
        } else if (typeof rule.day_of_month === 'number') {
          addEntry(rule.day_of_month)
        }
        break
      }

      case 'specific': {
        if (!rule.start_date) break
        const startDate = new Date(rule.start_date.includes('T') ? rule.start_date : rule.start_date + 'T00:00:00Z')
        const endDate = rule.end_date
          ? new Date(rule.end_date.includes('T') ? rule.end_date : rule.end_date + 'T00:00:00Z')
          : startDate

        // days_before: offset days before the start_date
        if (rule.days_before?.length) {
          for (const offset of rule.days_before) {
            const d = new Date(startDate)
            d.setUTCDate(d.getUTCDate() - offset)
            if (d.getUTCFullYear() === year && d.getUTCMonth() === month) {
              addEntry(d.getUTCDate())
            }
          }
        }

        // days_during: day-of-month numbers within the date range
        if (rule.days_during?.length) {
          // Iterate each month in the range
          const cursor = new Date(startDate)
          cursor.setUTCDate(1) // start of month
          const rangeEnd = new Date(endDate)

          while (cursor <= rangeEnd) {
            const curYear = cursor.getUTCFullYear()
            const curMonth = cursor.getUTCMonth()
            if (curYear === year && curMonth === month) {
              const dim = getDaysInMonth(curYear, curMonth)
              for (const dom of rule.days_during) {
                if (dom <= dim) {
                  // Check the date is within the actual start_date...end_date range
                  const checkDate = new Date(Date.UTC(curYear, curMonth, dom))
                  if (checkDate >= startDate && checkDate <= endDate) {
                    addEntry(dom)
                  }
                }
              }
            }
            // Advance to next month
            cursor.setUTCMonth(cursor.getUTCMonth() + 1)
          }
        }

        // If no days_before and no days_during, just mark the start date (and end if range)
        if (!rule.days_before?.length && !rule.days_during?.length) {
          const cursor = new Date(startDate)
          while (cursor <= endDate) {
            if (cursor.getUTCFullYear() === year && cursor.getUTCMonth() === month) {
              addEntry(cursor.getUTCDate())
            }
            cursor.setUTCDate(cursor.getUTCDate() + 1)
          }
        }
        break
      }
    }
  }

  return result
}

// ---------- Component ----------

export default function CategoryCalendar({ rules }: CategoryCalendarProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear()

  const isCurrentMonth =
    currentMonth === today.getMonth() && currentYear === today.getFullYear()

  // Stable color assignment by sorted subcategory_id
  const colorMap = useMemo(() => {
    const uniqueIds = [...new Set(rules.map(r => r.subcategory_id))].sort()
    const map = new Map<string, number>()
    uniqueIds.forEach((id, i) => map.set(id, i % COLORS.length))
    return map
  }, [rules])

  // Compute which days have which categories
  const dayEntries = useMemo(
    () => computeCalendarEntries(rules, currentYear, currentMonth, colorMap),
    [rules, currentYear, currentMonth, colorMap]
  )

  // Navigation
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  // Build grid cells
  const offset = getFirstDayOffset(currentYear, currentMonth)
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const prevMonthDays = currentMonth === 0
    ? getDaysInMonth(currentYear - 1, 11)
    : getDaysInMonth(currentYear, currentMonth - 1)

  const cells: { day: number; isCurrent: boolean }[] = []

  // Previous month filler
  for (let i = 0; i < offset; i++) {
    cells.push({ day: prevMonthDays - offset + 1 + i, isCurrent: false })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrent: true })
  }
  // Next month filler
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, isCurrent: false })
    }
  }

  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const MAX_VISIBLE = 3

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
          </button>
          <h3 className="text-base font-semibold text-gray-900 ml-2">
            {getMonthLabel(currentYear, currentMonth)}
          </h3>
        </div>
        {!isCurrentMonth && (
          <button
            onClick={goToToday}
            className="text-sm text-[#6366F1] hover:text-[#4F46E5] font-medium transition-colors"
          >
            Today
          </button>
        )}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {dayHeaders.map((dh) => (
          <div
            key={dh}
            className="text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider py-2"
          >
            {dh}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const col = idx % 7
          const entries = cell.isCurrent ? (dayEntries.get(cell.day) || []) : []
          const visible = entries.slice(0, MAX_VISIBLE)
          const overflow = entries.slice(MAX_VISIBLE)
          const todayCell = cell.isCurrent && isToday(cell.day)

          return (
            <div
              key={idx}
              className={[
                'min-h-[90px] sm:min-h-[100px] px-1.5 py-1.5 sm:px-2 sm:py-2 border-b border-gray-100',
                col < 6 ? 'border-r border-gray-100' : '',
                cell.isCurrent ? 'bg-white' : 'bg-gray-50/60',
                todayCell ? 'ring-1 ring-inset ring-[#6366F1]/30 bg-[#EEF2FF]/40' : '',
              ].join(' ')}
            >
              {/* Day number */}
              <div className="mb-1">
                {todayCell ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#6366F1] text-white text-[11px] font-semibold">
                    {cell.day}
                  </span>
                ) : (
                  <span className={`text-[12px] font-medium ${cell.isCurrent ? 'text-gray-700' : 'text-gray-400'}`}>
                    {cell.day}
                  </span>
                )}
              </div>

              {/* Category pills */}
              <div className="space-y-0.5">
                {visible.map((entry, i) => {
                  const color = COLORS[entry.colorIdx]
                  return (
                    <div
                      key={i}
                      className={`${color.bg} ${color.text} text-[10px] sm:text-[11px] font-medium rounded px-1 py-0.5 truncate leading-tight`}
                      title={entry.name}
                    >
                      {truncate(entry.name, 18)}
                    </div>
                  )
                })}

                {/* Overflow */}
                {overflow.length > 0 && (
                  <div className="relative group/overflow">
                    <button
                      type="button"
                      className="text-[11px] font-medium text-gray-400 hover:text-[#6366F1] pl-0.5 transition-colors cursor-default"
                    >
                      +{overflow.length} more
                    </button>
                    <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover/overflow:block">
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 min-w-[180px]">
                        {overflow.map((entry, i) => {
                          const color = COLORS[entry.colorIdx]
                          return (
                            <div
                              key={i}
                              className={`${color.bg} ${color.text} text-[11px] font-medium rounded px-1.5 py-0.5 mb-0.5 last:mb-0 truncate`}
                              title={entry.name}
                            >
                              {entry.name}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
