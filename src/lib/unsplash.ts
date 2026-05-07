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
  if (!res.ok) return []

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

  cache.set(cacheKey, { images, expiresAt: Date.now() + TTL_MS })
  return images
}

/**
 * Convenience: take a list of imageHints from a category and return Unsplash
 * photos that visually match. We join the first few hints into a single query
 * so Unsplash's relevance scoring picks the best matches.
 */
export async function searchUnsplashForHints(
  hints: string[],
  perPage = 6
): Promise<UnsplashImage[]> {
  const query = hints
    .filter((h) => typeof h === 'string' && h.trim().length > 0)
    .slice(0, 3)
    .join(' ')
  return searchUnsplash(query, perPage)
}
