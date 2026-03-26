export interface WebinarConfig {
  slug: string
  name: string
  niche: string
  location: string
  headline: string
  subHeadline: string
  date: string
  datetime: string // ISO 8601 e.g. "2026-04-14T19:00:00+10:00"
  duration_minutes: number
  zoom_url: string
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
    date: 'Tuesday, 14 April - 10am AEDT - 30 mins + Q&A',
    datetime: '2026-04-14T19:00:00+10:00',
    duration_minutes: 60,
    zoom_url: 'Zoom link coming soon',
    spots: 50,
    host: {
      name: 'Andrew',
      bio: 'Founder of Ferdy and Marketing Advisor across NZ & Aus. I help companies save time and become more efficient by using AI and marketing automations.',
    },
    what_you_will_learn: [
      'Intro to the Ferdy system - automate up to 30 posts per month',
      'Live demo. Exactly how I\'d set Ferdy up for a hospo business',
    ],
  },
]

export function getWebinarBySlug(slug: string): WebinarConfig | undefined {
  return webinars.find((w) => w.slug === slug)
}
