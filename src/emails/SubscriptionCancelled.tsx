import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface SubscriptionCancelledProps {
  groupName: string
}

export function SubscriptionCancelled({
  groupName,
}: SubscriptionCancelledProps) {
  return (
    <EmailLayout preview="Your Ferdy subscription has been cancelled">
      <Text style={emailStyles.h1}>Subscription Cancelled</Text>

      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        This is to confirm that the Ferdy subscription for <strong>{groupName}</strong> has been cancelled.
      </Text>

      <Section style={infoBox}>
        <Text style={emailStyles.paragraph}>
          Your account and data will remain accessible, but automated features
          (scheduling, publishing) will stop at the end of your current billing period.
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        If you change your mind, you can resubscribe at any time from your billing page.
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href="https://www.ferdy.io/account/billing" style={emailStyles.button}>
          View Billing
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        We'd love to hear your feedback on how we can improve. Feel free to reply to this email.
      </Text>

      <Text style={emailStyles.paragraph}>
        Best regards,
        <br />
        The Ferdy Team
      </Text>
    </EmailLayout>
  )
}

const infoBox = {
  backgroundColor: '#FEF3C7',
  borderRadius: '8px',
  borderLeft: '4px solid #F59E0B',
  padding: '20px',
  margin: '24px 0',
}

export default SubscriptionCancelled
