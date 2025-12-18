import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface PostPublishedProps {
  brandName: string
  publishedAt: string
  platform?: string // Deprecated: use channels array instead
  channels?: Array<{ name: string; channel: string; url: string | null }> // New: array of channels
  postLink: string
  postPreview?: string
}

export function PostPublished({
  brandName,
  publishedAt,
  platform,
  channels,
  postLink,
  postPreview,
}: PostPublishedProps) {
  // Use channels array if provided, otherwise fall back to platform for backward compatibility
  const displayChannels = channels && channels.length > 0 
    ? channels 
    : platform 
      ? [{ name: platform, channel: platform.toLowerCase(), url: null }]
      : []

  // Determine emoji based on channels
  const getChannelEmoji = (channelName: string) => {
    const lower = channelName.toLowerCase()
    if (lower.includes('facebook')) return '📘'
    if (lower.includes('instagram')) return '📷'
    if (lower.includes('linkedin')) return '💼'
    if (lower.includes('twitter') || lower.includes('x')) return '🐦'
    return '📱'
  }

  const emoji = displayChannels.length === 1 
    ? getChannelEmoji(displayChannels[0].name)
    : '📱'

  const previewText = displayChannels.length === 1
    ? `Post published to ${displayChannels[0].name}`
    : displayChannels.length > 1
      ? `Post published to ${displayChannels.length} channels`
      : 'Post published'

  return (
    <EmailLayout preview={previewText}>
      <Text style={emailStyles.h1}>
        {emoji} Post Published Successfully!
      </Text>
      
      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        Your scheduled post for <strong>{brandName}</strong> has been successfully published
        {displayChannels.length === 1 ? (
          <> to <strong>{displayChannels[0].name}</strong>.</>
        ) : displayChannels.length > 1 ? (
          <> to <strong>{displayChannels.length} channels</strong>:</>
        ) : (
          <>.</>
        )}
      </Text>

      {displayChannels.length > 1 && (
        <Section style={channelsListBox}>
          {displayChannels.map((channel, index) => (
            <Text key={index} style={channelItem}>
              {getChannelEmoji(channel.name)} <strong>{channel.name}</strong>
              {channel.url && (
                <> — <Link href={channel.url} style={channelLink}>View post</Link></>
              )}
            </Text>
          ))}
        </Section>
      )}

      <Section style={postBox}>
        <Text style={postMeta}>
          <strong>Published:</strong> {publishedAt}
          <br />
          {displayChannels.length === 1 ? (
            <><strong>Platform:</strong> {displayChannels[0].name}</>
          ) : displayChannels.length > 1 ? (
            <><strong>Channels:</strong> {displayChannels.map(c => c.name).join(', ')}</>
          ) : platform ? (
            <><strong>Platform:</strong> {platform}</>
          ) : null}
        </Text>
        
        {postPreview && (
          <>
            <hr style={{ borderColor: '#E5E7EB', margin: '16px 0' }} />
            <Text style={postPreviewText}>{postPreview}</Text>
          </>
        )}
      </Section>

      <Section style={{ textAlign: 'center' }}>
        <Link href={postLink} style={emailStyles.button}>
          View Post in Ferdy
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        Keep up the great work!
      </Text>

      <Text style={emailStyles.paragraph}>
        The Ferdy Team
      </Text>
    </EmailLayout>
  )
}

const postBox = {
  backgroundColor: '#F3F4F6',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const postMeta = {
  color: '#6B7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: 0,
}

const postPreviewText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
  fontStyle: 'italic',
}

const channelsListBox = {
  backgroundColor: '#F9FAFB',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  border: '1px solid #E5E7EB',
}

const channelItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.8',
  margin: '8px 0',
}

const channelLink = {
  color: '#6366F1',
  textDecoration: 'underline',
}

export default PostPublished
