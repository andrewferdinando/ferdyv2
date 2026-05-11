import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export const runtime = 'nodejs'
export const maxDuration = 30

const USER_AGENT =
  'Mozilla/5.0 (compatible; FerdyScopeBot/1.0; +https://ferdy.io/demo)'

const PER_REQUEST_TIMEOUT_MS = 10_000
const TOTAL_TIMEOUT_MS = 25_000
const MAX_INTERNAL_LINKS = 6
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024 // 2 MB
const MIN_IMAGE_DIMENSION = 320 // real photos are usually larger
const MAX_FINAL_IMAGES = 30
const SCORE_THRESHOLD = -5 // lenient — only drop the obvious junk

// Internal-link patterns labelled by category. We round-robin across
// categories when picking which pages to crawl, so a Shopify site with 8
// product collections doesn't crowd out the Stay / Visit / About sections.
//
// Categories chosen to mirror the kinds of business sections we care about
// for social-post categories: where to eat, where to stay, what to buy,
// who you are, what's on.
const INTERNAL_LINK_PATTERNS: Array<[RegExp, string]> = [
  [/\/(products?|shop|store|collections?)\b/i, 'shop'],
  [/\/(menu|bistro|dining|eat|food|drinks?|cafe)\b/i, 'food'],
  [/\/(stay|accommodation|rooms?|booking|long-stays?|lodge|villas?)\b/i, 'stay'],
  [/\/(events?|functions?|private-events|away-days|corporate|whats-?on|weddings?)\b/i, 'events'],
  [/\/(visit|location|find-us|directions?)\b/i, 'visit'],
  [/\/(galler(y|ies)|photos?|lookbook)\b/i, 'gallery'],
  [/\/(services?|treatments?|classes?|programs?|sessions?)\b/i, 'services'],
  [/\/(about|our-(story|team|island|history|people|founders?)|the-team|founders?)\b/i, 'about'],
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

// All the attributes lazy-loading libraries use to stash the real image URL
// (the visible src often points to a 1x1 placeholder or base64 SVG until JS
// runs). Note: NitroPack uses unprefixed `nitro-lazy-src` — NOT `data-nitro-
// lazy-src` as the docs sometimes suggest.
const LAZY_SRC_ATTRS = [
  'src',
  'data-src',
  'data-lazy-src',
  'data-original',
  'nitro-lazy-src', // NitroPack (verified on nextgenclubs.com.au)
  'data-nitro-lazy-src', // belt-and-braces — some Nitro versions use the prefix
  'data-cmplz-src', // Complianz cookie-consent lazy load
  'data-bg', // some background-image lazy loaders
  'data-image-src',
]

const LAZY_SRCSET_ATTRS = [
  'srcset',
  'data-srcset',
  'data-lazy-srcset',
  'nitro-lazy-srcset', // NitroPack
  'data-nitro-lazy-srcset',
  'data-cmplz-srcset',
]

function extractImagesFromImgTag(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $el: cheerio.Cheerio<any>,
  pageUrl: string,
  set: Set<string>
) {
  const width = parseInt($el.attr('width') || '0', 10)
  const height = parseInt($el.attr('height') || '0', 10)
  // Skip when explicitly small (but allow when width/height aren't set)
  if (width > 0 && width < MIN_IMAGE_DIMENSION) return
  if (height > 0 && height < MIN_IMAGE_DIMENSION) return

  // Try every srcset variant first — sites with lazy loading typically put
  // a tiny placeholder in `src` and the real photo in srcset/data-srcset.
  for (const attr of LAZY_SRCSET_ATTRS) {
    const ss = $el.attr(attr)
    const largest = pickLargestFromSrcset(ss || '')
    if (largest) {
      addImage(set, pageUrl, largest)
      return
    }
  }
  // Then fall back to single-URL attributes.
  for (const attr of LAZY_SRC_ATTRS) {
    const src = $el.attr(attr)
    if (src && !src.startsWith('data:')) {
      addImage(set, pageUrl, src)
      return
    }
  }
}

function extractFromHtml(html: string, pageUrl: string): ScrapedPage {
  const $ = cheerio.load(html)

  // Pull text BEFORE stripping noscript, so SEO fallback content counts too.
  const text = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)

  const imgUrls = new Set<string>()

  // 1) Look inside <noscript> blocks first — WordPress + lazy-load plugins
  //    typically write the original <img> tag inside a noscript fallback for
  //    SEO crawlers. NitroPack does this too. These are the cleanest source
  //    of actual image URLs since they aren't placeholders.
  $('noscript').each((_, el) => {
    const inner = $(el).html()
    if (!inner) return
    const $inner = cheerio.load(`<div>${inner}</div>`)
    $inner('img').each((_, imgEl) => {
      extractImagesFromImgTag($inner(imgEl), pageUrl, imgUrls)
    })
    $inner('source').each((_, sourceEl) => {
      const ss = $inner(sourceEl).attr('srcset') || ''
      const largest = pickLargestFromSrcset(ss)
      addImage(imgUrls, pageUrl, largest)
    })
  })

  // Strip noise after we've harvested noscript images.
  $('script, style, noscript, svg, iframe, link, meta[name="viewport"]').remove()

  // 2) Live <img> tags — handle every common lazy-load attribute
  $('img').each((_, el) => {
    extractImagesFromImgTag($(el), pageUrl, imgUrls)
  })

  // 3) <picture> / <source srcset> — modern responsive photos
  $('picture source').each((_, el) => {
    for (const attr of LAZY_SRCSET_ATTRS) {
      const ss = $(el).attr(attr) || ''
      const largest = pickLargestFromSrcset(ss)
      if (largest) {
        addImage(imgUrls, pageUrl, largest)
        break
      }
    }
  })

  // 4) Video posters — often a great hero shot
  $('video[poster]').each((_, el) => {
    addImage(imgUrls, pageUrl, $(el).attr('poster'))
  })

  // 5) Open Graph / Twitter image — the brand's curated representative photo
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
  // Map of url → { priority, category } so we can round-robin diversify.
  const found = new Map<string, { priority: number; category: string }>()

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

    // Score by labelled pattern match — track which category matched so we
    // can diversify across sections rather than crowding one section.
    let priority = 0
    let category = ''
    for (const [re, cat] of INTERNAL_LINK_PATTERNS) {
      if (re.test(u.pathname)) {
        priority = 10
        category = cat
        break
      }
    }
    if (priority === 0) return // skip uncategorised links entirely

    // Penalise long deep paths (prefer top-level section pages)
    priority -= (u.pathname.split('/').length - 2) * 0.5

    const key = u.toString().replace(/#.*$/, '').replace(/\?.*$/, '')
    const existing = found.get(key)
    if (!existing || existing.priority < priority) {
      found.set(key, { priority, category })
    }
  })

  // Group by category, then round-robin pick from each group so a Shopify
  // site with 8 product collections doesn't crowd out Stay / Visit / About.
  const byCategory = new Map<string, Array<{ url: string; priority: number }>>()
  for (const [url, { priority, category }] of found) {
    if (!byCategory.has(category)) byCategory.set(category, [])
    byCategory.get(category)!.push({ url, priority })
  }
  for (const arr of byCategory.values()) {
    arr.sort((a, b) => b.priority - a.priority)
  }

  const picked: string[] = []
  while (picked.length < MAX_INTERNAL_LINKS && byCategory.size > 0) {
    for (const [cat, arr] of byCategory) {
      if (picked.length >= MAX_INTERNAL_LINKS) break
      const next = arr.shift()
      if (next) picked.push(next.url)
      if (arr.length === 0) byCategory.delete(cat)
    }
  }
  return picked
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
