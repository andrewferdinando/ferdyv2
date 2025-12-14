import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions | Ferdy AI',
  description:
    'Review the Terms and Conditions for using Ferdy AI, including eligibility, subscription details, and contact information.',
}

const sections = [
  {
    title: '1. Definitions',
    content: (
      <div className="mt-4 space-y-4 text-base leading-7 text-gray-700">
        <p>
          <span className="font-medium text-gray-900">Service:</span> Ferdy AI, an AI-powered content creation
          and scheduling platform.
        </p>
        <p>
          <span className="font-medium text-gray-900">User:</span> Any individual or entity accessing or using
          the Service.
        </p>
        <p>
          <span className="font-medium text-gray-900">Content:</span> Any text, images, videos, or other
          materials created, posted, or shared using Ferdy AI.
        </p>
      </div>
    ),
  },
  {
    title: '2. Eligibility',
    content: (
      <p className="mt-4 text-base leading-7 text-gray-700">
        You must be at least 18 years old or have legal guardian consent to use the Service. By using the
        Service, you represent and warrant that you meet these requirements.
      </p>
    ),
  },
  {
    title: '3. Use of the Service',
    content: (
      <div className="mt-4 space-y-4 text-base leading-7 text-gray-700">
        <p>You agree to use the Service for lawful purposes only.</p>
        <p>You will not attempt to interfere with or disrupt the Service’s functionality.</p>
        <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
      </div>
    ),
  },
  {
    title: '4. AI-Generated Content',
    content: (
      <div className="mt-4 space-y-4 text-base leading-7 text-gray-700">
        <p>
          The Service generates content using AI and external data sources. We do not guarantee accuracy,
          originality, or compliance with third-party intellectual property rights.
        </p>
        <p>Users are responsible for reviewing AI-generated content before publishing.</p>
        <p>We are not liable for any claims arising from the use of AI-generated content.</p>
      </div>
    ),
  },
  {
    title: '5. Intellectual Property',
    content: (
      <div className="mt-4 space-y-4 text-base leading-7 text-gray-700">
        <p>Ferdy AI retains ownership of all software, branding, and proprietary technology.</p>
        <p>
          Users retain ownership of content created using the Service but grant us a license to use anonymized
          data for improvements and analytics.
        </p>
        <p>Users may not copy, modify, or distribute the Service without permission.</p>
      </div>
    ),
  },
  {
    title: '6. Subscription and Payment',
    content: (
      <div className="mt-4 space-y-4 text-base leading-7 text-gray-700">
        <p>Ferdy AI may offer free and paid subscription plans.</p>
        <p>Paid subscriptions are billed on a recurring basis unless canceled before the next billing cycle.</p>
      </div>
    ),
  },
  {
    title: '7. Limitation of Liability',
    content: (
      <div className="mt-4 space-y-4 text-base leading-7 text-gray-700">
        <p>The Service is provided &quot;as is&quot; without warranties of any kind.</p>
        <p>
          We are not responsible for indirect, incidental, or consequential damages related to the use of the Service.
        </p>
        <p>
          Our maximum liability under these Terms is limited to the amount paid by the user in the last 12 months.
        </p>
      </div>
    ),
  },
  {
    title: '8. Termination',
    content: (
      <div className="mt-4 space-y-4 text-base leading-7 text-gray-700">
        <p>We reserve the right to suspend or terminate accounts violating these Terms.</p>
        <p>Users may terminate their accounts at any time by canceling their subscription.</p>
      </div>
    ),
  },
  {
    title: '9. Privacy Policy',
    content: (
      <p className="mt-4 text-base leading-7 text-gray-700">
        Your use of Ferdy AI is also governed by our Privacy Policy, which outlines how we collect, use, and protect your data.
      </p>
    ),
  },
  {
    title: '10. Changes to These Terms',
    content: (
      <p className="mt-4 text-base leading-7 text-gray-700">
        We may update these Terms periodically. Continued use of the Service after changes are posted constitutes acceptance of the new Terms.
      </p>
    ),
  },
  {
    title: '11. Governing Law and Dispute Resolution',
    content: (
      <p className="mt-4 text-base leading-7 text-gray-700">
        These Terms are governed by the laws of New Zealand. Any disputes shall be resolved through arbitration or courts in New Zealand.
      </p>
    ),
  },
  {
    title: '12. Contact Information',
    content: (
      <p className="mt-4 text-base leading-7 text-gray-700">
        For questions or concerns regarding these Terms, contact us at{' '}
        <a
          href="mailto:andrew@ferdy.io"
          className="font-medium text-[#6366F1] underline decoration-transparent transition hover:decoration-[#6366F1]"
        >
          andrew@ferdy.io
        </a>
        .
      </p>
    ),
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#6366F1]">Ferdy AI</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 text-gray-600">Last updated: 26 March 2025</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8 lg:px-12">
        <p className="text-base leading-7 text-gray-700">
          Welcome to Ferdy AI. These Terms and Conditions (&quot;Terms&quot;) govern your use of Ferdy AI
          (&quot;the Service&quot;), provided by Ferdy AI Ltd (&quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;). By using the Service, you agree to these Terms. If you do not agree, please do not
          use the Service.
        </p>

        <div className="mt-12 space-y-10">
          {sections.map(({ title, content }) => (
            <section key={title}>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              {content}
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
