import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Try Ferdy on your venue - interactive demo',
  description:
    'Drop in your URL and see what Ferdy would automatically post for your venue. Takes about 2 minutes.',
  alternates: { canonical: 'https://ferdy.io/demo' },
  openGraph: {
    type: 'website',
    url: 'https://ferdy.io/demo',
    siteName: 'Ferdy',
    title: 'Try Ferdy on your venue - interactive demo',
    description:
      'Drop in your URL and see what Ferdy would automatically post for your venue. Takes about 2 minutes.',
    images: [
      {
        url: '/images/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Ferdy - Social media automation for venues',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Try Ferdy on your venue - interactive demo',
    description:
      'Drop in your URL and see what Ferdy would automatically post for your venue. Takes about 2 minutes.',
    images: ['/images/og-default.png'],
  },
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 antialiased">
      {children}
    </div>
  )
}
