import { render } from '@react-email/render'
import { Resend } from 'resend'
import { WebinarConfirmation } from '@/emails/WebinarConfirmation'

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

// --- Confirmation (sent immediately on registration) ---

export interface WebinarConfirmationData {
  to: string
  firstName: string
  webinarName: string
  webinarDate: string
  webinarSlug: string
}

export async function sendWebinarConfirmation(data: WebinarConfirmationData) {
  const resend = getResend()

  const html = await render(
    WebinarConfirmation({
      firstName: data.firstName,
      webinarName: data.webinarName,
      webinarDate: data.webinarDate,
    })
  )

  return resend.emails.send({
    from: getFromEmail(),
    to: data.to,
    subject: "You're in! Here's what's next",
    html,
    tags: [
      { name: 'category', value: 'webinar' },
      { name: 'webinar_slug', value: data.webinarSlug },
    ],
  })
}

// --- Future email helpers (add implementations when ready) ---
//
// Pre-webinar reminders:
//   sendWebinarReminder1Week(data)
//   sendWebinarReminder1Day(data)
//   sendWebinarReminder1Hour(data)
//
// Post-webinar follow-up:
//   sendWebinarReplay(data)         — day 0
//   sendWebinarFollowUp1(data)      — day 1
//   sendWebinarFollowUp3(data)      — day 3
//   sendWebinarFollowUp5(data)      — day 5
//   sendWebinarFollowUp7(data)      — day 7
//
// Each function should accept { to, firstName, webinarSlug, webinarName }
// and filter recipients by webinar_slug from the webinar_registrations table.
