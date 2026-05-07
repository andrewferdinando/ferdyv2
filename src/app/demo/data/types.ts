export type IconName =
  | 'music'
  | 'burger'
  | 'umbrella'
  | 'target'
  | 'coffee'
  | 'sparkle'
  | 'calendar'
  | 'gift'
  | 'star'
  | 'heart'

export type IconColor = 'yellow' | 'pink' | 'indigo' | 'green' | 'red' | 'blue'

export type PostLength = 'Short' | 'Medium' | 'Long'

export type UnsplashImage = {
  url: string
  thumbUrl: string
  photographerName: string
  photographerUrl: string
  unsplashUrl: string
}

export type ScopeItem = {
  id: string
  type: 'recurring' | 'event'
  title: string
  subtitle: string
  icon: IconName
  iconColor: IconColor
  // Short paragraph describing the post rhythm/format ("a fortnightly post for the
  // three-step routine"). Surfaced on the Overview card.
  formatBlurb: string
  // The factual brief about the category — the actual content fed to the copy
  // generator so it can write accurately. Surfaced as Row 4 in the wizard.
  categoryInfo: string
  schedule: string
  postTime: string
  hashtags: string[]
  postLength: PostLength
  imageHints: string[]
  // Per-category Unsplash photos used to supplement scraped media when a
  // business has thin imagery. Empty (or omitted) when Unsplash is
  // unavailable or the rate limit was hit.
  unsplashImages?: UnsplashImage[]
}

export type ScopeResult = {
  businessName: string
  homepageUrl: string
  // Images scraped from the customer's website — shared across all categories.
  images: string[]
  items: ScopeItem[]
}

export type DemoKey = 'hospitality' | 'coffee' | 'skincare'
