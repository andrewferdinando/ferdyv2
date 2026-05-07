import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { searchUnsplashForHints, type UnsplashImage } from '@/lib/unsplash'

export const runtime = 'nodejs'
export const maxDuration = 60

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4096

const SYSTEM_PROMPT = `You are analysing a small business website to identify content categories and events that fit Ferdy's social media automation model.

═══════════════════════════════════════════════════
THE FUNDAMENTAL RULE — MEDIA AND DESCRIPTION MUST MARRY
═══════════════════════════════════════════════════

Every category has TWO things bound together for life:
1. A POOL of media (images and videos) the business will draw from over time
2. A SINGLE description (categoryInfo) that frames every post in the series

For a category to be valid, EVERY piece of media in the pool must work with the SAME description. Each individual post pulls one or a few items from the media pool and writes fresh copy grounded in that one description — so the specific media changes post to post, the copy varies post to post, but the underlying description AND the type/vibe of the media stay locked.

THE TEST: "Could I write 12 different posts using ONE description, drawing from a coherent pool of photos, without the description ever changing?" If yes → valid category. If the description would need to change to match the next photo, → NOT a category.

❌ INVALID — "Meet the Team" / "Team Member of the Month"
Each post features a different person. The description either has to be specific to one person (then only their photos work) or generic ("our team is great") which adds no real information for copy generation. The series fundamentally requires a different brief per post — that's manual posting, not a Ferdy category.

❌ INVALID — "Customer of the Month" / "Customer Stories"
Same problem — each customer needs their own description.

❌ INVALID — "Weekly New Arrivals"
Each week is a different product needing different facts.

❌ INVALID — "Daily Specials"
The whole point is the special changes daily. Description can't be fixed.

❌ INVALID — "Our Wines" / "Our Range" if there are many varied SKUs
Too broad. One description can't accurately describe 30 different wines.

✅ VALID — "About Our Founder" (one specific founder)
One real person, multiple photos of HER, one description about HER background — endless copy variations possible (her story, her values, her favourite product, why she started, etc.) all true to the one description.

✅ VALID — "Sunday Live Music"
Same kind of imagery (band shots, microphones, the deck at golden hour), one description about the slot, copy varies (mentions different acts, different specials, different vibe of the day).

✅ VALID — "Our Sourdough" (one specific product)
Multiple photos of the same loaf — sliced, in baskets, on the bench — paired with one description. Copy varies (the process, the ingredients, the pairing suggestions, the loyal regulars).

✅ VALID — "Hydration Trio" (a fixed set of 2-3 SKUs)
The set is locked. Photos are of those specific products in various arrangements. Description is about the bundle/routine. Copy varies (morning use, evening use, results timeline, savings).

═══════════════════════════════════════════════════
HOW THE TWO PATTERN TYPES WORK
═══════════════════════════════════════════════════

1. RECURRING CATEGORIES
A rhythm of posts that runs forever — weekly, fortnightly, monthly. Best candidates:
- A specific named product/service the business sells (single SKU or a tight 2-3 product bundle)
- A specific recurring offering (Sunday roast, Tuesday special, function hire)
- A specific recurring service (private dining, group bookings, corporate catering)
- One specific person who's brand-relevant (founder, head chef, lead trainer)
- One specific space (function room, treatment room, studio)
- One specific routine or vibe that's coherent enough to keep posting

2. EVENTS
Date-anchored happenings. Lead-up posts before, and if it's a date range, during-event posts too.
Examples: Christmas function bookings open, three-day festival, seasonal product launch, anniversary sale, grand opening.

═══════════════════════════════════════════════════
LEAN INTO PRODUCTS AND SERVICES
═══════════════════════════════════════════════════
The strongest categories almost always anchor on something specific the business sells. When you read the site, identify their products or services first — the things they make money from — and try to build categories around the most photogenic, story-rich ones. A specific product or named service is much more useful than a vague "behind the scenes" or "company values" category.

═══════════════════════════════════════════════════
REQUIREMENTS
═══════════════════════════════════════════════════
- AIM FOR 6 ITEMS. Return fewer only if the business genuinely doesn't have that many viable patterns. 4 is the floor.
- Mix recurring and events. At least one event if the business has any date-anchored hooks (seasonal product, holiday function bookings, regular sales).
- Every category must pass THE TEST above. If you're tempted to suggest one that doesn't, drop it.
- Be specific. Reject vague or generic suggestions.
- Two text fields matter most:
  * formatBlurb — 2-3 sentences describing the post RHYTHM. What stays the same across every post in the series (imagery vibe, core message), and what rotates (specific copy variations). Shown to the business owner so they understand the post pattern.
  * categoryInfo — 4-6 sentences of FACTUAL DETAIL about the thing being posted about. Prices, ingredients, locations, dates, services, audience, what makes it distinctive. This is the SINGLE brief Ferdy's copy generator uses to write every post in the series — so it must be true for every photo in the media pool. Pull facts from the site content. If you can't find specifics, lean concrete over vague but don't invent — say "approximately" or "from $X" rather than fabricating exact figures.

OUTPUT FORMAT — strict JSON, no preamble, no markdown fences. The JSON must be the entire response:

{
  "items": [
    {
      "type": "recurring" | "event",
      "title": "Sunday Live Music",
      "subtitle": "Weekly live acts on the deck",
      "icon": "music" | "burger" | "umbrella" | "target" | "coffee" | "sparkle" | "calendar" | "gift" | "star" | "heart",
      "iconColor": "yellow" | "pink" | "indigo" | "green" | "red" | "blue",
      "formatBlurb": "A weekly drumbeat post promoting the Sunday afternoon live music slot. Same vibe imagery — band shots, microphones, the deck at golden hour — paired with rotating copy about the act, the menu specials, and the harbour views.",
      "categoryInfo": "Sunday Live Music runs every Sunday from 3pm–6pm on the harbourside deck. Free entry, all ages until 8pm. A rotating roster of local acts plays acoustic and small-band sets. Sunday roast menu is on alongside ($28). Bookings recommended for groups of 6+.",
      "schedule": "Weekly — Thursdays" | "Monthly — first Sunday" | "3 posts in 2 weeks before [date]" | "Daily during [date range]",
      "postTime": "7pm",
      "hashtags": ["#livemusic", "#aucklandlivemusic"],
      "postLength": "Short" | "Medium" | "Long",
      "imageHints": ["live music", "guitar", "stage"]
    }
  ]
}

Rules for fields:
- icon: pick the closest match from the listed options
- iconColor: pick a colour that suits the category vibe; use variety across items
- schedule: use natural language like "Weekly — Thursdays", "Monthly — first Sunday", or for events "3 posts in 2 weeks before [specific date]" / "Daily during [specific dates]"
- postTime: short string like "7pm", "8am", "12pm"
- hashtags: 3-5 relevant tags, lowercase, with the # prefix
- postLength: Short (1-2 sentences), Medium (3-5 sentences), or Long (full caption)
- imageHints: 2-4 keywords describing what good imagery for this category would show
- For events, set type to "event" and use the event-style schedule format`

type AnalyseInput = {
  businessName: string
  homepageUrl: string
  text: string
  images?: string[]
  meta?: { title?: string; description?: string }
}

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  return new Anthropic({ apiKey: key })
}

function tryParseJson(raw: string): unknown {
  // Strip optional markdown code fences
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  }
  // Try to find the first balanced JSON object
  const firstBrace = text.indexOf('{')
  if (firstBrace > 0) text = text.slice(firstBrace)
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const VALID_ICONS = new Set([
  'music',
  'burger',
  'umbrella',
  'target',
  'coffee',
  'sparkle',
  'calendar',
  'gift',
  'star',
  'heart',
])
const VALID_COLORS = new Set(['yellow', 'pink', 'indigo', 'green', 'red', 'blue'])
const VALID_LENGTHS = new Set(['Short', 'Medium', 'Long'])

type CleanedItem = {
  id: string
  type: 'recurring' | 'event'
  title: string
  subtitle: string
  icon: string
  iconColor: string
  formatBlurb: string
  categoryInfo: string
  schedule: string
  postTime: string
  hashtags: string[]
  postLength: string
  imageHints: string[]
}

type CleanedItemWithUnsplash = CleanedItem & {
  unsplashImages: UnsplashImage[]
}

function clean(items: unknown): CleanedItem[] | null {
  if (!Array.isArray(items)) return null
  return items
    .map((it, idx) => {
      if (!it || typeof it !== 'object') return null
      const o = it as Record<string, unknown>
      const type: 'recurring' | 'event' = o.type === 'event' ? 'event' : 'recurring'
      const title = typeof o.title === 'string' ? o.title : ''
      const subtitle = typeof o.subtitle === 'string' ? o.subtitle : ''
      const formatBlurb = typeof o.formatBlurb === 'string' ? o.formatBlurb : ''
      const categoryInfo = typeof o.categoryInfo === 'string' ? o.categoryInfo : ''
      if (!title || !formatBlurb || !categoryInfo) return null
      const icon = VALID_ICONS.has(String(o.icon)) ? (o.icon as string) : 'sparkle'
      const iconColor = VALID_COLORS.has(String(o.iconColor))
        ? (o.iconColor as string)
        : 'indigo'
      const postLength = VALID_LENGTHS.has(String(o.postLength))
        ? (o.postLength as string)
        : 'Medium'
      const hashtags = Array.isArray(o.hashtags)
        ? (o.hashtags as unknown[])
            .filter((h): h is string => typeof h === 'string')
            .map((h) => (h.startsWith('#') ? h : `#${h}`))
            .slice(0, 8)
        : []
      const imageHints = Array.isArray(o.imageHints)
        ? (o.imageHints as unknown[])
            .filter((h): h is string => typeof h === 'string')
            .slice(0, 4)
        : []

      return {
        id: `item-${idx}`,
        type,
        title,
        subtitle,
        icon,
        iconColor,
        formatBlurb,
        categoryInfo,
        schedule: typeof o.schedule === 'string' ? o.schedule : 'Weekly',
        postTime: typeof o.postTime === 'string' ? o.postTime : '9am',
        hashtags,
        postLength,
        imageHints,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
}

/**
 * Fetch Unsplash images for every category in parallel. Each call is cached
 * (in-memory, 1-hour TTL) and falls back to [] silently on rate limit. This
 * runs after Claude returns; the extra latency is bounded by the slowest
 * Unsplash search (typically ~1s) since they go in parallel.
 */
async function attachUnsplashImages(
  items: CleanedItem[]
): Promise<CleanedItemWithUnsplash[]> {
  const lists = await Promise.all(
    items.map((it) => searchUnsplashForHints(it.imageHints, 6))
  )
  return items.map((it, i) => ({ ...it, unsplashImages: lists[i] }))
}

export async function POST(req: NextRequest) {
  let body: AnalyseInput
  try {
    body = (await req.json()) as AnalyseInput
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.text || body.text.length < 100) {
    return NextResponse.json(
      { error: 'Not enough content to analyse', insufficient: true },
      { status: 400 }
    )
  }

  const client = getClient()
  if (!client) {
    return NextResponse.json(
      { error: 'Anthropic API key not configured' },
      { status: 500 }
    )
  }

  const userMessage = [
    `Business name: ${body.businessName}`,
    `URL: ${body.homepageUrl}`,
    body.meta?.description ? `Meta description: ${body.meta.description}` : '',
    '',
    'Site content (truncated):',
    body.text.slice(0, 14000),
  ]
    .filter(Boolean)
    .join('\n')

  let response: Awaited<ReturnType<typeof client.messages.create>>
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 502 }
    )
  }

  const textBlock = response.content.find((b) => b.type === 'text')
  const raw = textBlock && 'text' in textBlock ? textBlock.text : ''
  if (!raw) {
    return NextResponse.json(
      { error: 'Empty response from analyser' },
      { status: 502 }
    )
  }

  const parsed = tryParseJson(raw)
  if (!parsed || typeof parsed !== 'object' || !('items' in parsed)) {
    return NextResponse.json(
      { error: 'Analyser returned malformed JSON', raw: raw.slice(0, 500) },
      { status: 502 }
    )
  }

  const cleaned = clean((parsed as { items: unknown }).items)
  if (!cleaned || cleaned.length === 0) {
    return NextResponse.json(
      { error: 'No valid items in analyser response' },
      { status: 502 }
    )
  }

  // Top each category up with Unsplash photos (cached, falls back to [] on
  // rate limit). No pre-selection — booth visitors pick images live with us
  // at the table.
  const enriched = await attachUnsplashImages(cleaned)

  return NextResponse.json({ items: enriched })
}
