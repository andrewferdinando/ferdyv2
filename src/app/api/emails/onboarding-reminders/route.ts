import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  sendOnboardingReminder2Day,
  sendOnboardingReminder1Day,
  sendOnboardingReminder1Hour,
  OnboardingEmailData,
} from '@/lib/emails/onboarding'

/**
 * Onboarding Reminder Emails
 *
 * Runs hourly via Vercel Cron. Checks scheduled onboarding bookings for:
 * - 2 days before: full prep checklist
 * - 1 day before: quick checklist reminder
 * - 1 hour before: short nudge
 *
 * Uses reminder_*_sent_at columns as idempotency guards.
 */

type ReminderType = '2day' | '1day' | '1hour'

interface ReminderWindow {
  type: ReminderType
  column: 'reminder_2day_sent_at' | 'reminder_1day_sent_at' | 'reminder_1hour_sent_at'
  offsetMs: number
}

const REMINDER_WINDOWS: ReminderWindow[] = [
  { type: '2day', column: 'reminder_2day_sent_at', offsetMs: 2 * 24 * 60 * 60 * 1000 },
  { type: '1day', column: 'reminder_1day_sent_at', offsetMs: 1 * 24 * 60 * 60 * 1000 },
  { type: '1hour', column: 'reminder_1hour_sent_at', offsetMs: 1 * 60 * 60 * 1000 },
]

const SEND_FN: Record<ReminderType, (data: OnboardingEmailData) => Promise<unknown>> = {
  '2day': sendOnboardingReminder2Day,
  '1day': sendOnboardingReminder1Day,
  '1hour': sendOnboardingReminder1Hour,
}

export async function POST() {
  try {
    const now = new Date()

    // Fetch scheduled bookings with future datetimes
    const { data: bookings, error: dbErr } = await supabaseAdmin
      .from('onboarding_bookings')
      .select('*')
      .eq('status', 'scheduled')
      .gt('booking_datetime', now.toISOString())

    if (dbErr) {
      console.error('[onboarding-reminders] Error fetching bookings:', dbErr)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ message: 'No upcoming onboarding bookings' })
    }

    const results: { email: string; reminder: string; success: boolean }[] = []

    for (const booking of bookings) {
      const bookingTime = new Date(booking.booking_datetime).getTime()

      // Format the booking date for emails
      const bookingDate = new Date(booking.booking_datetime).toLocaleString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Australia/Sydney',
        timeZoneName: 'short',
      })

      for (const window of REMINDER_WINDOWS) {
        // Skip if already sent
        if (booking[window.column]) continue

        // Check if we've reached the reminder window
        const triggerTime = bookingTime - window.offsetMs
        if (now.getTime() < triggerTime) continue

        const emailData: OnboardingEmailData = {
          to: booking.email,
          firstName: booking.first_name,
          bookingDate,
        }

        const sendFn = SEND_FN[window.type]
        let success = false

        try {
          await sendFn(emailData)
          success = true
        } catch (err) {
          console.error(
            `[onboarding-reminders] Failed to send ${window.type} to ${booking.email}:`,
            err
          )
        }

        // Mark reminder as sent (idempotency guard)
        await supabaseAdmin
          .from('onboarding_bookings')
          .update({ [window.column]: now.toISOString() })
          .eq('id', booking.id)

        results.push({
          email: booking.email,
          reminder: window.type,
          success,
        })

        console.log(
          `[onboarding-reminders] Sent ${window.type} to ${booking.email}: ${success ? 'ok' : 'failed'}`
        )
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[onboarding-reminders] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
