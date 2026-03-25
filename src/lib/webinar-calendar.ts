/**
 * Shared calendar utilities for webinar pages and emails.
 * Used by both the client-side landing page and server-side email templates.
 */

export interface CalendarEventInput {
  name: string
  datetime: string // ISO 8601
  duration_minutes: number
  zoom_url: string
  slug: string
}

function fmtIcal(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const start = new Date(event.datetime)
  const end = new Date(start.getTime() + event.duration_minutes * 60 * 1000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates: `${fmtIcal(start)}/${fmtIcal(end)}`,
    details: 'Free training session. Details will be emailed to you.',
    location: event.zoom_url,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function buildIcsString(event: CalendarEventInput): string {
  const start = new Date(event.datetime)
  const end = new Date(start.getTime() + event.duration_minutes * 60 * 1000)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ferdy//Webinar//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmtIcal(start)}`,
    `DTEND:${fmtIcal(end)}`,
    `SUMMARY:${event.name}`,
    `DESCRIPTION:Free training session. Details will be emailed to you.`,
    `LOCATION:${event.zoom_url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
