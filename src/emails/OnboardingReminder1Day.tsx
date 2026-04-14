import React from 'react'
import { Text, Section, Link } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface OnboardingReminder1DayProps {
  firstName: string
  bookingDate: string
}

export function OnboardingReminder1Day({
  firstName,
  bookingDate,
}: OnboardingReminder1DayProps) {
  return (
    <EmailLayout preview="Tomorrow: Your Ferdy onboarding session">
      <Text style={emailStyles.h1}>See you tomorrow!</Text>

      <Text style={emailStyles.paragraph}>
        Hey {firstName},
      </Text>

      <Text style={emailStyles.paragraph}>
        Just a reminder that your onboarding session is tomorrow (<strong>{bookingDate}</strong>).
      </Text>

      <Text style={emailStyles.h2}>Quick checklist</Text>

      <Section style={checklistBox}>
        <Text style={emailStyles.paragraph}>
          &#9744; Categories ideas ready
          <br /><br />
          &#9744; Image/video library prepared
          <br /><br />
          &#9744; Facebook password handy
          <br /><br />
          &#9744; 2FA enabled on Facebook (<Link href="https://www.ferdy.io/help/meta-2fa" style={linkStyle}>guide here</Link>)
          <br /><br />
          &#9744; Credit card for sign-up
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        See you then,
        <br />
        Andrew
      </Text>
    </EmailLayout>
  )
}

const checklistBox = {
  backgroundColor: '#FFF7ED',
  borderRadius: '8px',
  borderLeft: '4px solid #F59E0B',
  padding: '20px',
  margin: '24px 0',
}

const linkStyle = {
  color: '#6366F1',
  textDecoration: 'underline',
}

export default OnboardingReminder1Day
