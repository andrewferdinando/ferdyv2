export interface WebinarConfig {
  slug: string
  name: string
  niche: string
  location: string
  headline: string
  subHeadline: string
  date: string
  spots: number
  host: {
    name: string
    bio: string
  }
  what_you_will_learn: string[]
}

export const webinars: WebinarConfig[] = [
  {
    slug: 'ferdy-hospo-sydney',
    name: 'The Ferdy System: Sydney',
    niche: 'hospo',
    location: 'sydney',
    headline:
      'How to Put Your Venue\u2019s Social Media on Autopilot in 60 Minutes',
    subHeadline:
      'Stop spending hours on content that gets ignored. Learn the exact system venue owners are using to stay consistent on social \u2014 without hiring a social media manager.',
    date: 'Coming soon \u2014 register your spot',
    spots: 50,
    host: {
      name: 'Andrew',
      bio: 'Founder of Ferdy and former hospitality operator. After years of running venues and struggling with social media, Andrew built the system he wished existed \u2014 and now helps hundreds of venues automate their content.',
    },
    what_you_will_learn: [
      'The 3-part framework that keeps your venue posting consistently without you lifting a finger',
      'How to build a month of scroll-stopping content in under 15 minutes',
      'The biggest mistakes venue owners make on social (and what actually drives foot traffic)',
      'A live walkthrough of the system \u2014 see exactly how it works, no fluff',
    ],
  },
]

export function getWebinarBySlug(slug: string): WebinarConfig | undefined {
  return webinars.find((w) => w.slug === slug)
}
