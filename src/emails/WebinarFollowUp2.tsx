import React from 'react'
import { Text, Section, Link } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface WebinarFollowUp2Props {
  firstName: string
  bookingUrl: string
}

export function WebinarFollowUp2({
  firstName,
  bookingUrl,
}: WebinarFollowUp2Props) {
  return (
    <EmailLayout preview="Last chance — 20% off expires at midday today">
      <Text style={emailStyles.h1}>Last chance</Text>

      <Text style={emailStyles.paragraph}>
        Hey {firstName},
      </Text>

      <Text style={emailStyles.paragraph}>
        Heads up — the 20% discount for webinar attendees expires at{' '}
        <strong>midday today (AEST)</strong>.
      </Text>

      <Text style={emailStyles.paragraph}>
        If you&apos;ve been thinking about automating your venue&apos;s social
        media, now&apos;s the time to lock it in. Book a free onboarding session
        and I&apos;ll personally help you get set up.
      </Text>

      <Section style={{ textAlign: 'center' as const }}>
        <Link href={bookingUrl} style={emailStyles.button}>
          Book before midday
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        Andrew
      </Text>
    </EmailLayout>
  )
}

export default WebinarFollowUp2
