import React from 'react'
import { Text, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface PartnerRegistrationNotificationProps {
  fullName: string
  email: string
  phone?: string | null
  country: string
  tradingName: string
  entityType: string
  companyNumber?: string | null
  businessAddress: string
  gstRegistered: boolean
  gstNumber?: string | null
  partnerId: string
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text style={{ ...emailStyles.paragraph, margin: '6px 0' }}>
      <strong>{label}:</strong> {value}
    </Text>
  )
}

export function PartnerRegistrationNotification({
  fullName,
  email,
  phone,
  country,
  tradingName,
  entityType,
  companyNumber,
  businessAddress,
  gstRegistered,
  gstNumber,
  partnerId,
}: PartnerRegistrationNotificationProps) {
  return (
    <EmailLayout preview={`New partner registration: ${fullName}`}>
      <Text style={emailStyles.h1}>New partner registration</Text>

      <Text style={emailStyles.paragraph}>
        A new partner has just registered via the /partners page.
      </Text>

      <Section style={infoBox}>
        <Text style={emailStyles.h2}>Contact</Text>
        <Row label="Name" value={fullName} />
        <Row label="Email" value={email} />
        <Row label="Phone" value={phone?.trim() || '-'} />
        <Row label="Country" value={country} />
      </Section>

      <Section style={infoBox}>
        <Text style={emailStyles.h2}>Business</Text>
        <Row label="Trading name" value={tradingName} />
        <Row label="Entity type" value={entityType} />
        <Row label="Company / NZBN" value={companyNumber?.trim() || '-'} />
        <Row label="Address" value={businessAddress} />
        <Row label="GST registered" value={gstRegistered ? 'Yes' : 'No'} />
        {gstRegistered && <Row label="GST number" value={gstNumber || '-'} />}
      </Section>

      <Text style={{ ...emailStyles.paragraph, color: '#6B7280', fontSize: '14px' }}>
        Bank and Wise details are encrypted in the database. Partner ID: {partnerId}
      </Text>

      <Text style={emailStyles.paragraph}>
        View in Super Admin &rarr; Partners to set a Stripe promotion code or add a discount code.
      </Text>
    </EmailLayout>
  )
}

const infoBox = {
  backgroundColor: '#F9FAFB',
  borderRadius: '8px',
  border: '1px solid #E5E7EB',
  padding: '20px',
  margin: '16px 0',
}

export default PartnerRegistrationNotification
