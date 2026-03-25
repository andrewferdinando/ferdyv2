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
      'Stop spending hours on content that gets ignored. Learn the exact system venue owners are using to stay consistent on social \u2014 without hiring a social media manager.',
    date: 'Tuesday, 14 April',
    spots: 50,
    host: {
      name: 'Andrew',
      bio: 'Founder of Ferdy and Marketing Advisor to top NZ and Australian businesses. After years of supporting marketing managers, I observed that 80% of social posts for hospo businesses are predictable and repeatable in their nature \u2014 and therefore can be automated. I\u2019ve built the system to do exactly that.',
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
