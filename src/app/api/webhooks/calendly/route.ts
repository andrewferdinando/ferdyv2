import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendOnboardingConfirmation, sendOnboardingRescheduled } from '@/lib/emails/onboarding'

/**
 * Calendly Webhook Endpoint
 *
 * Receives invitee.created and invitee.canceled events from Calendly.
 * Stores bookings in onboarding_bookings table for reminder emails.
 *
 * Only processes events for the Ferdy - onboarding event type
 * (https://calendly.com/ferdy-app/ferdy-onboarding). Other event types
 * (e.g. general meetings with Andrew) are acknowledged and ignored so
 * they don't trigger the onboarding email sequence.
 */

const ONBOARDING_EVENT_TYPE_URI =
  'https://api.calendly.com/event_types/0772c31d-260e-48f4-8be1-12bf0f0d5424'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log raw payload for debugging
    console.log('[calendly-webhook] Raw payload:', JSON.stringify(body, null, 2))

    const event = body.event
    const payload = body.payload

    if (!event || !payload) {
      console.error('[calendly-webhook] Missing event or payload. Keys:', Object.keys(body))
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // scheduled_event is present on invitee.created; invitee.canceled uses
    // old_scheduled_event as a fallback.
    const scheduledEventForFilter =
      payload.scheduled_event || payload.old_scheduled_event || {}
    const eventTypeUri = scheduledEventForFilter.event_type

    if (eventTypeUri !== ONBOARDING_EVENT_TYPE_URI) {
      console.log(
        `[calendly-webhook] Ignoring event_type "${eventTypeUri}" — not onboarding.`
      )
      return NextResponse.json({ received: true, ignored: true })
    }

    if (event === 'invitee.created') {
      // Calendly v2 webhook: invitee fields are directly on payload, not nested under payload.invitee
      const email = payload.email
      const name = payload.name || ''
      const firstName = name.split(' ')[0] || name
      const scheduledEvent = payload.scheduled_event || {}
      const eventUri = scheduledEvent.uri || ''
      const startTime = scheduledEvent.start_time

      if (!email || !eventUri || !startTime) {
        console.error('[calendly-webhook] Missing required fields:', { email, eventUri, startTime })
        console.error('[calendly-webhook] Payload keys:', Object.keys(payload))
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const { error: dbError } = await supabaseAdmin
        .from('onboarding_bookings')
        .upsert(
          {
            calendly_event_uri: eventUri,
            email: email.toLowerCase(),
            first_name: firstName,
            booking_datetime: startTime,
            status: 'scheduled',
          },
          { onConflict: 'calendly_event_uri' }
        )

      if (dbError) {
        console.error('[calendly-webhook] DB error:', dbError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      // Format booking date for the confirmation email
      const bookingDate = new Date(startTime).toLocaleString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Australia/Sydney',
        timeZoneName: 'short',
      })

      // Detect reschedule: Calendly sets old_invitee or rescheduled=true
      const isReschedule = !!payload.old_invitee || payload.rescheduled === true

      if (isReschedule) {
        await sendOnboardingRescheduled({
          to: email.toLowerCase(),
          firstName,
          bookingDate,
        }).catch((err) => {
          console.error('[calendly-webhook] Rescheduled email failed:', err)
        })
        console.log(`[calendly-webhook] Booking rescheduled: ${email} to ${startTime}`)
      } else {
        await sendOnboardingConfirmation({
          to: email.toLowerCase(),
          firstName,
          bookingDate,
        }).catch((err) => {
          console.error('[calendly-webhook] Confirmation email failed:', err)
        })
        console.log(`[calendly-webhook] Booking created: ${email} at ${startTime}`)
      }
    } else if (event === 'invitee.canceled') {
      const scheduledEvent = payload.scheduled_event || payload.old_scheduled_event || {}
      const eventUri = scheduledEvent.uri || ''

      if (eventUri) {
        await supabaseAdmin
          .from('onboarding_bookings')
          .update({ status: 'canceled' })
          .eq('calendly_event_uri', eventUri)

        console.log(`[calendly-webhook] Booking canceled: ${eventUri}`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[calendly-webhook] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
