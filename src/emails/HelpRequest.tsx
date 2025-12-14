import React from 'react'
import { Text, Section, Hr } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface HelpRequestProps {
  userName: string
  userEmail: string
  subject: string
  category: string
  message: string
  brandName?: string
  brandId?: string
  pageUrl?: string
  timestamp: string
}

export function HelpRequest({
  userName,
  userEmail,
  subject,
  category,
  message,
  brandName,
  brandId,
  pageUrl,
  timestamp,
}: HelpRequestProps) {
  return (
    <EmailLayout preview={`Help Request: ${subject}`}>
      <Text style={emailStyles.h1}>🆘 New Help Request</Text>
      
      <Text style={emailStyles.paragraph}>
        <strong>Subject:</strong> {subject}
      </Text>

      <Text style={emailStyles.paragraph}>
        <strong>Category:</strong> {category}
      </Text>

      <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0' }} />

      <Text style={emailStyles.h2}>Message</Text>
      <Section style={messageBox}>
        <Text style={messageText}>{message}</Text>
      </Section>

      <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0' }} />

      <Text style={emailStyles.h2}>User Information</Text>
      
      <Text style={infoText}>
        <strong>Name:</strong> {userName}
        <br />
        <strong>Email:</strong> {userEmail}
      </Text>

      {brandName && brandId && (
        <Text style={infoText}>
          <strong>Brand:</strong> {brandName}
          <br />
          <strong>Brand ID:</strong> {brandId}
        </Text>
      )}

      {pageUrl && (
        <Text style={infoText}>
          <strong>Page URL:</strong> {pageUrl}
        </Text>
      )}

      <Text style={infoText}>
        <strong>Submitted:</strong> {timestamp}
      </Text>

      <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0' }} />

      <Text style={emailStyles.paragraph}>
        Reply to this email to respond directly to {userName}.
      </Text>
    </EmailLayout>
  )
}

const messageBox = {
  backgroundColor: '#F9FAFB',
  borderLeft: '4px solid #6366F1',
  borderRadius: '4px',
  padding: '16px',
  margin: '16px 0',
}

const messageText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
}

const infoText = {
  color: '#6B7280',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '8px 0',
}

export default HelpRequest
