import React from 'react'
import { Text, Section, Link } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface WebinarConfirmationProps {
  firstName: string
  webinarName: string
  webinarDate: string
  googleCalendarUrl: string
}

export function WebinarConfirmation({
  firstName,
  webinarName,
  webinarDate,
  googleCalendarUrl,
}: WebinarConfirmationProps) {
  return (
    <EmailLayout preview={`You're registered for ${webinarName}`}>
      <Text style={emailStyles.h1}>You&apos;re in!</Text>

      <Text style={emailStyles.paragraph}>
        Hey {firstName},
      </Text>

      <Text style={emailStyles.paragraph}>
        You&apos;re officially registered for <strong>{webinarName}</strong>.
      </Text>

      <Section style={detailsBox}>
        <Text style={emailStyles.h2}>Event details</Text>
        <Text style={emailStyles.paragraph}>
          <strong>Event:</strong> {webinarName}
          <br />
          <strong>When:</strong> {webinarDate}
          <br />
          <strong>Duration:</strong> ~30 minutes
        </Text>
      </Section>

      {/* Calendar CTA - primary action */}
      <Text style={{ ...emailStyles.h2, textAlign: 'center' as const }}>
        Step 2: Add it to your calendar
      </Text>
      <Text style={{ ...emailStyles.paragraph, textAlign: 'center' as const, color: '#6B7280' }}>
        Most attendees save the date so they don&apos;t miss out.
      </Text>

      <Section style={{ textAlign: 'center' as const }}>
        <Link href={googleCalendarUrl} style={emailStyles.button}>
          Add to Google Calendar
        </Link>
      </Section>

      <Text style={{ ...emailStyles.paragraph, textAlign: 'center' as const, fontSize: '14px', color: '#6B7280' }}>
        Use Apple or Outlook? Open the .ics file attached to this email.
      </Text>

      <Text style={emailStyles.paragraph}>
        See you there!
        <br />
        Andrew
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
