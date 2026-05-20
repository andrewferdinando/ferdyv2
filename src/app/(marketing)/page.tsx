import Hero from '@/components/marketing/Hero'
import TurnIntoSystem from '@/components/marketing/TurnIntoSystem'
import VenueCategories from '@/components/marketing/VenueCategories'
import HowItWorks from '@/components/marketing/HowItWorks'
import DemoMidCTA from '@/components/marketing/DemoMidCTA'
import PostTypes from '@/components/marketing/PostTypes'
import Comparison from '@/components/marketing/Comparison'
import TimeSaved from '@/components/marketing/TimeSaved'
import Pricing from '@/components/marketing/Pricing'
import FinalCTA from '@/components/marketing/FinalCTA'

export const metadata = {
  title: 'Social media automation for venues',
  description:
    'Ferdy automates the creation and publishing of your repeatable, predictable posts on Facebook and Instagram. Built for venues in Australia and New Zealand — hospitality, accommodation, events, attractions, wellness and more.',
  alternates: { canonical: 'https://ferdy.io' },
}

const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Ferdy',
  url: 'https://ferdy.io',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Ferdy automates the creation and publishing of your repeatable, predictable posts on Facebook and Instagram. Built for venues across hospitality, accommodation, events, workspaces, family entertainment, attractions, arts and wellness.',
  offers: {
    '@type': 'Offer',
    price: '147',
    priceCurrency: 'NZD',
    priceValidUntil: '2026-12-31',
    url: 'https://ferdy.io/#pricing',
    description: 'Solo plan — 1 brand, up to 30 posts per month',
  },
  featureList: [
    'Automated venue social media posting',
    'Recurring weekly and monthly post scheduling',
    'Event countdown post automation',
    'Instagram and Facebook auto-publishing',
    'AI-generated copy in your venue’s tone of voice',
    'Brand asset library with auto-rotation',
    'Post approval workflow',
  ],
  screenshot: 'https://ferdy.io/images/og-default.png',
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Ferdy AI Limited',
  url: 'https://ferdy.io',
  logo: 'https://ferdy.io/images/ferdy_logo_icon.png',
  email: 'support@ferdy.io',
  areaServed: ['NZ', 'AU'],
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'NZ',
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Ferdy?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ferdy is a social media automation tool built for venues. It automates the creation and publishing of the recurring, predictable posts your venue repeats every month on Facebook and Instagram, saving your team hours of manual work.',
      },
    },
    {
      '@type': 'Question',
      name: 'What kinds of venues is Ferdy for?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ferdy is built for venues that run a regular programme: restaurants, cafés, bars, hotels and accommodation, wedding and function venues, co-working spaces, family entertainment centres, attractions, theatres, cinemas, museums, galleries, gyms, studios and day spas.',
      },
    },
    {
      '@type': 'Question',
      name: 'What social media platforms does Ferdy support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ferdy publishes automatically to Facebook (Page posts) and Instagram (Feed posts and Stories). Posts are created from your venue details, brand assets and approved media library.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does Ferdy cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ferdy’s Solo plan is NZ$147 per month (+GST) per brand, which includes up to 30 automated posts per month. For groups or agencies managing multiple venues, custom Multi pricing is available by booking a call.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I lose control over what gets posted?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Every post is generated as a draft that you can review, edit, approve, or skip before it goes live. Nothing is published without your sign-off.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does Ferdy create posts?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You set up post categories (like weekly trivia, function spaces, or an upcoming event). Ferdy writes fresh copy each time from your venue details, rotates through your approved media library, and schedules everything on the cadence you choose.',
      },
    },
  ],
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Hero />
      <TurnIntoSystem />
      <VenueCategories />
      <HowItWorks />
      <DemoMidCTA />
      <PostTypes />
      <Comparison />
      <TimeSaved />
      <Pricing />
      <FinalCTA />
    </>
  )
}
