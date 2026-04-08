import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with the Ferdy team. Book a demo or ask questions about social media automation for your business.',
  alternates: { canonical: 'https://ferdy.io/contact' },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
