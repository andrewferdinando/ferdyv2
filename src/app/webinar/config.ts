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
      'How to Put Your Venue\u2019s Social Media on Autopilot in 30 Minutes',
    subHeadline:
      'Stop spending hours on content that gets ignored. Learn the exact system venue owners are using to stay consistent on social -without hiring a social media manager.',
    date: 'Tuesday, 14 April',
    spots: 50,
    host: {
      name: 'Andrew',
      bio: 'Founder of Ferdy and Marketing Advisor across NZ & Aus. I help companies become more efficient and save time using AI and marketing automations.',
    },
    what_you_will_learn: [
      'Intro to the Ferdy system',
      'Live demo for a hospo business',
    ],
  },
]

export function getWebinarBySlug(slug: string): WebinarConfig | undefined {
  return webinars.find((w) => w.slug === slug)
}
