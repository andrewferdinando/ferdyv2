import React from 'react'
import { Text, Section, Link } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface WebinarFollowUp1Props {
  firstName: string
  bookingUrl: string
}

export function WebinarFollowUp1({
  firstName,
  bookingUrl,
}: WebinarFollowUp1Props) {
  return (
    <EmailLayout preview="Quick reminder — your onboarding offer expires Friday">
      <Text style={emailStyles.h1}>Quick reminder</Text>

      <Text style={emailStyles.paragraph}>
        Hey {firstName},
      </Text>

      <Text style={emailStyles.paragraph}>
        Just a quick follow-up from Tuesday&apos;s session.
      </Text>

      <Text style={emailStyles.paragraph}>
        If you&apos;d like help getting Ferdy set up for your business, I&apos;ve
        still got onboarding spots available this week. I&apos;ll walk you through
        everything — account setup, choosing the right Categories, and making sure
        your brand voice is dialled in.
      </Text>

      <Section style={offerBox}>
        <Text style={emailStyles.paragraph}>
          The <strong>20% discount on your first 3 months</strong> is available
          if you book before <strong>midday this Friday</strong>.
        </Text>
      </Section>

      <Section style={{ textAlign: 'center' as const }}>
        <Link href={bookingUrl} style={emailStyles.button}>
          Book your session
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        Cheers,
        <br />
        Andrew
      </Text>
    </EmailLayout>
  )
}

const offerBox = {
  backgroundColor: '#EEF2FF',
  borderRadius: '8px',
  borderLeft: '4px solid #6366F1',
  padding: '20px',
  margin: '24px 0',
}

export default WebinarFollowUp1
