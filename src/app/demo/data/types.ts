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
  description: string
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
