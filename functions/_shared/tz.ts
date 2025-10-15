/**
 * Timezone utilities for Ferdy Edge Functions
 * Handles IANA timezone to UTC conversion
 */

export interface TimezoneInfo {
  iana: string;
  offset: string;
  isDST: boolean;
}

/**
 * Convert local date/time to UTC using IANA timezone
 */
export function localToUTC(
  localDate: Date,
  ianaTimezone: string
): Date {
  try {
    // Create a date in the specified timezone
    const localTime = new Date(localDate.toLocaleString("en-US", { timeZone: ianaTimezone }));
    const utcTime = new Date(localDate.toLocaleString("en-US", { timeZone: "UTC" }));
    
    // Calculate the offset
    const offset = localTime.getTime() - utcTime.getTime();
    
    // Return UTC time
    return new Date(localDate.getTime() + offset);
  } catch (error) {
    console.error(`Invalid timezone: ${ianaTimezone}`, error);
    // Fallback to UTC
    return localDate;
  }
}

/**
 * Convert UTC date/time to local using IANA timezone
 */
export function utcToLocal(
  utcDate: Date,
  ianaTimezone: string
): Date {
  try {
    // Create a new date object in the target timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: ianaTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    
    const localString = utcDate.toLocaleString('en-CA', options);
    return new Date(localString);
  } catch (error) {
    console.error(`Invalid timezone: ${ianaTimezone}`, error);
    // Fallback to original date
    return utcDate;
  }
}

/**
 * Get timezone offset information
 */
export function getTimezoneInfo(ianaTimezone: string): TimezoneInfo {
  try {
    const now = new Date();
    const localTime = new Date(now.toLocaleString("en-US", { timeZone: ianaTimezone }));
    const utcTime = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    
    const offsetMs = localTime.getTime() - utcTime.getTime();
    const offsetHours = offsetMs / (1000 * 60 * 60);
    
    const offset = offsetHours >= 0 
      ? `+${Math.abs(offsetHours).toString().padStart(2, '0')}:00`
      : `-${Math.abs(offsetHours).toString().padStart(2, '0')}:00`;
    
    // Simple DST detection (this is basic - in production use a proper library)
    const isDST = offsetHours !== Math.floor(offsetHours);
    
    return {
      iana: ianaTimezone,
      offset,
      isDST
    };
  } catch (error) {
    console.error(`Invalid timezone: ${ianaTimezone}`, error);
    return {
      iana: ianaTimezone,
      offset: '+00:00',
      isDST: false
    };
  }
}

/**
 * Format date for database storage
 */
export function formatDateForDB(date: Date): string {
  return date.toISOString();
}

/**
 * Parse database date string
 */
export function parseDateFromDB(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Get start of month in UTC
 */
export function getMonthStartUTC(year: number, month: number, timezone: string): Date {
  const localStart = new Date(year, month - 1, 1); // month is 0-indexed
  return localToUTC(localStart, timezone);
}

/**
 * Get end of month in UTC
 */
export function getMonthEndUTC(year: number, month: number, timezone: string): Date {
  const localEnd = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
  return localToUTC(localEnd, timezone);
}
