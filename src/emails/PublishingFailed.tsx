import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface PublishingFailedProps {
  brandName: string
  failedChannels: string[]
  succeededChannels: string[]
  isAccountDisconnected: boolean
  viewLink: string
}

export function PublishingFailed({
  brandName,
  failedChannels,
  succeededChannels,
  isAccountDisconnected,
  viewLink,
}: PublishingFailedProps) {
  const isPartial = succeededChannels.length > 0

  return (
    <EmailLayout preview={`A scheduled post failed to publish for ${brandName}`}>
      <Text style={emailStyles.h1}>Post Publishing Failed</Text>

      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        A scheduled post for <strong>{brandName}</strong> failed to publish
        to {failedChannels.join(', ')}.
        {isPartial && (
          <> It did publish successfully to {succeededChannels.join(', ')}.</>
        )}
      </Text>

      <Section style={alertBox}>
        <Text style={alertTitle}>
          {isAccountDisconnected ? 'Account disconnected' : 'Publishing error'}
        </Text>
        <Text style={alertText}>
          {isAccountDisconnected
            ? `The social account connection was lost. Reconnect it in Ferdy, then retry the failed post.`
            : `An unexpected error occurred during publishing. Your accounts are still connected — try retrying the post.`}
        </Text>
      </Section>

      {failedChannels.length > 0 && (
        <>
          <Text style={emailStyles.paragraph}>
            <strong>Failed channels:</strong>
          </Text>
          {failedChannels.map((channel) => (
            <Text key={channel} style={{ ...emailStyles.paragraph, margin: '4px 0 4px 16px' }}>
              <span style={emailStyles.errorBadge}>{channel}</span>
            </Text>
          ))}
        </>
      )}

      {succeededChannels.length > 0 && (
        <>
          <Text style={emailStyles.paragraph}>
            <strong>Succeeded channels:</strong>
          </Text>
          {succeededChannels.map((channel) => (
            <Text key={channel} style={{ ...emailStyles.paragraph, margin: '4px 0 4px 16px' }}>
              <span style={emailStyles.successBadge}>{channel}</span>
            </Text>
          ))}
        </>
      )}

      <Section style={{ textAlign: 'center' }}>
        <Link href={viewLink} style={emailStyles.button}>
          {isAccountDisconnected ? 'Reconnect Account' : 'View in Ferdy'}
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

export default PublishingFailed
