import React from 'react'
import { Text, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface WebinarConfirmationProps {
  firstName: string
  webinarName: string
  webinarDate: string
}

export function WebinarConfirmation({
  firstName,
  webinarName,
  webinarDate,
}: WebinarConfirmationProps) {
  return (
    <EmailLayout preview={`You're registered for ${webinarName}`}>
      <Text style={emailStyles.h1}>You&apos;re in!</Text>

      <Text style={emailStyles.paragraph}>
        Hey {firstName},
      </Text>

      <Text style={emailStyles.paragraph}>
        You&apos;re officially registered for <strong>{webinarName}</strong>.
        We&apos;ll send you everything you need before the session.
      </Text>

      <Section style={detailsBox}>
        <Text style={emailStyles.h2}>What&apos;s next</Text>
        <Text style={emailStyles.paragraph}>
          <strong>Event:</strong> {webinarName}
          <br />
          <strong>When:</strong> {webinarDate}
        </Text>
        <Text style={emailStyles.paragraph}>
          Keep an eye on your inbox — we&apos;ll send a reminder with the link
          to join closer to the date.
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        See you there!
        <br />
        The Ferdy Team
      </Text>
    </EmailLayout>
  )
}

const detailsBox = {
  backgroundColor: '#FFF7ED',
  borderRadius: '8px',
  borderLeft: '4px solid #F59E0B',
  padding: '20px',
  margin: '24px 0',
}

export default WebinarConfirmation
