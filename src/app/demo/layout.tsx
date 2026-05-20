import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity" aria-label="Ferdy home">
            <span className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Ferdy
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Back to main site</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>
      {children}
    </div>
  )
}
