import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Partner Programme Terms & Conditions',
  description: 'Ferdy Partner Programme Terms & Conditions.',
  robots: { index: false, follow: false },
}

export default function PartnerTermsPage() {
  return (
    <div className="py-20 bg-white">
      <div className="container max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/partners"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            &larr; Back to Partner Programme
          </Link>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          Partner Programme Terms &amp; Conditions
        </h1>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8">
          <p className="text-gray-700 leading-relaxed mb-4">
            Coming soon.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Please contact{' '}
            <a href="mailto:andrew@ferdy.io" className="text-indigo-600 hover:underline font-medium">
              andrew@ferdy.io
            </a>{' '}
            for a copy of the Partner Programme Terms &amp; Conditions in the meantime.
          </p>
        </div>
      </div>
    </div>
  )
}
