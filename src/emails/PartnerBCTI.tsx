import React from 'react'
import { Text, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface PartnerBCTIProps {
  firstName: string
  bctiNumber: string
  periodLabel: string
  totalCents: number
  gstCents: number
  currency: string
}

export function PartnerBCTI({
  firstName,
  bctiNumber,
  periodLabel,
  totalCents,
  gstCents,
  currency,
}: PartnerBCTIProps) {
  const formatted = (cents: number) =>
    new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)

  return (
    <EmailLayout preview={`Your Ferdy partner commission — ${periodLabel}`}>
      <Text style={emailStyles.h1}>Your partner commission BCTI</Text>

      <Text style={emailStyles.paragraph}>Hi {firstName},</Text>

      <Text style={emailStyles.paragraph}>
        Here&rsquo;s your Buyer-Created Tax Invoice (BCTI) for your Ferdy partner commissions for{' '}
        <strong>{periodLabel}</strong>. The PDF is attached to this email.
      </Text>

      <Section style={infoBox}>
        <Text style={{ ...emailStyles.paragraph, margin: '0 0 6px 0' }}>
          <strong>BCTI:</strong> {bctiNumber}
        </Text>
        <Text style={{ ...emailStyles.paragraph, margin: '0 0 6px 0' }}>
          <strong>Total:</strong> {formatted(totalCents)}
          {gstCents > 0 && (
            <span style={{ color: '#6B7280', fontSize: '14px' }}> (incl. {formatted(gstCents)} GST)</span>
          )}
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        Payment will land in your bank account within 7 days, by bank transfer (NZ partners) or Wise (international).
      </Text>

      <Text style={emailStyles.paragraph}>
        Any questions, just reply to this email.
      </Text>

      <Text style={emailStyles.paragraph}>
        Cheers,
        <br />
        Andrew
        <br />
        Ferdy AI Limited
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

export default PartnerBCTI
