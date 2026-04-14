import React from 'react'
import { Text, Section, Link } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface OnboardingRescheduledProps {
  firstName: string
  bookingDate: string
}

export function OnboardingRescheduled({
  firstName,
  bookingDate,
}: OnboardingRescheduledProps) {
  return (
    <EmailLayout preview="Your onboarding session has been rescheduled">
      <Text style={emailStyles.h1}>Session rescheduled</Text>

      <Text style={emailStyles.paragraph}>
        Hey {firstName},
      </Text>

      <Text style={emailStyles.paragraph}>
        Your Ferdy onboarding session has been rescheduled to <strong>{bookingDate}</strong>.
      </Text>

      <Text style={emailStyles.paragraph}>
        As a reminder, here&apos;s what to have ready beforehand:
      </Text>

      <Section style={checklistBox}>
        <Text style={emailStyles.paragraph}>
          <strong>1.</strong> Have a think about what your categories will be
          <br /><br />
          <strong>2.</strong> Have your image/video library ready
          <br /><br />
          <strong>3.</strong> Make sure you know your Facebook password
          <br /><br />
          <strong>4.</strong> Set up 2-factor authentication for Facebook — Meta insist on this.{' '}
          <Link href="https://www.ferdy.io/help/meta-2fa" style={linkStyle}>This article will help</Link>
          <br /><br />
          <strong>5.</strong> Have a credit card ready for sign-up
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        See you at the new time,
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

export default OnboardingRescheduled
