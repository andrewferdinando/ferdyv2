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
  // generator so it can write accurately. Surfaced as Row 3 in the wizard.
  categoryInfo: string
  schedule: string
  postTime: string
  hashtags: string[]
  postLength: PostLength
  imageHints: string[]
  // Pre-selected images for the wizard slot. Indices into the demo's `images` array.
  defaultImageIndices: number[]
}

export type ScopeResult = {
  businessName: string
  homepageUrl: string
  images: string[]
  items: ScopeItem[]
}

export type DemoKey = 'hospitality' | 'coffee' | 'skincare'
