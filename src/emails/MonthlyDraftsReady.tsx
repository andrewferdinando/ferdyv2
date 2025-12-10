import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface MonthlyDraftsReadyProps {
  brandName: string
  draftCount: number
  approvalLink: string
  month: string
}

export function MonthlyDraftsReady({
  brandName,
  draftCount,
  approvalLink,
  month,
}: MonthlyDraftsReadyProps) {
  return (
    <EmailLayout preview={`${draftCount} drafts ready for ${brandName}`}>
      <Text style={emailStyles.h1}>Your Monthly Drafts Are Ready! 📝</Text>
      
      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        Great news! Ferdy has generated <strong>{draftCount} new social media posts</strong> for{' '}
        <strong>{brandName}</strong> for {month}.
      </Text>

      <Section style={statsBox}>
        <Text style={statsNumber}>{draftCount}</Text>
        <Text style={statsLabel}>Posts Ready for Review</Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        These posts are now waiting for your review and approval. Take a few minutes to:
      </Text>

      <ul style={emailStyles.list}>
        <li style={emailStyles.listItem}>Review the content and make any edits</li>
        <li style={emailStyles.listItem}>Approve posts you're happy with</li>
        <li style={emailStyles.listItem}>Schedule them for publishing</li>
      </ul>

      <Section style={{ textAlign: 'center' }}>
        <Link href={approvalLink} style={emailStyles.button}>
          Review & Approve Drafts
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        The sooner you approve them, the sooner they'll be scheduled and published to your
        social media accounts.
      </Text>

      <Text style={emailStyles.paragraph}>
        Best regards,
        <br />
        The Ferdy Team
      </Text>
    </EmailLayout>
  )
}

const statsBox = {
  backgroundColor: '#EEF2FF',
  borderRadius: '12px',
  padding: '32px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const statsNumber = {
  color: '#6366F1',
  fontSize: '48px',
  fontWeight: '700',
  lineHeight: '1',
  margin: '0 0 8px 0',
}

const statsLabel = {
  color: '#6B7280',
  fontSize: '14px',
  fontWeight: '500',
  margin: 0,
}

export default MonthlyDraftsReady
