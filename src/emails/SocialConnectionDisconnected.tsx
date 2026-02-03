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
        We've noticed that the connection between Ferdy and your <strong>{platform}</strong> account
        for <strong>{brandName}</strong> has been interrupted.
      </Text>

      <Section style={{ ...alertBox, borderLeftColor: platformColor }}>
        <Text style={alertTitle}>What's going on?</Text>
        <Text style={alertText}>
          This is common and usually happens on the social platform's side. Accounts can disconnect
          unexpectedly, even when nothing has changed on your end.
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        <strong>What this means</strong>
        <br />
        Ferdy can't publish posts to your {platform} account until the connection is restored.
      </Text>

      <Text style={emailStyles.paragraph}>
        <strong>What to do next</strong>
        <br />
        Reconnect your {platform} account to resume publishing:
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href={reconnectLink} style={emailStyles.button}>
          Reconnect {platform}
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        Any scheduled posts for {platform} are paused and will automatically resume once you reconnect.
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
