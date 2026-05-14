import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
// 90s headroom — booth observed 504 timeouts on category-heavy sites
// (6 categories × 2 long posts = ~3000+ output tokens, can run 50-80s).
export const maxDuration = 90

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4096
const POSTS_PER_CATEGORY = 2

const SYSTEM_PROMPT = `You write Instagram captions for small business posts.

For each category in the input, write ${POSTS_PER_CATEGORY} different example Instagram posts that demonstrate the rhythm. Same brief, same media pool — but each post should sound fresh, not formulaic. Show variety in angle: one might lean into a customer benefit, another into the product/service detail, another into a story or moment. Pull facts from the categoryInfo field.

CAPTION LENGTH RULES — use the postLength field:
- Short: 1-2 sentences. Punchy. Single hook.
- Medium: 3-5 sentences. A hook + a couple of details + a soft CTA.
- Long: 6-10 sentences. A story or a deeper explanation, then specifics, then CTA.

STYLE:
- Sound like a real small business writing for Instagram, not a marketing agency.
- Conversational, warm, not over-polished.
- Use Australian/New Zealand spelling (favourite, organised, colour).
- No "🔥💯" emoji-stuffing. One or two well-placed emojis is fine; none is also fine.
- No corporate words like "synergy", "leverage", "elevate", "curated experience".
- Avoid clichés like "we're so excited to share…".
- Don't repeat the brand name in every caption.
- For Long posts especially, write like a human, not an AI — vary sentence length, use specifics.

OUTPUT FORMAT — strict JSON, no preamble, no markdown fences:

{
  "posts": [
    {
      "categoryId": "the id of the category",
      "caption": "the caption text — no hashtags inline, those go in the hashtags field"
    },
    ...
  ]
}

Generate exactly ${POSTS_PER_CATEGORY} posts per category. Order doesn't matter.`

type GeneratePostsInput = {
  businessName: string
  items: Array<{
    id: string
    title: string
    categoryInfo: string
    postLength: string
    hashtags: string[]
  }>
}

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  return new Anthropic({ apiKey: key })
}

function tryParseJson(raw: string): unknown {
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  }
  const firstBrace = text.indexOf('{')
  if (firstBrace > 0) text = text.slice(firstBrace)
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  let body: GeneratePostsInput
  try {
    body = (await req.json()) as GeneratePostsInput
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'No items to generate for' }, { status: 400 })
  }

  const client = getClient()
  if (!client) {
    return NextResponse.json(
      { error: 'Anthropic API key not configured' },
      { status: 500 }
    )
  }

  const userMessage = [
    `Business: ${body.businessName}`,
    '',
    'Categories:',
    ...body.items.map((it, i) =>
      [
        `${i + 1}. ${it.title}`,
        `   id: ${it.id}`,
        `   length: ${it.postLength}`,
        `   brief: ${it.categoryInfo}`,
      ].join('\n')
    ),
  ].join('\n')

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
      { error: `Generation failed: ${message}` },
      { status: 502 }
    )
  }

  const textBlock = response.content.find((b) => b.type === 'text')
  const raw = textBlock && 'text' in textBlock ? textBlock.text : ''
  if (!raw) {
    return NextResponse.json(
      { error: 'Empty response from generator' },
      { status: 502 }
    )
  }

  const parsed = tryParseJson(raw)
  if (!parsed || typeof parsed !== 'object' || !('posts' in parsed)) {
    return NextResponse.json(
      { error: 'Generator returned malformed JSON', raw: raw.slice(0, 500) },
      { status: 502 }
    )
  }

  const cleaned = cleanPosts((parsed as { posts: unknown }).posts, body.items)
  if (cleaned.length === 0) {
    return NextResponse.json(
      { error: 'No valid posts in generator response' },
      { status: 502 }
    )
  }

  return NextResponse.json({ posts: cleaned })
}

type CleanedPost = {
  categoryId: string
  caption: string
}

function cleanPosts(
  posts: unknown,
  validItems: Array<{ id: string }>
): CleanedPost[] {
  if (!Array.isArray(posts)) return []
  const validIds = new Set(validItems.map((i) => i.id))
  return posts
    .map((p) => {
      if (!p || typeof p !== 'object') return null
      const o = p as Record<string, unknown>
      const categoryId = typeof o.categoryId === 'string' ? o.categoryId : ''
      const caption = typeof o.caption === 'string' ? o.caption.trim() : ''
      if (!categoryId || !caption || !validIds.has(categoryId)) return null
      return { categoryId, caption }
    })
    .filter((p): p is CleanedPost => p !== null)
}
