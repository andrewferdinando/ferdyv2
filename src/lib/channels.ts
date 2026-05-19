export const CHANNEL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram_feed: 'Instagram Feed',
  instagram_story: 'Instagram Story',
  linkedin_profile: 'LinkedIn Profile',
  tiktok: 'TikTok',
  x: 'X',
}

export const CHANNEL_CANONICAL_MAP: Record<string, string> = {
  facebook: 'facebook',
  'facebook page': 'facebook',
  // Instagram variants
  instagram: 'instagram_feed',
  'instagram feed': 'instagram_feed',
  instagram_feed: 'instagram_feed',
  'instagram_page': 'instagram_feed',
  // Instagram Story variants
  story: 'instagram_story',
  'instagram story': 'instagram_story',
  instagram_story: 'instagram_story',
  // LinkedIn variants
  linkedin: 'linkedin_profile',
  'linkedin profile': 'linkedin_profile',
  'linkedin page': 'linkedin_profile',
  linkedin_profile: 'linkedin_profile',
}

export const LEGACY_CHANNEL_ALIASES: Record<string, string[]> = {
  instagram_feed: ['instagram'],
  instagram_story: [],
  linkedin_profile: ['linkedin'],
}

export const SUPPORTED_CHANNELS = Object.keys(CHANNEL_LABELS)

export const CHANNEL_PROVIDER_MAP: Record<string, string> = {
  facebook: 'facebook',
  instagram_feed: 'instagram',
  instagram_story: 'instagram',
  linkedin_profile: 'linkedin',
}

export function canonicalizeChannel(channel: string | null | undefined): string | null {
  if (!channel) return null
  const normalized = channel.trim().toLowerCase()
  return CHANNEL_CANONICAL_MAP[normalized] ?? null
}

export function getChannelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel
}

export function getProviderForChannel(channel: string): string | null {
  return CHANNEL_PROVIDER_MAP[channel] ?? null
}

// Canonicalise + dedupe a channels array for persistence.
// Single source of truth for any write to subcategories.channels or schedule_rules.channels.
// Drops unrecognised values rather than persisting junk.
export function canonicalizeChannelList(channels: readonly string[] | null | undefined): string[] {
  if (!channels || channels.length === 0) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const ch of channels) {
    const canonical = canonicalizeChannel(ch)
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical)
      out.push(canonical)
    }
  }
  return out
}

