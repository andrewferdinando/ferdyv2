/**
 * Parse a category's natural-language schedule string and produce the next
 * `count` publication dates from today.
 *
 * Handles the formats Claude returns:
 *  - "Weekly — Thursdays"
 *  - "Fortnightly — Tuesdays"
 *  - "Monthly — first Wednesday"
 *  - "Monthly — third Sunday"
 *  - "N posts in 2 weeks before [Month Day]"  (events, lead-up)
 *
 * Falls back to weekly intervals from today if the schedule can't be parsed.
 * Loose by design — at the booth, any reasonable date is better than no date.
 */

const DAYS: Record<string, number> = {
  sunday: 0,
  sundays: 0,
  monday: 1,
  mondays: 1,
  tuesday: 2,
  tuesdays: 2,
  wednesday: 3,
  wednesdays: 3,
  thursday: 4,
  thursdays: 4,
  friday: 5,
  fridays: 5,
  saturday: 6,
  saturdays: 6,
}

const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  last: 5, // special-cased below
}

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function nextWeekday(from: Date, dayOfWeek: number): Date {
  const result = startOfDay(from)
  const diff = (dayOfWeek - result.getDay() + 7) % 7
  // If today is the target day, push to next week so we don't show today as a "future post".
  result.setDate(result.getDate() + (diff === 0 ? 7 : diff))
  return result
}

function nthDayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  ordinal: number
): Date {
  if (ordinal === 5) {
    // last X of the month — find the last occurrence
    const lastDay = new Date(year, month + 1, 0) // last day of month
    const offset = (lastDay.getDay() - dayOfWeek + 7) % 7
    return new Date(year, month, lastDay.getDate() - offset)
  }
  const first = new Date(year, month, 1)
  const offset = (dayOfWeek - first.getDay() + 7) % 7
  return new Date(year, month, 1 + offset + (ordinal - 1) * 7)
}

/**
 * Parse "Month Day" or "Month Day, Year" — e.g. "Nov 15", "October 1".
 * Returns next future occurrence, rolling forward a year if needed.
 */
function parseEventAnchor(text: string, from: Date): Date | null {
  const m = text.match(/(\w+)\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i)
  if (!m) return null
  const monthIdx = MONTHS[m[1].toLowerCase()]
  const day = parseInt(m[2], 10)
  const year = m[3] ? parseInt(m[3], 10) : from.getFullYear()
  if (monthIdx === undefined || isNaN(day)) return null
  let candidate = new Date(year, monthIdx, day)
  if (candidate.getTime() < startOfDay(from).getTime()) {
    candidate = new Date(year + 1, monthIdx, day)
  }
  return candidate
}

export function nextDatesFor(
  schedule: string,
  count: number,
  from: Date = new Date()
): Date[] {
  const dates: Date[] = []
  const trimmed = schedule.trim()
  const lower = trimmed.toLowerCase()

  // Weekly / Fortnightly — DAY
  const weekly = lower.match(
    /^(weekly|fortnightly|biweekly)\s*[—\-:]\s*(\w+)/i
  )
  if (weekly) {
    const cadence = weekly[1].toLowerCase()
    const stride = cadence === 'weekly' ? 7 : 14
    const day = DAYS[weekly[2]]
    if (day !== undefined) {
      const first = nextWeekday(from, day)
      for (let i = 0; i < count; i++) {
        const d = new Date(first)
        d.setDate(d.getDate() + i * stride)
        dates.push(d)
      }
      return dates
    }
  }

  // Monthly — ORDINAL DAY
  const monthly = lower.match(
    /^monthly\s*[—\-:]\s*(first|second|third|fourth|last)\s+(\w+)/i
  )
  if (monthly) {
    const ordinal = ORDINALS[monthly[1].toLowerCase()]
    const day = DAYS[monthly[2].toLowerCase()]
    if (ordinal !== undefined && day !== undefined) {
      const cursor = new Date(from.getFullYear(), from.getMonth(), 1)
      while (dates.length < count) {
        const candidate = nthDayOfMonth(
          cursor.getFullYear(),
          cursor.getMonth(),
          day,
          ordinal
        )
        if (candidate.getTime() >= startOfDay(from).getTime()) {
          dates.push(candidate)
        }
        cursor.setMonth(cursor.getMonth() + 1)
        if (cursor.getFullYear() > from.getFullYear() + 2) break // safety
      }
      return dates
    }
  }

  // Event lead-up — "N posts in 2 weeks before [Month Day]"
  const event = lower.match(
    /(\d+)\s+posts?\s+in\s+(\d+)\s+weeks?\s+before\s+(.+)/i
  )
  if (event) {
    const numPosts = parseInt(event[1], 10)
    const numWeeks = parseInt(event[2], 10)
    const anchor = parseEventAnchor(event[3], from)
    if (anchor && numPosts > 0) {
      // Spread numPosts dates evenly across the lead-up window, ending on the anchor.
      // Take the first `count` of those.
      const totalDays = numWeeks * 7
      const intervals = numPosts > 1 ? totalDays / (numPosts - 1) : 0
      for (let i = 0; i < numPosts && dates.length < count; i++) {
        const d = new Date(anchor)
        d.setDate(d.getDate() - Math.round((numPosts - 1 - i) * intervals))
        dates.push(d)
      }
      // If caller asked for more dates than the event has, fall through to fill
      if (dates.length >= count) return dates
    }
  }

  // Daily during [date range] — just take next N consecutive days
  if (lower.startsWith('daily')) {
    const start = startOfDay(from)
    for (let i = 0; i < count; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i + 1)
      dates.push(d)
    }
    return dates
  }

  // Fallback — weekly cadence from today, filling whatever's left.
  while (dates.length < count) {
    const d = startOfDay(from)
    d.setDate(d.getDate() + (dates.length + 1) * 7)
    dates.push(d)
  }
  return dates
}

/** Format a date as "THU 8 MAY" — short, uppercase, used in eyebrow. */
export function formatDateEyebrow(d: Date): string {
  const day = d.toLocaleDateString('en-NZ', { weekday: 'short' })
  const num = d.getDate()
  const mon = d.toLocaleDateString('en-NZ', { month: 'short' })
  return `${day} ${num} ${mon}`.toUpperCase()
}
