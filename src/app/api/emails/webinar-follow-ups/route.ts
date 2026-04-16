import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  sendWebinarReplay,
  sendWebinarFollowUp1,
  sendWebinarFollowUp2,
  WebinarFollowUpData,
} from '@/lib/emails/webinar'

/**
 * Webinar Follow-Up Emails
 *
 * Runs hourly via Vercel Cron. Checks completed/active webinars for:
 * - Replay + onboarding offer: 30 mins after webinar ends
 * - Reminder 1: ~24 hours after webinar ends (next day, same time)
 * - Reminder 2: ~47 hours after webinar ends (Friday 9am AEST for a Tues webinar)
 *
 * Uses followup_*_sent_at columns as idempotency guards.
 * Replay email only sends if recording_url is set.
 */

type FollowUpType = 'replay' | 'reminder1' | 'reminder2'

interface FollowUpWindow {
  type: FollowUpType
  column: 'followup_replay_sent_at' | 'followup_reminder1_sent_at' | 'followup_reminder2_sent_at'
  offsetMs: number
  requiresRecording: boolean
}

const FOLLOWUP_WINDOWS: FollowUpWindow[] = [
  {
    type: 'replay',
    column: 'followup_replay_sent_at',
    offsetMs: 30 * 60 * 1000, // 30 mins after end
    requiresRecording: true,
  },
  {
    type: 'reminder1',
    column: 'followup_reminder1_sent_at',
    offsetMs: 24 * 60 * 60 * 1000, // 24 hours after end
    requiresRecording: false,
  },
  {
    type: 'reminder2',
    column: 'followup_reminder2_sent_at',
    offsetMs: 47 * 60 * 60 * 1000, // 47 hours after end (Fri 9am for a Tues 10am webinar)
    requiresRecording: false,
  },
]

const SEND_FN: Record<FollowUpType, (data: WebinarFollowUpData) => Promise<unknown>> = {
  replay: sendWebinarReplay,
  reminder1: sendWebinarFollowUp1,
  reminder2: sendWebinarFollowUp2,
}

export async function GET() {
  try {
    const now = new Date()

    // Fetch active webinars that have already started (follow-ups are post-event)
    const { data: webinars, error: webErr } = await supabaseAdmin
      .from('webinars')
      .select('*')
      .eq('status', 'active')
      .lt('datetime', now.toISOString())

    if (webErr) {
      console.error('[webinar-follow-ups] Error fetching webinars:', webErr)
      return NextResponse.json({ error: 'Failed to fetch webinars' }, { status: 500 })
    }

    if (!webinars || webinars.length === 0) {
      return NextResponse.json({ message: 'No completed webinars needing follow-ups' })
    }

    const results: { webinar: string; followup: string; sent: number; errors: number }[] = []

    for (const webinar of webinars) {
      const endTime =
        new Date(webinar.datetime).getTime() + webinar.duration_minutes * 60 * 1000

      for (const window of FOLLOWUP_WINDOWS) {
        // Skip if already sent
        if (webinar[window.column]) continue

        // Skip replay if recording URL not set yet
        if (window.requiresRecording && !webinar.recording_url) continue

        // Skip if booking URL not set
        if (!webinar.booking_url) continue

        // Check if we've reached the follow-up window
        const triggerTime = endTime + window.offsetMs
        if (now.getTime() < triggerTime) continue

        // Fetch all registrations for this webinar
        const { data: registrations, error: regErr } = await supabaseAdmin
          .from('webinar_registrations')
          .select('first_name, email')
          .eq('webinar_slug', webinar.slug)

        if (regErr || !registrations || registrations.length === 0) {
          console.warn(`[webinar-follow-ups] No registrations for ${webinar.slug}`)
          continue
        }

        let sent = 0
        let errors = 0
        const sendFn = SEND_FN[window.type]

        for (const reg of registrations) {
          const emailData: WebinarFollowUpData = {
            to: reg.email,
            firstName: reg.first_name,
            webinarName: webinar.name,
            webinarSlug: webinar.slug,
            recordingUrl: webinar.recording_url || '',
            bookingUrl: webinar.booking_url,
          }

          try {
            await sendFn(emailData)
            sent++
          } catch (err) {
            console.error(
              `[webinar-follow-ups] Failed to send ${window.type} to ${reg.email}:`,
              err
            )
            errors++
          }
        }

        // Mark follow-up as sent (idempotency guard)
        await supabaseAdmin
          .from('webinars')
          .update({ [window.column]: now.toISOString() })
          .eq('id', webinar.id)

        results.push({
          webinar: webinar.slug,
          followup: window.type,
          sent,
          errors,
        })

        console.log(
          `[webinar-follow-ups] Sent ${window.type} for ${webinar.slug}: ${sent} sent, ${errors} errors`
        )
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[webinar-follow-ups] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
