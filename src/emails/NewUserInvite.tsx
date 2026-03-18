import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface NewUserInviteProps {
  inviteeName: string
  brandName: string
  groupName?: string
  brandNames?: string[]
  inviterName: string
  inviteLink: string
}

export function NewUserInvite({
  inviteeName,
  brandName,
  groupName,
  brandNames,
  inviterName,
  inviteLink,
}: NewUserInviteProps) {
  const displayGroup = groupName || brandName
  const displayBrands = brandNames && brandNames.length > 0 ? brandNames : [brandName]

  return (
    <EmailLayout preview={`${inviterName} invited you to join ${displayGroup} on Ferdy`}>
      <Text style={emailStyles.h1}>You're invited to join {displayGroup}!</Text>

      <Text style={emailStyles.paragraph}>
        Hi {inviteeName},
      </Text>

      <Text style={emailStyles.paragraph}>
        <strong>{inviterName}</strong> has invited you to join <strong>{displayGroup}</strong> on Ferdy.
      </Text>

      {displayBrands.length > 0 && (
        <Text style={emailStyles.paragraph}>
          You'll have access to {displayBrands.length === 1 ? (
            <strong>{displayBrands[0]}</strong>
          ) : (
            <>the following brands: {displayBrands.map((name, i) => (
              <React.Fragment key={i}>
                {i > 0 && (i === displayBrands.length - 1 ? ' and ' : ', ')}
                <strong>{name}</strong>
              </React.Fragment>
            ))}</>
          )}.
        </Text>
      )}

      <Section style={{ textAlign: 'center' }}>
        <Link href={inviteLink} style={emailStyles.button}>
          Accept Invitation
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        This invitation link will expire in 7 days.
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
