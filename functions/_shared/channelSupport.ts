export type MediaType = 'image' | 'video'

interface ChannelSupport {
  images: boolean
  videos: boolean
}

const DEFAULT_SUPPORT: ChannelSupport = {
  images: true,
  videos: false,
}

const CHANNEL_MEDIA_SUPPORT: Record<string, ChannelSupport> = {
  facebook: { images: true, videos: true },
  facebook_page: { images: true, videos: true },
  instagram: { images: true, videos: true },
  instagram_feed: { images: true, videos: true },
  instagram_story: { images: true, videos: true },
  linkedin: { images: true, videos: true },
  linkedin_profile: { images: true, videos: true },
  tiktok: { images: false, videos: true },
  twitter: { images: true, videos: false },
  x: { images: true, videos: false },
}

export function normalizeChannel(channel: string | null | undefined): string | null {
  if (!channel) return null
  return channel.toLowerCase()
}

export function channelSupportsMedia(channel: string | null | undefined, mediaType: MediaType): boolean {
  const normalized = normalizeChannel(channel)
  if (!normalized) return false
  const support = CHANNEL_MEDIA_SUPPORT[normalized] ?? DEFAULT_SUPPORT
  if (mediaType === 'video') return support.videos
  return support.images
}

export const SUPPORTED_MEDIA_TYPES: MediaType[] = ['image', 'video']

