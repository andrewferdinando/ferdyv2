import { render } from '@react-email/render'
import { Resend } from 'resend'
import { WebinarConfirmation } from '@/emails/WebinarConfirmation'
import { WebinarReminder, reminderContent } from '@/emails/WebinarReminder'
import { buildGoogleCalendarUrl, buildIcsString, CalendarEventInput } from '@/lib/webinar-calendar'

let resendInstance: Resend | null = null

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables')
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return resendInstance
}

function getFromEmail(): string {
  return (
    process.env.RESEND_WEBINAR_FROM_EMAIL || 'Ferdy <support@ferdy.io>'
  )
}

function buildIcsAttachment(event: CalendarEventInput) {
  return {
    filename: `${event.slug}.ics`,
    content: Buffer.from(buildIcsString(event)).toString('base64'),
    contentType: 'text/calendar' as const,
  }
}

// --- Shared data shape for all webinar emails ---

export interface WebinarEmailData {
  to: string
  firstName: string
  webinarName: string
  webinarDate: string
  webinarSlug: string
  // Calendar fields
  datetime: string
  duration_minutes: number
  zoom_url: string
}

function toCalendarEvent(data: WebinarEmailData): CalendarEventInput {
  return {
    name: data.webinarName,
    datetime: data.datetime,
    duration_minutes: data.duration_minutes,
    zoom_url: data.zoom_url,
    slug: data.webinarSlug,
  }
}

// --- Confirmation (sent immediately on registration) ---

export async function sendWebinarConfirmation(data: WebinarEmailData) {
  const resend = getResend()
  const event = toCalendarEvent(data)
  const googleUrl = buildGoogleCalendarUrl(event)

  const html = await render(
    WebinarConfirmation({
      firstName: data.firstName,
      webinarName: data.webinarName,
      webinarDate: data.webinarDate,
      googleCalendarUrl: googleUrl,
    })
  )

  return resend.emails.send({
    from: getFromEmail(),
    to: data.to,
    subject: "You're in! Add it to your calendar",
    html,
    attachments: [buildIcsAttachment(event)],
    tags: [
      { name: 'category', value: 'webinar' },
      { name: 'webinar_slug', value: data.webinarSlug },
      { name: 'email_type', value: 'confirmation' },
    ],
  })
}

// --- Pre-webinar reminders ---

type ReminderType = '2day' | '1day' | '1hour'

export async function sendWebinarReminder(
  data: WebinarEmailData,
  reminderType: ReminderType
) {
  const resend = getResend()
  const event = toCalendarEvent(data)
  const googleUrl = buildGoogleCalendarUrl(event)
  const content = reminderContent[reminderType]

  const html = await render(
    WebinarReminder({
      firstName: data.firstName,
      webinarName: data.webinarName,
      webinarDate: data.webinarDate,
      googleCalendarUrl: googleUrl,
      zoomUrl: data.zoom_url,
      reminderType,
    })
  )

  // Attach .ics for the 2-day reminder (calendar-focused)
  // For 1-day and 1-hour, the CTA is the join link instead
  const attachments = reminderType === '2day' ? [buildIcsAttachment(event)] : []

  return resend.emails.send({
    from: getFromEmail(),
    to: data.to,
    subject: content.subject,
    html,
    attachments,
    tags: [
      { name: 'category', value: 'webinar' },
      { name: 'webinar_slug', value: data.webinarSlug },
      { name: 'email_type', value: `reminder_${reminderType}` },
    ],
  })
}

// --- Post-webinar follow-up (stubs - add implementations when ready) ---
//
// sendWebinarReplay(data)         - day 0
// sendWebinarFollowUp1(data)      - day 1
// sendWebinarFollowUp3(data)      - day 3
// sendWebinarFollowUp5(data)      - day 5
// sendWebinarFollowUp7(data)      - day 7
//
// Each should accept WebinarEmailData and use the same tagging pattern.
