import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface BrandAddedProps {
  brandName: string
  newBrandCount: number
  newMonthlyTotal: number
  currency: string
}

export function BrandAdded({
  brandName,
  newBrandCount,
  newMonthlyTotal,
  currency,
}: BrandAddedProps) {
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(newMonthlyTotal / 100)

  return (
    <EmailLayout preview={`Brand added: ${brandName}`}>
      <Text style={emailStyles.h1}>New Brand Added ✓</Text>
      
      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        Great news! <strong>{brandName}</strong> has been successfully added to your Ferdy account.
      </Text>

      <Section style={infoBox}>
        <Text style={emailStyles.h2}>Updated Subscription</Text>
        
        <Text style={emailStyles.paragraph}>
          <strong>Active Brands:</strong> {newBrandCount}
          <br />
          <strong>New Monthly Total:</strong> {formattedTotal}
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        Your subscription has been automatically updated. The prorated amount for the remainder
        of this billing period will be added to your next invoice.
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href="https://www.ferdy.io/account/billing" style={emailStyles.button}>
          View Billing Details
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        You can now start creating content for {brandName}!
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
  backgroundColor: '#EEF2FF',
  borderRadius: '8px',
  borderLeft: '4px solid #6366F1',
  padding: '20px',
  margin: '24px 0',
}

export default BrandAdded
