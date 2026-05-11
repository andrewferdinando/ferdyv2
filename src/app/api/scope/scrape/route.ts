import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export const runtime = 'nodejs'
export const maxDuration = 30

const USER_AGENT =
  'Mozilla/5.0 (compatible; FerdyScopeBot/1.0; +https://ferdy.io/demo)'

const PER_REQUEST_TIMEOUT_MS = 10_000
const TOTAL_TIMEOUT_MS = 25_000
const MAX_INTERNAL_LINKS = 5
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024 // 2 MB
const MIN_IMAGE_DIMENSION = 320 // real photos are usually larger
const MAX_FINAL_IMAGES = 30
const SCORE_THRESHOLD = -5 // lenient — only drop the obvious junk

const INTERNAL_LINK_PATTERNS = [
  /\/about/i,
  /\/services/i,
  /\/products/i,
  /\/shop/i,
  /\/menu/i,
  /\/events/i,
  /\/whats-?on/i,
  /\/our-(story|team)/i,
]

// Scoring patterns — applied to the resolved image URL. Used to RANK scraped
// images so real photographs surface first; the score threshold only drops
// the obvious junk (icons, sprites, SVG illustrations).
//
// Negative patterns require path delimiters or filename-word boundaries so
// they don't accidentally hit legit photos (e.g. "/photos/team-icon-
// presentation.jpg" should not be killed for containing the word "icon").
const POSITIVE_PATTERNS: Array<[RegExp, number]> = [
  [/wp-content\/uploads/i, 6],
  [/cdn\/shop\/(products|files)/i, 6],
  [/squarespace-cdn|squarespace\.com\/static/i, 5],
  [/wixstatic|website-files/i, 5],
  [/\/uploads?\//i, 5],
  [/\/products?\//i, 4],
  [/\/galler(y|ies)\//i, 4],
  [/\/photos?\//i, 4],
  [/\/portfolio\//i, 3],
  [/\/media\//i, 3],
  [/\/content\//i, 3],
  [/\/(images?|img)\//i, 2],
  [/[-_]large|[-_]xl|[-_]xxl|[-_]full|[-_]orig|[-_]hero(\.|$)/i, 2],
  [/\.(jpe?g|webp)(\?|$)/i, 2],
]

// Negative patterns — only fire on path delimiters or clear filename word
// boundaries. Single-substring matches were dropping too many real photos.
const NEGATIVE_PATTERNS: Array<[RegExp, number]> = [
  [/favicon/i, -15],
  [/\.svg(\?|$)/i, -15],
  [/\/icons?\//i, -10], // images in /icon/ or /icons/ directory
  [/\/logos?\//i, -10],
  [/\/sprites?[-_/]/i, -10],
  [/[-_/]sprite[-_.]/i, -10],
  [/(?:^|[-_/])favicon[-_.]/i, -10],
  [/(?:^|[-_/])logo[-_.](?!.*photo)/i, -6], // "logo." or "logo-" as filename word
  [/(?:^|[-_/])icon[-_.](?!.*photo)/i, -6],
  [/[-_]illustration[-_.]|[-_]infographic[-_.]|[-_]diagram[-_.]|[-_]chart[-_.]/i, -5],
  [/(?:^|[-_/])emblem[-_.]/i, -4],
  [/\/badges?\/|\/awards?\//i, -4],
  [/(?:^|[-_/])placeholder[-_.]/i, -5],
  [/(?:^|[-_/])tracking[-_.]|tracking-pixel|1x1\./i, -10],
  [/(?:^|[-_/])bg[-_.]|background-pattern|[-_]pattern[-_.]/i, -4],
  [/social-(share|icon)|share-icon/i, -4],
  [/(?:^|[-_/])avatar[-_.]|profile-pic/i, -3],
  [/\/(theme|themes|build|dist)\/(?!.*\b(uploads|content|product|gallery|photo|media)\b)/i, -3],
  [/[-_]thumb[-_.]|[-_]thumbnail[-_.]|[-_]xs[-_.]|[-_]tiny[-_.]/i, -2],
]

const HARD_EXCLUDE = [
  /favicon/i,
  /pixel\.gif/i,
  /1x1\.(gif|png)/i,
  /\/tracking[-_.]/i,
]

function scoreImage(url: string): number {
  let score = 0
  for (const [pattern, weight] of POSITIVE_PATTERNS) {
    if (pattern.test(url)) score += weight
  }
  for (const [pattern, weight] of NEGATIVE_PATTERNS) {
    if (pattern.test(url)) score += weight
  }
  return score
}

/**
 * Parse a srcset string and return the URL with the largest W descriptor.
 * Falls back to the last entry (which by convention is usually largest).
 */
function pickLargestFromSrcset(srcset: string): string | null {
  if (!srcset) return null
  const entries = srcset
    .split(',')
    .map((s) => s.trim())
    .map((s) => {
      const parts = s.split(/\s+/)
      const url = parts[0]
      const w = parts[1]
      const width = w && w.endsWith('w') ? parseInt(w, 10) : 0
      return { url, width }
    })
    .filter((e) => e.url)
  if (entries.length === 0) return null
  // If any entries have width descriptors, use the largest. Otherwise take the last.
  const withWidth = entries.filter((e) => e.width > 0)
  if (withWidth.length > 0) {
    withWidth.sort((a, b) => b.width - a.width)
    return withWidth[0].url
  }
  return entries[entries.length - 1].url
}

type ScrapedPage = {
  url: string
  text: string
  images: string[]
  ogImage?: string
}

type ScrapeResponse = {
  url: string
  businessName: string
  text: string
  images: string[]
  meta: {
    title?: string
    description?: string
    ogImage?: string
  }
  insufficient?: boolean
  reason?: string
}

function normaliseUrl(input: string): string | null {
  let cleaned = input.trim()
  if (!cleaned) return null
  if (!/^https?:\/\//i.test(cleaned)) cleaned = `https://${cleaned}`
  try {
    const u = new URL(cleaned)
    return u.toString()
  } catch {
    return null
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-NZ,en;q=0.9',
      },
      signal: AbortSignal.timeout(PER_REQUEST_TIMEOUT_MS),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return null
    // Cap response size
    const reader = res.body?.getReader()
    if (!reader) return null
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        total += value.length
        if (total > MAX_RESPONSE_BYTES) {
          await reader.cancel()
          break
        }
        chunks.push(value)
      }
    }
    const blob = Buffer.concat(chunks.map((c) => Buffer.from(c)))
    return blob.toString('utf-8')
  } catch {
    return null
  }
}

function resolveUrl(base: string, relative: string): string | null {
  try {
    return new URL(relative, base).toString()
  } catch {
    return null
  }
}

function addImage(
  set: Set<string>,
  pageUrl: string,
  raw: string | null | undefined
) {
  if (!raw) return
  // Skip data: URIs (often inline SVG illustrations or placeholders).
  if (raw.startsWith('data:')) return
  const resolved = resolveUrl(pageUrl, raw)
  if (!resolved) return
  if (HARD_EXCLUDE.some((re) => re.test(resolved))) return
  set.add(resolved)
}

function extractFromHtml(html: string, pageUrl: string): ScrapedPage {
  const $ = cheerio.load(html)

  // Strip noise
  $('script, style, noscript, svg, iframe, link, meta[name="viewport"]').remove()

  // Text
  const text = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)

  const imgUrls = new Set<string>()

  // <img> tags — handle src, srcset, data-src, data-srcset (lazy loading)
  $('img').each((_, el) => {
    const $el = $(el)
    const width = parseInt($el.attr('width') || '0', 10)
    const height = parseInt($el.attr('height') || '0', 10)

    // Skip when explicitly small
    if (width > 0 && width < MIN_IMAGE_DIMENSION) return
    if (height > 0 && height < MIN_IMAGE_DIMENSION) return

    // Try every common attribute that holds an image URL
    const src =
      $el.attr('src') ||
      $el.attr('data-src') ||
      $el.attr('data-lazy-src') ||
      $el.attr('data-original') ||
      ''
    const srcset = $el.attr('srcset') || $el.attr('data-srcset') || ''

    // Prefer the largest srcset entry over the small src — many sites use a
    // tiny placeholder in src and the real photo in srcset.
    const fromSrcset = pickLargestFromSrcset(srcset)
    addImage(imgUrls, pageUrl, fromSrcset || src)
  })

  // <picture> / <source srcset> — modern responsive photos
  $('picture source').each((_, el) => {
    const srcset = $(el).attr('srcset') || $(el).attr('data-srcset') || ''
    const largest = pickLargestFromSrcset(srcset)
    addImage(imgUrls, pageUrl, largest)
  })

  // Video posters — often a great hero shot
  $('video[poster]').each((_, el) => {
    addImage(imgUrls, pageUrl, $(el).attr('poster'))
  })

  // Open Graph / Twitter image — usually the brand's best photographic asset
  const ogImage =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('meta[name="twitter:image:src"]').attr('content')
  addImage(imgUrls, pageUrl, ogImage)

  return {
    url: pageUrl,
    text,
    images: [...imgUrls],
    ogImage: ogImage ? resolveUrl(pageUrl, ogImage) ?? undefined : undefined,
  }
}

function findInternalLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html)
  const base = new URL(baseUrl)
  const found = new Map<string, number>() // url → priority

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return
    }
    const resolved = resolveUrl(baseUrl, href)
    if (!resolved) return
    let u: URL
    try {
      u = new URL(resolved)
    } catch {
      return
    }
    if (u.hostname !== base.hostname) return
    if (u.pathname === '/' || u.pathname === base.pathname) return
    if (/\.(pdf|jpg|jpeg|png|gif|webp|mp4|zip)$/i.test(u.pathname)) return

    // Score by pattern match
    let priority = 0
    for (const re of INTERNAL_LINK_PATTERNS) {
      if (re.test(u.pathname)) {
        priority += 10
        break
      }
    }
    // Penalise long deep paths
    priority -= (u.pathname.split('/').length - 2) * 0.5

    const key = u.toString().replace(/#.*$/, '').replace(/\?.*$/, '')
    if (!found.has(key) || (found.get(key) ?? 0) < priority) {
      found.set(key, priority)
    }
  })

  return [...found.entries()]
    .filter(([, p]) => p > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_INTERNAL_LINKS)
    .map(([url]) => url)
}

function getBusinessName(html: string, fallbackUrl: string): string {
  const $ = cheerio.load(html)
  const ogTitle = $('meta[property="og:site_name"]').attr('content')
  if (ogTitle && ogTitle.length < 60) return ogTitle.trim()
  const title = $('title').text().trim()
  if (title) {
    // Strip common suffixes like " | Home" or " - Wellington"
    const clean = title.split(/[|–—-]/)[0].trim()
    if (clean && clean.length < 60) return clean
  }
  try {
    return new URL(fallbackUrl).hostname.replace(/^www\./, '')
  } catch {
    return 'Your business'
  }
}

export async function POST(req: NextRequest) {
  const totalDeadline = Date.now() + TOTAL_TIMEOUT_MS

  let body: { url?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rawUrl = typeof body.url === 'string' ? body.url : ''
  const url = normaliseUrl(rawUrl)
  if (!url) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Fetch homepage
  const homepageHtml = await fetchHtml(url)
  if (!homepageHtml) {
    return NextResponse.json(
      { error: 'Couldn’t reach that site', insufficient: true },
      { status: 502 }
    )
  }

  const businessName = getBusinessName(homepageHtml, url)
  const meta = {
    title: cheerio.load(homepageHtml)('title').text().trim() || undefined,
    description:
      cheerio.load(homepageHtml)('meta[name="description"]').attr('content') ||
      undefined,
    ogImage:
      cheerio.load(homepageHtml)('meta[property="og:image"]').attr('content') ||
      undefined,
  }

  const homepage = extractFromHtml(homepageHtml, url)

  // Discover internal links
  const internalLinks = findInternalLinks(homepageHtml, url)

  // Fetch internal pages in parallel, respecting total timeout
  const remaining = totalDeadline - Date.now()
  const subPagesPromise = Promise.all(
    internalLinks.map(async (link) => {
      if (Date.now() > totalDeadline) return null
      const html = await fetchHtml(link)
      if (!html) return null
      return extractFromHtml(html, link)
    })
  )

  const subPages = await Promise.race([
    subPagesPromise,
    new Promise<(ScrapedPage | null)[]>((resolve) =>
      setTimeout(() => resolve([]), Math.max(0, remaining))
    ),
  ])

  const validSub = (subPages ?? []).filter((p): p is ScrapedPage => p !== null)
  const allPages = [homepage, ...validSub]

  // Merge text
  const allText = allPages.map((p) => p.text).join('\n\n').slice(0, 18000)

  // Merge & dedupe images across all pages
  const allImagesRaw: string[] = []
  const seen = new Set<string>()
  for (const p of allPages) {
    for (const img of p.images) {
      if (seen.has(img)) continue
      seen.add(img)
      allImagesRaw.push(img)
    }
  }

  // Score every image, drop the ones that look like graphics/chrome, and
  // sort the survivors so the picker surfaces real photographs first.
  const scored = allImagesRaw
    .map((url) => ({ url, score: scoreImage(url) }))
    .filter((x) => x.score >= SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score)

  // Always include og:image first if we have one and it survived scoring —
  // it's usually the brand's best photographic asset.
  const ogImageUrl = homepage.ogImage
  const allImages: string[] = []
  if (ogImageUrl && !HARD_EXCLUDE.some((re) => re.test(ogImageUrl))) {
    allImages.push(ogImageUrl)
  }
  for (const { url } of scored) {
    if (allImages.includes(url)) continue
    allImages.push(url)
    if (allImages.length >= MAX_FINAL_IMAGES) break
  }

  const wordCount = allText.split(/\s+/).filter(Boolean).length
  const insufficient = wordCount < 200 || allImages.length < 2

  const response: ScrapeResponse = {
    url,
    businessName,
    text: allText,
    images: allImages,
    meta,
    ...(insufficient
      ? { insufficient: true, reason: 'Not enough content found on the site' }
      : {}),
  }

  return NextResponse.json(response)
}
