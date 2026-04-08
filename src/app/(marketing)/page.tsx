import Hero from '@/components/marketing/Hero'
import Features from '@/components/marketing/Features'
import HowItWorks from '@/components/marketing/HowItWorks'
import Examples from '@/components/marketing/Examples'
import Comparison from '@/components/marketing/Comparison'
import RecurringPosts from '@/components/marketing/RecurringPosts'
import Events from '@/components/marketing/Events'
import TimeSaved from '@/components/marketing/TimeSaved'
import Pricing from '@/components/marketing/Pricing'
import BottomCTA from '@/components/marketing/BottomCTA'

export const metadata = {
  title: 'Social Media Automation for Small Businesses',
  description:
    'Ferdy automates repeatable social media posts for restaurants, cafes, e-commerce, and service businesses in Australia and New Zealand. Auto-publish to Instagram and Facebook.',
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
    'Social media automation tool that creates and publishes repeatable posts for small businesses. Auto-post to Instagram and Facebook.',
  offers: {
    '@type': 'Offer',
    price: '147',
    priceCurrency: 'NZD',
    priceValidUntil: '2026-12-31',
    url: 'https://ferdy.io/#pricing',
    description: 'Solo plan — 1 brand, up to 30 posts per month',
  },
  featureList: [
    'Automated social media posting',
    'Repeatable post scheduling',
    'Instagram and Facebook auto-publishing',
    'AI-generated social media content',
    'Brand asset management',
    'Post approval workflow',
  ],
  screenshot: 'https://ferdy.io/images/published_post_screenshot.png',
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
        text: 'Ferdy is a social media automation tool designed for small businesses. It automates the creation and publishing of repeatable social media posts to Instagram and Facebook, saving business owners hours of manual work each month.',
      },
    },
    {
      '@type': 'Question',
      name: 'What social media platforms does Ferdy support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ferdy currently supports automatic publishing to Instagram (feed posts and stories) and Facebook (page posts). Posts are created from your brand assets, images, and website content.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does Ferdy cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ferdy\u2019s Solo plan is NZ$147 per month (+GST) per brand, which includes up to 30 automated posts per month. For businesses managing multiple brands, custom Multi pricing is available by booking a call with the Ferdy team.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I lose control over what gets posted?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Ferdy gives you full editorial control. Every post is generated as a draft that you can review, edit, approve, or skip before it goes live. Nothing is published without your approval.',
      },
    },
    {
      '@type': 'Question',
      name: 'Who is Ferdy designed for?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ferdy is built for product-focused small businesses in Australia and New Zealand, including restaurants, cafes, venues, e-commerce stores, and service businesses that have repeatable content to share on social media each month.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does Ferdy create content?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ferdy generates posts from your actual brand assets \u2014 your images, website content, product information, and offers. It doesn\u2019t create random or generic content. You set up content categories (like weekly specials or product highlights) and Ferdy handles the scheduling and publishing.',
      },
    },
  ],
}

export default function Home() {
  const showTestimonials = process.env.NEXT_PUBLIC_SHOW_TESTIMONIALS === 'true'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Hero />
      <Features />
      <HowItWorks />
      {showTestimonials && <Examples />}
      <Comparison />
      <RecurringPosts />
      <Events />
      <TimeSaved />
      <Pricing />
      <BottomCTA />
    </>
  )
}
