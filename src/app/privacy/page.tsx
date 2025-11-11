import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Ferdy AI',
  description:
    'Understand how Ferdy AI collects, uses, and protects your information while you use our content automation platform.',
}

const sections = [
  {
    title: 'Information We Collect',
    paragraphs: [
      'We may collect and process the following types of information:',
    ],
    list: [
      'Personal Information: Name, email address, phone number, business details, and other identifiers you provide when signing up.',
      'Account Information: Login credentials and authentication details when using third-party integrations (e.g., LinkedIn, Facebook, Instagram, TikTok).',
      'Usage Data: Information about how you interact with our Services, including log files, IP addresses, browser type, and access times.',
      'Content Data: Any text, images, or other media you upload while using our Services.',
      'Third-Party Data: Information obtained from external platforms when you link accounts (e.g., social media activity, API access permissions).',
    ],
    afterList:
      'Your data is utilized to enhance our Services, authenticate connections with third-party platforms, personalize your experience, analyze trends, and communicate important updates. We are committed to ensuring your information is used responsibly.',
  },
  {
    title: 'How We Use Your Information',
    paragraphs: [
      'We use your data for the following purposes:',
    ],
    list: [
      'To provide, maintain, and improve our Services.',
      'To authenticate and connect with third-party platforms.',
      'To personalize your experience and deliver relevant content.',
      'To analyze trends and optimize performance.',
      'To communicate updates, security alerts, and customer support.',
      'To comply with legal obligations and enforce our Terms of Service.',
    ],
  },
  {
    title: 'How We Share Your Information',
    paragraphs: ['We do not sell your data. However, we may share information:'],
    list: [
      'With Service Providers: To assist with hosting, analytics, authentication, and customer support.',
      'With Third-Party Platforms: When integrating with APIs (e.g., LinkedIn, Facebook, Instagram, TikTok) based on user consent.',
      'For Legal Compliance: When required by law or to protect our rights and security.',
      'With Business Partners: If involved in a merger, acquisition, or asset sale.',
    ],
  },
  {
    title: 'Data Security',
    paragraphs: [
      'We implement security measures to protect your information. However, no method of transmission or storage is 100% secure. We encourage you to use strong passwords and be cautious when sharing information online.',
    ],
  },
  {
    title: 'Your Rights and Choices',
    paragraphs: [
      'Depending on your location, you may have the following rights:',
    ],
    list: [
      'Access & Correction: Request a copy of your data or correct inaccuracies.',
      'Deletion: Request the deletion of your data, subject to legal limitations.',
      'Opt-Out: Manage marketing preferences and API permissions.',
      'Data Portability: Obtain a structured copy of your data for transfer.',
    ],
    afterList:
      'To exercise your rights, contact us at andrew@ferdy.io.',
  },
  {
    title: 'Third-Party Links and Services',
    paragraphs: [
      'Our Services may contain links to external websites and APIs. We are not responsible for their privacy practices. We encourage you to review their policies before interacting with them.',
    ],
  },
  {
    title: "Children's Privacy",
    paragraphs: [
      'Our Services are not intended for children under 13. If we learn we have collected data from a minor without parental consent, we will delete it.',
    ],
  },
  {
    title: 'Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy periodically. Changes will be posted on this page with a revised effective date. We encourage you to review it regularly.',
    ],
  },
  {
    title: 'Contact Us',
    paragraphs: [
      'If you have questions or concerns about this Privacy Policy, contact us at:',
      <a
        key="contact-email"
        href="mailto:andrew@ferdy.io"
        className="font-medium text-[#6366F1] underline decoration-transparent transition hover:decoration-[#6366F1]"
      >
        andrew@ferdy.io
      </a>,
    ],
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#6366F1]">Ferdy AI</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">Privacy Policy</h1>
          <p className="mt-4 text-gray-600">Effective date: 26 March 2025</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="mt-8 space-y-10">
          {sections.map(({ title, paragraphs, list, afterList }) => (
            <section key={title}>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <div className="mt-4 space-y-4 text-base leading-7 text-gray-700">
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                {list && (
                  <ul className="list-disc space-y-2 pl-5">
                    {list.map((item) => (
                      <li key={item} className="text-base leading-7 text-gray-700">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                {afterList && <p>{afterList}</p>}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}

