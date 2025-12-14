import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface NewUserInviteProps {
  inviteeName: string
  brandName: string
  inviterName: string
  inviteLink: string
}

export function NewUserInvite({
  inviteeName,
  brandName,
  inviterName,
  inviteLink,
}: NewUserInviteProps) {
  return (
    <EmailLayout preview={`${inviterName} invited you to join ${brandName} on Ferdy`}>
      <Text style={emailStyles.h1}>You're invited to join {brandName}! 🎉</Text>
      
      <Text style={emailStyles.paragraph}>
        Hi {inviteeName},
      </Text>

      <Text style={emailStyles.paragraph}>
        <strong>{inviterName}</strong> has invited you to join <strong>{brandName}</strong> on Ferdy.
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href={inviteLink} style={emailStyles.button}>
          Accept Invitation
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        This invitation link will expire in 7 days. If you have any questions,
        feel free to reach out to our support team.
      </Text>

      <Text style={emailStyles.paragraph}>
        Looking forward to having you on board!
      </Text>

      <Text style={emailStyles.paragraph}>
        The Ferdy Team
      </Text>
    </EmailLayout>
  )
}

export default NewUserInvite
