import React from 'react'
import { Text, Section, Link } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface OnboardingConfirmationProps {
  firstName: string
  bookingDate: string
}

export function OnboardingConfirmation({
  firstName,
  bookingDate,
}: OnboardingConfirmationProps) {
  return (
    <EmailLayout preview="Your Ferdy onboarding session is booked!">
      <Text style={emailStyles.h1}>You&apos;re booked in!</Text>

      <Text style={emailStyles.paragraph}>
        Hey {firstName},
      </Text>

      <Text style={emailStyles.paragraph}>
        Great news — your Ferdy onboarding session is confirmed for <strong>{bookingDate}</strong>.
      </Text>

      <Text style={emailStyles.paragraph}>
        I&apos;ll be walking you through setting up your Ferdy account and we&apos;ll
        work through how to use Categories strategically for your business.
      </Text>

      <Text style={emailStyles.h2}>Before the session, please:</Text>

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
        I&apos;ll send you a couple of reminders before the session. If you have any
        questions in the meantime, just reply to this email.
      </Text>

      <Text style={emailStyles.paragraph}>
        See you soon,
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

export default OnboardingConfirmation
