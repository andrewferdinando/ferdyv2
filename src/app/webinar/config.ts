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
