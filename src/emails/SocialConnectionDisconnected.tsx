import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface SocialConnectionDisconnectedProps {
  brandName: string
  platform: string
  reconnectLink: string
}

export function SocialConnectionDisconnected({
  brandName,
  platform,
  reconnectLink,
}: SocialConnectionDisconnectedProps) {
  const platformColors = {
    facebook: '#1877F2',
    instagram: '#E4405F',
    linkedin: '#0A66C2',
    twitter: '#000000',
  }

  const platformColor = platformColors[platform.toLowerCase() as keyof typeof platformColors] || '#6366F1'

  return (
    <EmailLayout preview={`Action required: ${platform} connection lost`}>
      <Text style={emailStyles.h1}>⚠️ Social Connection Needs Attention</Text>
      
      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        We've detected that the <strong>{platform}</strong> connection for{' '}
        <strong>{brandName}</strong> is no longer working.
      </Text>

      <Section style={{ ...alertBox, borderLeftColor: platformColor }}>
        <Text style={alertTitle}>What This Means</Text>
        <Text style={alertText}>
          Ferdy can't currently publish posts to your {platform} account. This usually happens when:
        </Text>
        <ul style={{ ...emailStyles.list, marginTop: '12px' }}>
          <li style={emailStyles.listItem}>Your password was changed</li>
          <li style={emailStyles.listItem}>Access permissions were revoked</li>
          <li style={emailStyles.listItem}>The connection token expired</li>
        </ul>
      </Section>

      <Text style={emailStyles.paragraph}>
        <strong>Action Required:</strong> Please reconnect your {platform} account to resume
        publishing posts.
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href={reconnectLink} style={emailStyles.button}>
          Reconnect {platform}
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        Any scheduled posts for {platform} are currently paused and will resume once you reconnect.
      </Text>

      <Text style={emailStyles.paragraph}>
        If you need help, our support team is here to assist you.
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
  backgroundColor: '#FEF2F2',
  borderRadius: '8px',
  borderLeft: '4px solid #EF4444',
  padding: '20px',
  margin: '24px 0',
}

const alertTitle = {
  color: '#0A0A0A',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '1.5',
  margin: '0 0 8px 0',
}

const alertText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: 0,
}

export default SocialConnectionDisconnected
