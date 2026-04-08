import React from 'react'
import { Text, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface WebinarAdminNotificationProps {
  firstName: string
  email: string
  webinarName: string
  webinarSlug: string
  niche: string
  location: string
}

export function WebinarAdminNotification({
  firstName,
  email,
  webinarName,
  webinarSlug,
  niche,
  location,
}: WebinarAdminNotificationProps) {
  return (
    <EmailLayout preview={`New webinar registration: ${firstName} (${email})`}>
      <Text style={emailStyles.h1}>New Webinar Registration</Text>

      <Text style={emailStyles.paragraph}>
        Someone just registered for <strong>{webinarName}</strong>.
      </Text>

      <Section style={detailsBox}>
        <Text style={emailStyles.paragraph}>
          <strong>Name:</strong> {firstName}
          <br />
          <strong>Email:</strong> {email}
          <br />
          <strong>Webinar:</strong> {webinarName}
          <br />
          <strong>Slug:</strong> {webinarSlug}
          <br />
          <strong>Niche:</strong> {niche}
          <br />
          <strong>Location:</strong> {location}
        </Text>
      </Section>
    </EmailLayout>
  )
}

const detailsBox = {
  backgroundColor: '#EEF2FF',
  borderRadius: '8px',
  borderLeft: '4px solid #6366F1',
  padding: '20px',
  margin: '24px 0',
}

export default WebinarAdminNotification
