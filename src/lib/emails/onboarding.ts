import { render } from '@react-email/render'
import { Resend } from 'resend'
import { OnboardingConfirmation } from '@/emails/OnboardingConfirmation'
import { OnboardingReminder2Day } from '@/emails/OnboardingReminder2Day'
import { OnboardingReminder1Day } from '@/emails/OnboardingReminder1Day'
import { OnboardingReminder1Hour } from '@/emails/OnboardingReminder1Hour'

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
  return process.env.RESEND_WEBINAR_FROM_EMAIL || 'Ferdy <support@ferdy.io>'
}

// --- Shared data shape ---

export interface OnboardingEmailData {
  to: string
  firstName: string
  bookingDate: string
}

// --- Confirmation (sent immediately on Calendly booking) ---

export async function sendOnboardingConfirmation(data: OnboardingEmailData) {
  const resend = getResend()

  const html = await render(
    OnboardingConfirmation({
      firstName: data.firstName,
      bookingDate: data.bookingDate,
    })
  )

  return resend.emails.send({
    from: getFromEmail(),
    to: data.to,
    subject: "You're booked in! Here's how to prepare",
    html,
    tags: [
      { name: 'category', value: 'onboarding' },
      { name: 'email_type', value: 'confirmation' },
    ],
  })
}

// --- 2-day reminder ---

export async function sendOnboardingReminder2Day(data: OnboardingEmailData) {
  const resend = getResend()

  const html = await render(
    OnboardingReminder2Day({
      firstName: data.firstName,
      bookingDate: data.bookingDate,
    })
  )

  return resend.emails.send({
    from: getFromEmail(),
    to: data.to,
    subject: "Your onboarding session is in 2 days — here's how to prepare",
    html,
    tags: [
      { name: 'category', value: 'onboarding' },
      { name: 'email_type', value: 'reminder_2day' },
    ],
  })
}

// --- 1-day reminder ---

export async function sendOnboardingReminder1Day(data: OnboardingEmailData) {
  const resend = getResend()

  const html = await render(
    OnboardingReminder1Day({
      firstName: data.firstName,
      bookingDate: data.bookingDate,
    })
  )

  return resend.emails.send({
    from: getFromEmail(),
    to: data.to,
    subject: 'Tomorrow: Your Ferdy onboarding session',
    html,
    tags: [
      { name: 'category', value: 'onboarding' },
      { name: 'email_type', value: 'reminder_1day' },
    ],
  })
}

// --- 1-hour reminder ---

export async function sendOnboardingReminder1Hour(data: OnboardingEmailData) {
  const resend = getResend()

  const html = await render(
    OnboardingReminder1Hour({
      firstName: data.firstName,
    })
  )

  return resend.emails.send({
    from: getFromEmail(),
    to: data.to,
    subject: 'Starting in 1 hour — your Ferdy onboarding',
    html,
    tags: [
      { name: 'category', value: 'onboarding' },
      { name: 'email_type', value: 'reminder_1hour' },
    ],
  })
}
