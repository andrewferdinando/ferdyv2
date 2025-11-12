import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Data Deletion | Ferdy AI',
  description: 'Learn how to request deletion of your Ferdy data.',
}

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:px-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#6366F1]">Ferdy AI</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            Data Deletion
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-16 text-base leading-7 text-gray-700 sm:px-8 lg:px-12">
        <p>
          If you wish to delete your data associated with Ferdy, please contact us at{' '}
          <a
            href="mailto:andrew@ferdy.io"
            className="font-medium text-[#6366F1] underline decoration-transparent transition hover:decoration-[#6366F1]"
          >
            andrew@ferdy.io
          </a>{' '}
          and we’ll remove all connected data within 30 days.
        </p>
      </div>
    </main>
  )
}


