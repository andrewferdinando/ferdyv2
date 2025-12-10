import React from 'react'
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Img,
  Hr,
} from '@react-email/components'

interface EmailLayoutProps {
  preview: string
  children: React.ReactNode
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Ferdy Logo */}
          <Section style={header}>
            <Text style={logo}>Ferdy</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Ferdy. All rights reserved.
            </Text>
            <Text style={footerText}>
              Questions? Contact us at{' '}
              <Link href="mailto:andrew@ferdy.io" style={footerLink}>
                andrew@ferdy.io
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles following Ferdy design system
const main = {
  backgroundColor: '#FAFAFA',
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  padding: '40px 20px',
}

const container = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  maxWidth: '600px',
  margin: '0 auto',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
}

const header = {
  padding: '32px 32px 24px',
  borderBottom: '2px solid #6366F1',
  textAlign: 'center' as const,
}

const logo = {
  fontSize: '32px',
  fontWeight: '700',
  background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  margin: 0,
}

const content = {
  padding: '32px',
}

const divider = {
  borderColor: '#E5E7EB',
  margin: '0',
}

const footer = {
  padding: '24px 32px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#6B7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '4px 0',
}

const footerLink = {
  color: '#6366F1',
  textDecoration: 'none',
}

// Shared component styles for use in email templates
export const emailStyles = {
  h1: {
    color: '#0A0A0A',
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: '1.3',
    margin: '0 0 16px 0',
  },
  h2: {
    color: '#0A0A0A',
    fontSize: '20px',
    fontWeight: '600',
    lineHeight: '1.4',
    margin: '24px 0 12px 0',
  },
  paragraph: {
    color: '#374151',
    fontSize: '16px',
    lineHeight: '1.5',
    margin: '0 0 16px 0',
  },
  button: {
    backgroundColor: '#6366F1',
    borderRadius: '8px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: '500',
    lineHeight: '1',
    padding: '12px 24px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    margin: '24px 0',
  },
  list: {
    color: '#374151',
    fontSize: '16px',
    lineHeight: '1.5',
    margin: '0 0 16px 0',
    paddingLeft: '24px',
  },
  listItem: {
    margin: '8px 0',
  },
  code: {
    backgroundColor: '#F3F4F6',
    borderRadius: '6px',
    color: '#6366F1',
    fontFamily: 'monospace',
    fontSize: '14px',
    padding: '2px 6px',
  },
  badge: {
    backgroundColor: '#EEF2FF',
    borderRadius: '6px',
    color: '#6366F1',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: '500',
    padding: '4px 12px',
    margin: '0 4px',
  },
  successBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: '6px',
    color: '#10B981',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: '500',
    padding: '4px 12px',
    margin: '0 4px',
  },
  errorBadge: {
    backgroundColor: '#FEF2F2',
    borderRadius: '6px',
    color: '#EF4444',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: '500',
    padding: '4px 12px',
    margin: '0 4px',
  },
}
