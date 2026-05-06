import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4096

const SYSTEM_PROMPT = `You are analysing a small business website to identify content categories and events that fit Ferdy's social media automation model.

FERDY'S MODEL — TWO PATTERN TYPES:

1. RECURRING CATEGORIES
A recurring category is a rhythm of posts where the SAME media set and SAME core description can be reused over time.

The test: could the same photos/videos and the same description frame sit behind every post in this rhythm? If yes, it's a category. If the media or description would have to change every post, it's NOT a category.

VALID examples:
- "Sunday Live Music" — same vibe imagery, same offer copy, posted weekly
- "Burger Tuesday" — same burger shots, same weekly special
- "Private Dining Room" — same room photos, same booking pitch, posted regularly
- "Function Room Hire" — same venue shots, same hire info
- "Signature House Blend" (one specific coffee) — same product shots, same description
- "Coffee Tastings" — videos of people tasting at the cafe, same vibe and message
- "About Our Founder" — same founder imagery and brand story, monthly with light variation
- "Moso'oi Face Cream" (single product) — same product photography, same benefits copy
- "Our Skincare Range" if it's a tight 2–3 SKU set with shared brand imagery and a unified description

INVALID examples (reject these):
- "Weekly New Arrivals" — different product each time, media doesn't match
- "Daily Specials" — content varies day to day
- "Our Wines" if there are 30 wines — too broad, no single asset set fits
- "Customer Stories" — different customer each time
- Generic "About Us" or "Our Services" with no specific repeatable post hook

2. EVENTS
Date-anchored happenings with lead-up posts and (if it's a date range) during-event posts.

Examples:
- Christmas party on a specific date — 3 lead-up posts in the 2 weeks before
- Three-day festival — daily posts during plus 2 lead-up posts
- Seasonal product release — lead-up countdown
- Grand opening, end-of-month sale, anniversary

REQUIREMENTS:
- Return 3–6 items total. Better fewer strong items than many weak ones.
- If the business genuinely doesn't fit the recurring model (e.g. a multi-SKU retailer with 200 rotating products), return fewer recurring categories and lean on events, OR return an honest result with what does fit.
- Reject anything vague. Be specific.
- For each item, populate all fields below. Two text fields matter most:
  * formatBlurb — 2-3 sentences describing the post RHYTHM. What stays the same across every post in the series (imagery, core message), and what rotates (specific copy variations). This is shown to the business owner so they understand the post pattern.
  * categoryInfo — 4-6 sentences of FACTUAL DETAIL about the thing being posted about. Prices, ingredients, locations, dates, services, audience, what makes it distinctive. This is the brief that Ferdy's copy generator uses to write each individual post accurately. It MUST be facts pulled from (or reasonably inferred from) the website content. If you can't find specific facts, say what's known plausibly without inventing — but lean specific over vague.

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
  defaultImageIndices: number[]
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
        defaultImageIndices: [],
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
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

  // Pre-select first 4 images per item so the wizard isn't empty.
  const imageCount = body.images?.length ?? 0
  const defaultIndices = Array.from(
    { length: Math.min(4, imageCount) },
    (_, i) => i
  )
  const itemsWithDefaults = cleaned.map((it) => ({
    ...it,
    defaultImageIndices: [...defaultIndices],
  }))

  return NextResponse.json({ items: itemsWithDefaults })
}
