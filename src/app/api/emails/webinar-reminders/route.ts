import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendWebinarReminder, WebinarEmailData } from '@/lib/emails/webinar'

/**
 * Webinar Reminder Emails
 *
 * Runs hourly via Vercel Cron. Checks each active webinar for:
 * - 2 days before: calendar reminder
 * - 1 day before: "see you tomorrow" with Zoom link
 * - 1 hour before: "starting soon" with Zoom link
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

export async function GET() {
  try {
    const now = new Date()

    // Fetch active webinars that haven't passed yet
    const { data: webinars, error: webErr } = await supabaseAdmin
      .from('webinars')
      .select('*')
      .eq('status', 'active')
      .gt('datetime', now.toISOString())

    if (webErr) {
      console.error('[webinar-reminders] Error fetching webinars:', webErr)
      return NextResponse.json({ error: 'Failed to fetch webinars' }, { status: 500 })
    }

    if (!webinars || webinars.length === 0) {
      return NextResponse.json({ message: 'No upcoming active webinars' })
    }

    const results: { webinar: string; reminder: string; sent: number; errors: number }[] = []

    for (const webinar of webinars) {
      const eventTime = new Date(webinar.datetime).getTime()

      for (const window of REMINDER_WINDOWS) {
        // Skip if already sent
        if (webinar[window.column]) continue

        // Check if we've reached the reminder window
        const triggerTime = eventTime - window.offsetMs
        if (now.getTime() < triggerTime) continue

        // Fetch all registrations for this webinar
        const { data: registrations, error: regErr } = await supabaseAdmin
          .from('webinar_registrations')
          .select('first_name, email')
          .eq('webinar_slug', webinar.slug)

        if (regErr || !registrations || registrations.length === 0) {
          console.warn(`[webinar-reminders] No registrations for ${webinar.slug}`)
          continue
        }

        let sent = 0
        let errors = 0

        for (const reg of registrations) {
          const emailData: WebinarEmailData = {
            to: reg.email,
            firstName: reg.first_name,
            webinarName: webinar.name,
            webinarDate: webinar.date_label,
            webinarSlug: webinar.slug,
            datetime: webinar.datetime,
            duration_minutes: webinar.duration_minutes,
            zoom_url: webinar.zoom_url,
          }

          try {
            await sendWebinarReminder(emailData, window.type)
            sent++
          } catch (err) {
            console.error(
              `[webinar-reminders] Failed to send ${window.type} to ${reg.email}:`,
              err
            )
            errors++
          }
        }

        // Mark reminder as sent (idempotency guard)
        await supabaseAdmin
          .from('webinars')
          .update({ [window.column]: now.toISOString() })
          .eq('id', webinar.id)

        results.push({
          webinar: webinar.slug,
          reminder: window.type,
          sent,
          errors,
        })

        console.log(
          `[webinar-reminders] Sent ${window.type} for ${webinar.slug}: ${sent} sent, ${errors} errors`
        )
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[webinar-reminders] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
