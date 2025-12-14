import React from 'react'
import { Text, Link, Section, Hr } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface InvoicePaidProps {
  amount: number
  currency: string
  planName: string
  brandCount: number
  billingPeriodStart: string
  billingPeriodEnd: string
  invoiceUrl: string
}

export function InvoicePaid({
  amount,
  currency,
  planName,
  brandCount,
  billingPeriodStart,
  billingPeriodEnd,
  invoiceUrl,
}: InvoicePaidProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)

  return (
    <EmailLayout preview="Payment received - Thank you!">
      <Text style={emailStyles.h1}>Payment Received ✓</Text>
      
      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        Thank you for your payment! We've successfully processed your subscription payment.
      </Text>

      <Section style={receiptBox}>
        <Text style={emailStyles.h2}>Receipt</Text>
        
        <Section style={receiptRow}>
          <Text style={receiptLabel}>Amount Paid:</Text>
          <Text style={receiptValue}>{formattedAmount}</Text>
        </Section>

        <Section style={receiptRow}>
          <Text style={receiptLabel}>Plan:</Text>
          <Text style={receiptValue}>{planName}</Text>
        </Section>

        <Section style={receiptRow}>
          <Text style={receiptLabel}>Active Brands:</Text>
          <Text style={receiptValue}>{brandCount}</Text>
        </Section>

        <Hr style={{ borderColor: '#E5E7EB', margin: '16px 0' }} />

        <Section style={receiptRow}>
          <Text style={receiptLabel}>Billing Period:</Text>
          <Text style={receiptValue}>
            {billingPeriodStart} - {billingPeriodEnd}
          </Text>
        </Section>
      </Section>

      <Section style={{ textAlign: 'center' }}>
        <Link href={invoiceUrl} style={emailStyles.button}>
          View Invoice
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        Thank you for choosing Ferdy!
      </Text>

      <Text style={emailStyles.paragraph}>
        The Ferdy Team
      </Text>
    </EmailLayout>
  )
}

const receiptBox = {
  backgroundColor: '#F3F4F6',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const receiptRow = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '12px',
}

const receiptLabel = {
  color: '#6B7280',
  fontSize: '14px',
  margin: 0,
}

const receiptValue = {
  color: '#0A0A0A',
  fontSize: '14px',
  fontWeight: '600',
  margin: 0,
}

export default InvoicePaid
