/**
 * Timezone utilities for converting between UTC and brand local time
 * Uses IANA timezone identifiers (e.g., 'Pacific/Auckland', 'Australia/Sydney')
 */

/**
 * Convert a UTC Date object to a local date string in the specified timezone
 * Returns format: "YYYY-MM-DD"
 */
export function utcToLocalDate(utcDate: Date | string, timezone: string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  
  // Use Intl.DateTimeFormat to convert UTC to local timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  
  return formatter.format(date)
}

/**
 * Convert a UTC Date object to a local time string in the specified timezone
 * Returns format: "HH:mm"
 */
export function utcToLocalTime(utcDate: Date | string, timezone: string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  
  return formatter.format(date)
}

/**
 * Convert local date and time (in brand timezone) to UTC Date object
 * @param dateStr Date string in format "YYYY-MM-DD"
 * @param timeStr Time string in format "HH:mm"
 * @param timezone IANA timezone identifier
 * @returns Date object in UTC
 * 
 * This function uses an iterative approach to find the correct UTC time
 * that corresponds to the given local time in the specified timezone.
 * This correctly handles DST transitions.
 */
export function localToUtc(dateStr: string, timeStr: string, timezone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [targetHour, targetMinute] = timeStr.split(':').map(Number)
  
  // Start with an approximate UTC date (assume no offset initially)
  let utcDate = new Date(Date.UTC(year, month - 1, day, targetHour, targetMinute, 0))
  
  // Iterate to find the correct UTC time that produces the desired local time
  // This handles DST correctly by checking the actual result in the timezone
  for (let i = 0; i < 5; i++) { // Max 5 iterations should be enough
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    
    const parts = formatter.formatToParts(utcDate)
    const tzYear = parseInt(parts.find(p => p.type === 'year')!.value)
    const tzMonth = parseInt(parts.find(p => p.type === 'month')!.value) - 1
    const tzDay = parseInt(parts.find(p => p.type === 'day')!.value)
    const tzHour = parseInt(parts.find(p => p.type === 'hour')!.value)
    const tzMinute = parseInt(parts.find(p => p.type === 'minute')!.value)
    
    // Check if we've found the correct time
    if (tzYear === year && tzMonth === month - 1 && tzDay === day && 
        tzHour === targetHour && tzMinute === targetMinute) {
      return utcDate
    }
    
    // Calculate the difference and adjust
    const hourDiff = targetHour - tzHour
    const minDiff = targetMinute - tzMinute
    const dayDiff = day - tzDay
    const totalMinutesAdjustment = (hourDiff * 60 + minDiff) + (dayDiff * 24 * 60)
    
    utcDate = new Date(utcDate.getTime() + totalMinutesAdjustment * 60000)
  }
  
  return utcDate
}

/**
 * Format a UTC date/time string to display in local timezone
 * Returns format like "Oct 8, 2024 at 2:30 PM"
 */
export function formatDateTimeLocal(utcDate: Date | string, timezone: string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

/**
 * Get all IANA timezones grouped by country/region
 * Returns a map of country codes to timezone arrays
 */
export function getTimezonesByCountry(): Record<string, string[]> {
  // Common timezones by country code
  return {
    'NZ': ['Pacific/Auckland'],
    'AU': ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth', 'Australia/Adelaide', 'Australia/Darwin', 'Australia/Hobart'],
    'US': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu'],
    'GB': ['Europe/London'],
    'CA': ['America/Toronto', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax'],
    'JP': ['Asia/Tokyo'],
    'CN': ['Asia/Shanghai'],
    'IN': ['Asia/Kolkata'],
    'DE': ['Europe/Berlin'],
    'FR': ['Europe/Paris'],
    'BR': ['America/Sao_Paulo'],
    'MX': ['America/Mexico_City'],
    'ZA': ['Africa/Johannesburg'],
    'SG': ['Asia/Singapore'],
    'HK': ['Asia/Hong_Kong'],
  }
}

/**
 * Get a list of all common IANA timezones
 */
export function getAllTimezones(): string[] {
  const byCountry = getTimezonesByCountry()
  return Object.values(byCountry).flat()
}
