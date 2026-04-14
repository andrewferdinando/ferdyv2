import React from 'react'
import { Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface OnboardingReminder1HourProps {
  firstName: string
}

export function OnboardingReminder1Hour({
  firstName,
}: OnboardingReminder1HourProps) {
  return (
    <EmailLayout preview="Starting in 1 hour — your Ferdy onboarding">
      <Text style={emailStyles.h1}>Starting soon!</Text>

      <Text style={emailStyles.paragraph}>
        Hey {firstName},
      </Text>

      <Text style={emailStyles.paragraph}>
        We&apos;re kicking off in about an hour. Make sure you&apos;ve got your
        Facebook login and images ready to go.
      </Text>

      <Text style={emailStyles.paragraph}>
        See you shortly,
        <br />
        Andrew
      </Text>
    </EmailLayout>
  )
}

export default OnboardingReminder1Hour
