import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface WeeklyApprovalSummaryProps {
  brandName: string
  approvedCount: number
  needsApprovalCount: number
  approvalLink: string
}

export function WeeklyApprovalSummary({
  brandName,
  approvedCount,
  needsApprovalCount,
  approvalLink,
}: WeeklyApprovalSummaryProps) {
  const totalCount = approvedCount + needsApprovalCount
  const approvalPercentage = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0

  return (
    <EmailLayout preview={`${approvedCount} approved, ${needsApprovalCount} need approval for ${brandName}`}>
      <Text style={emailStyles.h1}>
        📊 Your Weekly Approval Summary
      </Text>
      
      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        Here's your weekly update on scheduled posts for <strong>{brandName}</strong>:
      </Text>

      <Section style={statsContainer}>
        <Section style={statBox}>
          <Text style={statNumber}>{approvedCount}</Text>
          <Text style={statLabel}>Approved Posts</Text>
        </Section>
        
        <Section style={statBox}>
          <Text style={statNumber}>{needsApprovalCount}</Text>
          <Text style={statLabel}>Need Approval</Text>
        </Section>
      </Section>

      {totalCount > 0 && (
        <Section style={progressBox}>
          <Text style={progressLabel}>
            Approval Progress: {approvalPercentage}%
          </Text>
          <Section style={progressBarContainer}>
            <Section style={{ ...progressBar, width: `${approvalPercentage}%` }} />
          </Section>
        </Section>
      )}

      {needsApprovalCount > 0 ? (
        <>
          <Text style={emailStyles.paragraph}>
            You have <strong>{needsApprovalCount} post{needsApprovalCount !== 1 ? 's' : ''}</strong> waiting for your approval in the next 30 days.
          </Text>

          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Link href={approvalLink} style={emailStyles.button}>
              Review & Approve Drafts
            </Link>
          </Section>
        </>
      ) : (
        <Text style={emailStyles.paragraph}>
          Great work! All posts in your 30-day window are approved and ready to publish. 🎉
        </Text>
      )}

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

const statNumber = {
  color: '#6366F1',
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

const progressBox = {
  backgroundColor: '#F9FAFB',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const progressLabel = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 12px 0',
}

const progressBarContainer = {
  backgroundColor: '#E5E7EB',
  borderRadius: '4px',
  height: '8px',
  overflow: 'hidden',
  width: '100%',
}

const progressBar = {
  backgroundColor: '#6366F1',
  height: '100%',
  borderRadius: '4px',
  transition: 'width 0.3s ease',
}

export default WeeklyApprovalSummary

