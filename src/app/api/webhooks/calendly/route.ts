import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendOnboardingConfirmation } from '@/lib/emails/onboarding'

/**
 * Calendly Webhook Endpoint
 *
 * Receives invitee.created and invitee.canceled events from Calendly.
 * Stores bookings in onboarding_bookings table for reminder emails.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const event = body.event
    const payload = body.payload

    if (!event || !payload) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    if (event === 'invitee.created') {
      const invitee = payload.invitee || {}
      const scheduledEvent = payload.scheduled_event || {}

      const email = invitee.email
      const firstName = (invitee.name || '').split(' ')[0] || invitee.name || ''
      const eventUri = scheduledEvent.uri || ''
      const startTime = scheduledEvent.start_time

      if (!email || !eventUri || !startTime) {
        console.error('[calendly-webhook] Missing required fields:', { email, eventUri, startTime })
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

      // Send confirmation email immediately
      await sendOnboardingConfirmation({
        to: email.toLowerCase(),
        firstName,
        bookingDate,
      }).catch((err) => {
        console.error('[calendly-webhook] Confirmation email failed:', err)
      })

      console.log(`[calendly-webhook] Booking created: ${email} at ${startTime}`)
    } else if (event === 'invitee.canceled') {
      const scheduledEvent = payload.scheduled_event || {}
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
