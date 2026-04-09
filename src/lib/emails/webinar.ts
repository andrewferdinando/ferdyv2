import { render } from '@react-email/render'
import { Resend } from 'resend'
import { WebinarConfirmation } from '@/emails/WebinarConfirmation'
import { WebinarAdminNotification } from '@/emails/WebinarAdminNotification'
import { WebinarReminder, reminderContent } from '@/emails/WebinarReminder'
import { WebinarReplay } from '@/emails/WebinarReplay'
import { WebinarFollowUp1 } from '@/emails/WebinarFollowUp1'
import { WebinarFollowUp2 } from '@/emails/WebinarFollowUp2'
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

// --- Admin notification (sent to site owner on every registration) ---

const ADMIN_EMAIL = 'andrew@ferdy.io'

export interface WebinarAdminNotificationData {
  firstName: string
  email: string
  webinarName: string
  webinarSlug: string
  niche: string
  location: string
}

export async function sendWebinarAdminNotification(data: WebinarAdminNotificationData) {
  const resend = getResend()

  const html = await render(
    WebinarAdminNotification({
      firstName: data.firstName,
      email: data.email,
      webinarName: data.webinarName,
      webinarSlug: data.webinarSlug,
      niche: data.niche,
      location: data.location,
    })
  )

  return resend.emails.send({
    from: getFromEmail(),
    to: ADMIN_EMAIL,
    subject: `New registration: ${data.firstName} for ${data.webinarName}`,
    html,
    tags: [
      { name: 'category', value: 'webinar' },
      { name: 'webinar_slug', value: data.webinarSlug },
      { name: 'email_type', value: 'admin_notification' },
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

// --- Post-webinar follow-up emails ---

export interface WebinarFollowUpData {
  to: string
  firstName: string
  webinarName: string
  webinarSlug: string
  recordingUrl: string
  bookingUrl: string
}

export async function sendWebinarReplay(data: WebinarFollowUpData) {
  const resend = getResend()

  const html = await render(
    WebinarReplay({
      firstName: data.firstName,
      webinarName: data.webinarName,
      recordingUrl: data.recordingUrl,
      bookingUrl: data.bookingUrl,
    })
  )

  return resend.emails.send({
    from: getFromEmail(),
    to: data.to,
    subject: "Here's the recording + a special offer",
    html,
    tags: [
      { name: 'category', value: 'webinar' },
      { name: 'webinar_slug', value: data.webinarSlug },
      { name: 'email_type', value: 'followup_replay' },
    ],
  })
}

export async function sendWebinarFollowUp1(data: WebinarFollowUpData) {
  const resend = getResend()

  const html = await render(
    WebinarFollowUp1({
      firstName: data.firstName,
      bookingUrl: data.bookingUrl,
    })
  )

  return resend.emails.send({
    from: getFromEmail(),
    to: data.to,
    subject: 'Quick reminder — your onboarding offer expires Friday',
    html,
    tags: [
      { name: 'category', value: 'webinar' },
      { name: 'webinar_slug', value: data.webinarSlug },
      { name: 'email_type', value: 'followup_reminder1' },
    ],
  })
}

export async function sendWebinarFollowUp2(data: WebinarFollowUpData) {
  const resend = getResend()

  const html = await render(
    WebinarFollowUp2({
      firstName: data.firstName,
      bookingUrl: data.bookingUrl,
    })
  )

  return resend.emails.send({
    from: getFromEmail(),
    to: data.to,
    subject: 'Last chance — 20% off expires at midday today',
    html,
    tags: [
      { name: 'category', value: 'webinar' },
      { name: 'webinar_slug', value: data.webinarSlug },
      { name: 'email_type', value: 'followup_reminder2' },
    ],
  })
}
