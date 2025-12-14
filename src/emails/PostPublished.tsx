import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface PostPublishedProps {
  brandName: string
  publishedAt: string
  platform: string
  postLink: string
  postPreview?: string
}

export function PostPublished({
  brandName,
  publishedAt,
  platform,
  postLink,
  postPreview,
}: PostPublishedProps) {
  const platformEmoji = {
    facebook: '📘',
    instagram: '📷',
    linkedin: '💼',
    twitter: '🐦',
  }[platform.toLowerCase()] || '📱'

  return (
    <EmailLayout preview={`Post published to ${platform}`}>
      <Text style={emailStyles.h1}>
        {platformEmoji} Post Published Successfully!
      </Text>
      
      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        Your scheduled post for <strong>{brandName}</strong> has been successfully published
        to <strong>{platform}</strong>.
      </Text>

      <Section style={postBox}>
        <Text style={postMeta}>
          <strong>Published:</strong> {publishedAt}
          <br />
          <strong>Platform:</strong> {platform}
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

export default PostPublished
