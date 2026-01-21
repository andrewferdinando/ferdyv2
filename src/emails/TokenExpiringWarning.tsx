import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface TokenExpiringWarningProps {
  brandName: string
  platform: string
  daysUntilExpiry: number
  reconnectLink: string
}

export function TokenExpiringWarning({
  brandName,
  platform,
  daysUntilExpiry,
  reconnectLink,
}: TokenExpiringWarningProps) {
  const platformColors: Record<string, string> = {
    facebook: '#1877F2',
    instagram: '#E4405F',
    linkedin: '#0A66C2',
  }

  const platformColor = platformColors[platform.toLowerCase()] || '#6366F1'

  const urgencyText = daysUntilExpiry <= 1
    ? 'expires tomorrow'
    : daysUntilExpiry <= 3
      ? `expires in ${daysUntilExpiry} days`
      : `expires in ${daysUntilExpiry} days`

  const isUrgent = daysUntilExpiry <= 3

  return (
    <EmailLayout preview={`${platform} connection for ${brandName} ${urgencyText}`}>
      <Text style={emailStyles.h1}>
        {isUrgent ? '⚠️' : '🔔'} Social Connection Expiring Soon
      </Text>

      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        Your <strong>{platform}</strong> connection for <strong>{brandName}</strong> {urgencyText}.
        To ensure uninterrupted posting, please refresh the connection.
      </Text>

      <Section style={{ ...alertBox, borderLeftColor: isUrgent ? '#EF4444' : platformColor, backgroundColor: isUrgent ? '#FEF2F2' : '#F0F9FF' }}>
        <Text style={alertTitle}>Why does this happen?</Text>
        <Text style={alertText}>
          Social platforms require periodic re-authorization for security purposes.
          This is normal and helps keep your account secure.
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        <strong>What to do</strong>
        <br />
        Click the button below to refresh your {platform} connection. This only takes a few seconds.
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href={reconnectLink} style={emailStyles.button}>
          Refresh {platform} Connection
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        If you don't refresh before it expires, Ferdy won't be able to publish posts to {platform} until you reconnect.
      </Text>

      <Text style={emailStyles.paragraph}>
        Best regards,
        <br />
        The Ferdy Team
      </Text>
    </EmailLayout>
  )
}

const alertBox = {
  backgroundColor: '#F0F9FF',
  borderRadius: '8px',
  borderLeft: '4px solid #3B82F6',
  padding: '20px',
  margin: '24px 0',
}

const alertTitle = {
  color: '#0A0A0A',
  fontSize: '16px',
  fontWeight: '600' as const,
  lineHeight: '1.5',
  margin: '0 0 8px 0',
}

const alertText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: 0,
}

export default TokenExpiringWarning
