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
const MIN_IMAGE_DIMENSION = 200

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

const ICON_PATH_HINTS = [
  /favicon/i,
  /sprite/i,
  /icon-/i,
  /\/icons?\//i,
  /logo\.svg$/i,
  /logo-mark/i,
  /\.svg(\?|$)/i, // skip raw SVGs (likely icons/illustrations, not photographs)
  /tracking/i,
  /pixel\.gif/i,
  /1x1\./i,
]

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

  // Images
  const imgUrls = new Set<string>()
  $('img').each((_, el) => {
    const $el = $(el)
    let src = $el.attr('src') || ''
    const srcset = $el.attr('srcset') || ''
    const dataSrc = $el.attr('data-src') || ''
    const width = parseInt($el.attr('width') || '0', 10)
    const height = parseInt($el.attr('height') || '0', 10)

    // Skip tiny images
    if (width > 0 && width < MIN_IMAGE_DIMENSION) return
    if (height > 0 && height < MIN_IMAGE_DIMENSION) return

    if (!src && dataSrc) src = dataSrc
    if (!src && srcset) {
      // Pick largest from srcset
      const candidates = srcset.split(',').map((s) => s.trim().split(' ')[0])
      src = candidates[candidates.length - 1] || ''
    }
    if (!src) return

    const resolved = resolveUrl(pageUrl, src)
    if (!resolved) return

    // Skip icons/sprites/tracking
    if (ICON_PATH_HINTS.some((re) => re.test(resolved))) return

    imgUrls.add(resolved)
  })

  // Video posters
  $('video[poster]').each((_, el) => {
    const poster = $(el).attr('poster')
    if (poster) {
      const resolved = resolveUrl(pageUrl, poster)
      if (resolved) imgUrls.add(resolved)
    }
  })

  // Open Graph image
  const ogImage =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content')

  if (ogImage) {
    const resolved = resolveUrl(pageUrl, ogImage)
    if (resolved && !ICON_PATH_HINTS.some((re) => re.test(resolved))) {
      imgUrls.add(resolved)
    }
  }

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

  // Merge & dedupe images, cap to 30
  const allImages: string[] = []
  const seen = new Set<string>()
  for (const p of allPages) {
    for (const img of p.images) {
      if (seen.has(img)) continue
      seen.add(img)
      allImages.push(img)
      if (allImages.length >= 30) break
    }
    if (allImages.length >= 30) break
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
