import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface ExistingUserInviteProps {
  brandName: string
  inviterName: string
  magicLink: string
}

export function ExistingUserInvite({
  brandName,
  inviterName,
  magicLink,
}: ExistingUserInviteProps) {
  return (
    <EmailLayout preview={`${inviterName} added you to ${brandName}`}>
      <Text style={emailStyles.h1}>You've been added to {brandName}</Text>
      
      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        <strong>{inviterName}</strong> has added you to <strong>{brandName}</strong> on Ferdy.
      </Text>

      <Text style={emailStyles.paragraph}>
        Click the button below to access the brand and start collaborating with your team.
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href={magicLink} style={emailStyles.button}>
          Access {brandName}
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        This magic link will log you in automatically and is valid for 24 hours.
      </Text>

      <Text style={emailStyles.paragraph}>
        Best regards,
        <br />
        The Ferdy Team
      </Text>
    </EmailLayout>
  )
}

export default ExistingUserInvite
