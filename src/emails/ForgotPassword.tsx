import React from 'react'
import { Text, Link, Section } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

interface ForgotPasswordProps {
  resetLink: string
}

export function ForgotPassword({ resetLink }: ForgotPasswordProps) {
  return (
    <EmailLayout preview="Reset your Ferdy password">
      <Text style={emailStyles.h1}>Reset Your Password</Text>
      
      <Text style={emailStyles.paragraph}>
        Hi there,
      </Text>

      <Text style={emailStyles.paragraph}>
        We received a request to reset your password for your Ferdy account.
      </Text>

      <Text style={emailStyles.paragraph}>
        Click the button below to create a new password:
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href={resetLink} style={emailStyles.button}>
          Reset Password
        </Link>
      </Section>

      <Section style={warningBox}>
        <Text style={warningText}>
          <strong>Security Notice:</strong> This link will expire in 1 hour for your security.
          If you didn't request a password reset, you can safely ignore this email.
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        For security reasons, we never send your password via email. If you continue to have
        problems accessing your account, please contact our support team.
      </Text>

      <Text style={emailStyles.paragraph}>
        Best regards,
        <br />
        The Ferdy Team
      </Text>
    </EmailLayout>
  )
}

const warningBox = {
  backgroundColor: '#FEF2F2',
  borderRadius: '8px',
  borderLeft: '4px solid #EF4444',
  padding: '16px',
  margin: '24px 0',
}

const warningText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: 0,
}

export default ForgotPassword
