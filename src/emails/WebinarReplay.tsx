import React from 'react'
import { Text, Section, Link, Hr } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface WebinarReplayProps {
  firstName: string
  webinarName: string
  recordingUrl: string
  bookingUrl: string
}

export function WebinarReplay({
  firstName,
  webinarName,
  recordingUrl,
  bookingUrl,
}: WebinarReplayProps) {
  return (
    <EmailLayout preview={`Recording + special offer from ${webinarName}`}>
      <Text style={emailStyles.h1}>Thanks for joining!</Text>

      <Text style={emailStyles.paragraph}>
        Hey {firstName},
      </Text>

      <Text style={emailStyles.paragraph}>
        Thanks so much for joining today&apos;s session. I hope you found it useful.
      </Text>

      <Text style={emailStyles.h2}>Watch the recording</Text>

      <Section style={{ textAlign: 'center' as const }}>
        <Link href={recordingUrl} style={emailStyles.button}>
          Watch the recording
        </Link>
      </Section>

      <Hr style={divider} />

      <Text style={emailStyles.h2}>Your next step: Book a free onboarding session</Text>

      <Text style={emailStyles.paragraph}>
        I&apos;d love to help you get started with Ferdy. In this 1-on-1 session,
        I&apos;ll help you set up your account and we&apos;ll work through how to
        use Ferdy&apos;s Categories strategically for your business.
      </Text>

      <Section style={offerBox}>
        <Text style={emailStyles.paragraph}>
          As a thank you for attending the training, I&apos;m offering{' '}
          <strong>20% off your first 3 months</strong> if you book your
          onboarding session before <strong>midday this Friday (24 April AEST)</strong>.
        </Text>
      </Section>

      <Section style={{ textAlign: 'center' as const }}>
        <Link href={bookingUrl} style={emailStyles.button}>
          Book your onboarding session
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        See you there,
        <br />
        Andrew
      </Text>
    </EmailLayout>
  )
}

const divider = {
  borderColor: '#E5E7EB',
  margin: '24px 0',
}

const offerBox = {
  backgroundColor: '#EEF2FF',
  borderRadius: '8px',
  borderLeft: '4px solid #6366F1',
  padding: '20px',
  margin: '24px 0',
}

export default WebinarReplay
