import React from 'react'
import { Text, Section, Link } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

type ReminderType = '2day' | '1day' | '1hour'

interface WebinarReminderProps {
  firstName: string
  webinarName: string
  webinarDate: string
  googleCalendarUrl: string
  zoomUrl?: string
  reminderType: ReminderType
}

const reminderContent: Record<ReminderType, {
  subject: string
  heading: string
  body: (name: string) => string
  ctaLabel: string
  ctaType: 'calendar' | 'join'
}> = {
  '2day': {
    subject: 'Your training is in 2 days - is it in your calendar?',
    heading: 'Two days to go!',
    body: (name) => `Hey ${name}, just a reminder that you're registered for the training in two days. Make sure it's in your calendar so you don't miss it.`,
    ctaLabel: 'Add to Google Calendar',
    ctaType: 'calendar',
  },
  '1day': {
    subject: 'Tomorrow: How to automate your repeatable social posts',
    heading: 'See you tomorrow!',
    body: (name) => `Hey ${name}, the training is tomorrow. Here's everything you need to join.`,
    ctaLabel: 'Join the session',
    ctaType: 'join',
  },
  '1hour': {
    subject: 'Starting in 1 hour - join here',
    heading: 'Starting soon!',
    body: (name) => `Hey ${name}, we're kicking off in about an hour. Click below to join when you're ready.`,
    ctaLabel: 'Join now',
    ctaType: 'join',
  },
}

export function WebinarReminder({
  firstName,
  webinarName,
  webinarDate,
  googleCalendarUrl,
  zoomUrl,
  reminderType,
}: WebinarReminderProps) {
  const content = reminderContent[reminderType]
  const ctaUrl = content.ctaType === 'calendar' ? googleCalendarUrl : (zoomUrl || '#')

  return (
    <EmailLayout preview={`${content.heading} ${webinarName}`}>
      <Text style={emailStyles.h1}>{content.heading}</Text>

      <Text style={emailStyles.paragraph}>
        {content.body(firstName)}
      </Text>

      <Section style={detailsBox}>
        <Text style={emailStyles.paragraph}>
          <strong>Event:</strong> {webinarName}
          <br />
          <strong>When:</strong> {webinarDate}
          {zoomUrl && (
            <>
              <br />
              <strong>Join link:</strong>{' '}
              <Link href={zoomUrl} style={linkStyle}>{zoomUrl}</Link>
            </>
          )}
        </Text>
      </Section>

      <Section style={{ textAlign: 'center' as const }}>
        <Link href={ctaUrl} style={emailStyles.button}>
          {content.ctaLabel}
        </Link>
      </Section>

      {content.ctaType === 'calendar' && (
        <Text style={{ ...emailStyles.paragraph, textAlign: 'center' as const, fontSize: '14px', color: '#6B7280' }}>
          Use Apple or Outlook? Open the .ics file attached to this email.
        </Text>
      )}

      <Text style={emailStyles.paragraph}>
        See you there!
        <br />
        Andrew
      </Text>
    </EmailLayout>
  )
}

const detailsBox = {
  backgroundColor: '#FFF7ED',
  borderRadius: '8px',
  borderLeft: '4px solid #F59E0B',
  padding: '20px',
  margin: '24px 0',
}

const linkStyle = {
  color: '#6366F1',
  textDecoration: 'underline',
}

export { reminderContent }
export default WebinarReminder
