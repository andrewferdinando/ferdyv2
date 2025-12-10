import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface NewUserInviteProps {
  brandName: string
  inviterName: string
  inviteLink: string
}

export function NewUserInvite({
  brandName,
  inviterName,
  inviteLink,
}: NewUserInviteProps) {
  return (
    <EmailLayout preview={`${inviterName} invited you to join ${brandName} on Ferdy`}>
      <Text style={emailStyles.h1}>You're invited to join {brandName}! 🎉</Text>
      
      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        <strong>{inviterName}</strong> has invited you to join <strong>{brandName}</strong> on Ferdy,
        the AI-powered social media automation platform.
      </Text>

      <Text style={emailStyles.paragraph}>
        Ferdy helps teams automate their social media content creation and scheduling,
        saving hours of work every week.
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href={inviteLink} style={emailStyles.button}>
          Accept Invitation
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        This invitation link will expire in 7 days. If you have any questions,
        feel free to reach out to {inviterName} or our support team.
      </Text>

      <Text style={emailStyles.paragraph}>
        Looking forward to having you on board!
      </Text>

      <Text style={emailStyles.paragraph}>
        Best regards,
        <br />
        The Ferdy Team
      </Text>
    </EmailLayout>
  )
}

export default NewUserInvite
