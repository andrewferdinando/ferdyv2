import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface PaymentFailedProps {
  amount: number
  currency: string
  invoiceUrl: string
}

export function PaymentFailed({
  amount,
  currency,
  invoiceUrl,
}: PaymentFailedProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)

  return (
    <EmailLayout preview="Payment failed - Action required">
      <Text style={emailStyles.h1}>Payment Failed</Text>

      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        We were unable to process your payment of <strong>{formattedAmount}</strong> for your
        Ferdy subscription.
      </Text>

      <Section style={alertBox}>
        <Text style={emailStyles.paragraph}>
          Please update your payment method to avoid any interruption to your service.
        </Text>
      </Section>

      <Section style={{ textAlign: 'center' }}>
        <Link href={invoiceUrl} style={emailStyles.button}>
          Update Payment Method
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        If you believe this is an error, please contact our support team.
      </Text>

      <Text style={emailStyles.paragraph}>
        Best regards,
        <br />
        The Ferdy Team
      </Text>
    </EmailLayout>
  )
}

const alertBox = {
  backgroundColor: '#FEF2F2',
  borderRadius: '8px',
  borderLeft: '4px solid #EF4444',
  padding: '20px',
  margin: '24px 0',
}

export default PaymentFailed
