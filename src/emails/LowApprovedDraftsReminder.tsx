import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface LowApprovedDraftsReminderProps {
  brandName: string
  approvedCount: number
  unapprovedCount: number
  approvalLink: string
}

export function LowApprovedDraftsReminder({
  brandName,
  approvedCount,
  unapprovedCount,
  approvalLink,
}: LowApprovedDraftsReminderProps) {
  return (
    <EmailLayout preview={`${unapprovedCount} post${unapprovedCount !== 1 ? 's' : ''} need approval for ${brandName}`}>
      <Text style={emailStyles.h1}>
        Drafts Need Approval
      </Text>

      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        We noticed that <strong>{brandName}</strong> has {unapprovedCount} post{unapprovedCount !== 1 ? 's' : ''} scheduled in the next 7 days that haven't been approved yet.
      </Text>

      <Section style={statsContainer}>
        <Section style={statBox}>
          <Text style={statNumber}>{approvedCount}</Text>
          <Text style={statLabel}>Approved</Text>
        </Section>

        <Section style={statBoxHighlight}>
          <Text style={statNumberHighlight}>{unapprovedCount}</Text>
          <Text style={statLabelHighlight}>Need Approval</Text>
        </Section>
      </Section>

      <Text style={emailStyles.paragraph}>
        {unapprovedCount} post{unapprovedCount !== 1 ? 's' : ''} scheduled for the next 7 days still need{unapprovedCount === 1 ? 's' : ''} your approval to go live.
      </Text>

      <Section style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link href={approvalLink} style={emailStyles.button}>
          Review & Approve Drafts
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        Best regards,
        <br />
        The Ferdy Team
      </Text>
    </EmailLayout>
  )
}

const statsContainer = {
  display: 'flex',
  gap: '16px',
  margin: '24px 0',
  flexWrap: 'wrap' as const,
}

const statBox = {
  backgroundColor: '#EEF2FF',
  borderRadius: '12px',
  padding: '24px',
  flex: '1',
  minWidth: '150px',
  textAlign: 'center' as const,
}

const statBoxHighlight = {
  backgroundColor: '#FEF3C7',
  borderRadius: '12px',
  padding: '24px',
  flex: '1',
  minWidth: '150px',
  textAlign: 'center' as const,
}

const statNumber = {
  color: '#6366F1',
  fontSize: '36px',
  fontWeight: '700',
  lineHeight: '1',
  margin: '0 0 8px 0',
}

const statNumberHighlight = {
  color: '#92400E',
  fontSize: '36px',
  fontWeight: '700',
  lineHeight: '1',
  margin: '0 0 8px 0',
}

const statLabel = {
  color: '#6B7280',
  fontSize: '14px',
  fontWeight: '500',
  margin: 0,
}

const statLabelHighlight = {
  color: '#92400E',
  fontSize: '14px',
  fontWeight: '500',
  margin: 0,
}

export default LowApprovedDraftsReminder
