import React from 'react'
import { Text, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface PartnerRegistrationConfirmationProps {
  fullName: string
  tradingName: string
}

export function PartnerRegistrationConfirmation({
  fullName,
  tradingName,
}: PartnerRegistrationConfirmationProps) {
  const firstName = fullName.trim().split(/\s+/)[0] || 'there'

  return (
    <EmailLayout preview="Welcome to the Ferdy Partner Programme">
      <Text style={emailStyles.h1}>You&rsquo;re in.</Text>

      <Text style={emailStyles.paragraph}>Hi {firstName},</Text>

      <Text style={emailStyles.paragraph}>
        Thanks for registering {tradingName} for the Ferdy Partner Programme. You&rsquo;re all set &mdash; no further action
        needed from your end.
      </Text>

      <Section style={infoBox}>
        <Text style={{ ...emailStyles.paragraph, margin: 0 }}>
          <strong>How it works from here:</strong>
          <br />
          1. When you meet a business that would be a fit for Ferdy, email me at andrew@ferdy.io with the prospect
          CC&rsquo;d, and a short note about who they are.
          <br />
          2. I&rsquo;ll reach out, run the demo, and handle the onboarding.
          <br />
          3. When they sign up and start paying, you earn 20% of every invoice &mdash; every month, for as long as they stay
          with Ferdy.
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        Commissions are paid monthly via a Buyer-Created Tax Invoice (BCTI). Anything under NZD $50 rolls into the next
        month.
      </Text>

      <Text style={emailStyles.paragraph}>
        Any questions, just reply to this email.
      </Text>

      <Text style={emailStyles.paragraph}>
        Cheers,
        <br />
        Andrew
        <br />
        Ferdy
      </Text>
    </EmailLayout>
  )
}

const infoBox = {
  backgroundColor: '#EEF2FF',
  borderRadius: '8px',
  borderLeft: '4px solid #6366F1',
  padding: '20px',
  margin: '24px 0',
}

export default PartnerRegistrationConfirmation
