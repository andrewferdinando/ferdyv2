import React from 'react'
import { Text, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface NewsletterBroadcastProps {
  content: string
}

export function NewsletterBroadcast({ content }: NewsletterBroadcastProps) {
  return (
    <EmailLayout preview="Newsletter from Ferdy">
      <Section>
        <Text
          style={emailStyles.paragraph}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </Section>
    </EmailLayout>
  )
}

export default NewsletterBroadcast
