import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How to Enable 2FA for Facebook & Instagram | Ferdy Help',
  description:
    'Step-by-step guide to enabling two-factor authentication on your personal Facebook account and Facebook Business Manager so Ferdy can publish to your pages.',
}

export default function Meta2FAHelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-gray-900">
            Ferdy
          </Link>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Help Guide
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Intro */}
        <h1 className="text-2xl font-bold text-gray-900">
          How to Enable Two-Factor Authentication for Facebook &amp; Instagram
        </h1>
        <p className="mt-3 text-gray-600">
          Meta requires two-factor authentication (2FA) to be enabled on{' '}
          <strong>both</strong> your personal Facebook account <strong>and</strong> your
          Facebook Business Manager before third-party apps like Ferdy can publish on
          your behalf. If either is missing, your posts will fail even though the
          connection looks fine.
        </p>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This only takes a few minutes and you only need to do it once per account.
        </div>

        {/* Section 1: Personal Facebook */}
        <section className="mt-10">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              1
            </span>
            <h2 className="text-xl font-semibold text-gray-900">
              Personal Facebook Account
            </h2>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            This is the Facebook account you log in with personally — the one you use
            to manage your Pages.
          </p>

          <ol className="mt-4 space-y-4 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                1
              </span>
              <div>
                <p>
                  Go to{' '}
                  <a
                    href="https://accountscenter.facebook.com/password_and_security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500"
                  >
                    Meta Accounts Centre &rarr; Password and Security
                  </a>{' '}
                  (or open Facebook &rarr; Settings &amp; Privacy &rarr; Settings &rarr;
                  Accounts Centre &rarr; Password and Security).
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                2
              </span>
              <div>
                <p>
                  Click <strong>Two-factor authentication</strong>, then select the
                  account you want to secure.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                3
              </span>
              <div>
                <p>
                  Choose your preferred method — <strong>Authentication app</strong>{' '}
                  (recommended) or <strong>Text message (SMS)</strong>.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                4
              </span>
              <div>
                <p>Follow the on-screen prompts to complete setup.</p>
              </div>
            </li>
          </ol>

          <div className="mt-5">
            <a
              href="https://accountscenter.facebook.com/password_and_security"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Open Password &amp; Security
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          </div>
        </section>

        {/* Divider */}
        <hr className="my-10 border-gray-200" />

        {/* Section 2: Business Manager */}
        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              2
            </span>
            <h2 className="text-xl font-semibold text-gray-900">
              Facebook Business Manager
            </h2>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Business Manager has its own 2FA setting, separate from your personal
            account. Even if your personal 2FA is on, you still need to enable it here.
          </p>

          <ol className="mt-4 space-y-4 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                1
              </span>
              <div>
                <p>
                  Go to{' '}
                  <a
                    href="https://business.facebook.com/settings/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500"
                  >
                    Business Manager Security Center
                  </a>{' '}
                  (or open Business Manager &rarr; Settings &rarr; Security Center).
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                2
              </span>
              <div>
                <p>
                  Under <strong>Two-factor authentication</strong>, set the requirement
                  to at least{' '}
                  <strong>Required for admins only</strong> (or{' '}
                  <strong>Required for everyone</strong> for maximum security).
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                3
              </span>
              <div>
                <p>
                  If prompted, each team member will be asked to set up their own 2FA
                  the next time they log in to Business Manager.
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-5">
            <a
              href="https://business.facebook.com/settings/security"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Open Business Manager Security
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          </div>
        </section>

        {/* Divider */}
        <hr className="my-10 border-gray-200" />

        {/* After setup */}
        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
              3
            </span>
            <h2 className="text-xl font-semibold text-gray-900">
              After Enabling 2FA
            </h2>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Once 2FA is enabled on both accounts, go back to Ferdy and connect (or
            reconnect) your Facebook and Instagram accounts. Everything should work
            smoothly from there.
          </p>

          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <strong>Tip:</strong> If you were previously connected and posts were
            failing, disconnect your accounts in Ferdy first, then reconnect after
            enabling 2FA.
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
          Need more help? Contact us at{' '}
          <a
            href="mailto:support@ferdy.io"
            className="text-indigo-500 underline underline-offset-2"
          >
            support@ferdy.io
          </a>
        </div>
      </main>
    </div>
  )
}
