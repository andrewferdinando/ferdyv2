import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface BrandDeletedProps {
  brandName: string
  remainingBrandCount: number
  newMonthlyTotal: number
  currency: string
  billingPeriodEnd: string
}

export function BrandDeleted({
  brandName,
  remainingBrandCount,
  newMonthlyTotal,
  currency,
  billingPeriodEnd,
}: BrandDeletedProps) {
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(newMonthlyTotal / 100)

  return (
    <EmailLayout preview={`Brand removed: ${brandName}`}>
      <Text style={emailStyles.h1}>Brand Removed</Text>
      
      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        This is to confirm that <strong>{brandName}</strong> has been removed from your Ferdy account.
      </Text>

      <Section style={infoBox}>
        <Text style={emailStyles.h2}>Updated Subscription</Text>
        
        <Text style={emailStyles.paragraph}>
          <strong>Remaining Brands:</strong> {remainingBrandCount}
          <br />
          <strong>New Monthly Total:</strong> {formattedTotal}
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        Billing for this brand will stop at the end of your current billing period
        on <strong>{billingPeriodEnd}</strong>. Any unused time will be credited to your account.
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href="https://www.ferdy.io/account/billing" style={emailStyles.button}>
          View Billing Details
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        If this was a mistake or you have any questions, please contact our support team.
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
  backgroundColor: '#FEF2F2',
  borderRadius: '8px',
  borderLeft: '4px solid #EF4444',
  padding: '20px',
  margin: '24px 0',
}

export default BrandDeleted
