import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface LowApprovedDraftsReminderProps {
  brandName: string
  approvedDaysCount: number
  approvalLink: string
}

export function LowApprovedDraftsReminder({
  brandName,
  approvedDaysCount,
  approvalLink,
}: LowApprovedDraftsReminderProps) {
  return (
    <EmailLayout preview={`Less than a week of approved drafts for ${brandName}`}>
      <Text style={emailStyles.h1}>
        ⚠️ Low Approved Drafts Reminder
      </Text>
      
      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        We noticed that <strong>{brandName}</strong> currently has less than a week of approved drafts in your schedule.
      </Text>

      <Section style={warningBox}>
        <Text style={warningText}>
          You have approximately <strong>{approvedDaysCount} day{approvedDaysCount !== 1 ? 's' : ''}</strong> of approved content scheduled.
        </Text>
        <Text style={warningSubtext}>
          To maintain consistent posting, we recommend having at least 7 days of approved drafts ready.
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        Don't worry—this is just a friendly reminder to review and approve your pending drafts.
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

const warningBox = {
  backgroundColor: '#FEF3C7',
  border: '1px solid #FCD34D',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const warningText = {
  color: '#92400E',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '1.5',
  margin: '0 0 8px 0',
}

const warningSubtext = {
  color: '#78350F',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: 0,
}

export default LowApprovedDraftsReminder

