/**
 * Unsplash image search for the /demo "Scope My Site" tool.
 *
 * Uses the Unsplash API at demo-tier rate limit (50 req/hour). To stay under
 * the limit during a booth shift we:
 *  - Cache every search result in-memory for an hour.
 *  - Return [] silently on 429 / network error so the caller falls back to
 *    scraped-only without breaking the UX.
 *
 * Cache lives on the warm serverless instance — Vercel keeps instances around
 * long enough that booth visitors typically hit a warm cache after the first
 * couple of scans.
 */

export type UnsplashImage = {
  url: string
  thumbUrl: string
  photographerName: string
  photographerUrl: string
  unsplashUrl: string
}

type CacheEntry = { images: UnsplashImage[]; expiresAt: number }

const cache = new Map<string, CacheEntry>()
const TTL_MS = 60 * 60 * 1000 // 1 hour
const REQUEST_TIMEOUT_MS = 8000

const UNSPLASH_SEARCH_URL = 'https://api.unsplash.com/search/photos'

// UTM tags are required by Unsplash's API guidelines on photographer & photo links.
const UTM = '?utm_source=ferdy_scope_demo&utm_medium=referral'

type UnsplashSearchResponse = {
  results?: Array<{
    urls?: {
      regular?: string
      small?: string
      thumb?: string
    }
    user?: {
      name?: string
      links?: { html?: string }
    }
    links?: { html?: string }
  }>
}

/**
 * Search Unsplash for photos matching `query`. Cached per query+perPage.
 * Returns at most `perPage` images. Returns [] on rate limit / failure.
 *
 * IMPORTANT: empty results are NOT cached, so a transient Unsplash hiccup
 * doesn't lock us into "no photos for this query" for the next hour.
 */
export async function searchUnsplash(
  query: string,
  perPage = 8
): Promise<UnsplashImage[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const cacheKey = `${trimmed.toLowerCase()}|${perPage}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.images

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return []

  const url =
    `${UNSPLASH_SEARCH_URL}?query=${encodeURIComponent(trimmed)}` +
    `&per_page=${perPage}&orientation=landscape&content_filter=high`

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    return []
  }

  // 429 = rate-limited. 401/403 = misconfigured key. Either way, fall back silently.
  if (!res.ok) {
    console.warn(
      `[unsplash] non-OK response for "${trimmed}": status=${res.status}`
    )
    return []
  }

  let data: UnsplashSearchResponse
  try {
    data = (await res.json()) as UnsplashSearchResponse
  } catch {
    return []
  }

  const images: UnsplashImage[] = (data.results ?? [])
    .map((r) => {
      const url = r.urls?.regular || r.urls?.small || ''
      const thumbUrl = r.urls?.small || r.urls?.thumb || url
      const photographerName = r.user?.name || 'Unsplash'
      const photographerUrl =
        (r.user?.links?.html ?? 'https://unsplash.com') + UTM
      const unsplashUrl = (r.links?.html ?? 'https://unsplash.com') + UTM
      return { url, thumbUrl, photographerName, photographerUrl, unsplashUrl }
    })
    .filter((img) => img.url.length > 0)

  // Only cache when we actually have images — empty responses might be
  // transient (rate limit headers, glitch, etc.) and we want to retry next time.
  if (images.length > 0) {
    cache.set(cacheKey, { images, expiresAt: Date.now() + TTL_MS })
  }
  return images
}

/**
 * Take a list of imageHints from a category and return Unsplash photos.
 *
 * Strategy: try the joined query first (best relevance when it works). If that
 * comes back empty — common when Claude returns hints like
 * "infinity pool ocean view luxury" that are too narrow when AND-ed — fall
 * back to each individual hint until we find one with results. This keeps
 * popular/visual categories (pool, spa, restaurant) reliable while still
 * trying the precise query first.
 */
export async function searchUnsplashForHints(
  hints: string[],
  perPage = 8
): Promise<UnsplashImage[]> {
  const cleanHints = hints
    .filter((h) => typeof h === 'string' && h.trim().length > 0)
    .map((h) => h.trim())

  if (cleanHints.length === 0) return []

  // Attempt 1: joined query for best relevance (only if we have multiple hints).
  if (cleanHints.length > 1) {
    const joined = cleanHints.slice(0, 3).join(' ')
    const fromJoined = await searchUnsplash(joined, perPage)
    if (fromJoined.length > 0) return fromJoined
  }

  // Attempts 2-N: try each hint individually until one returns results.
  for (const hint of cleanHints) {
    const fromSingle = await searchUnsplash(hint, perPage)
    if (fromSingle.length > 0) return fromSingle
  }

  console.warn(
    `[unsplash] no images for any hint variation: ${JSON.stringify(cleanHints)}`
  )
  return []
}
