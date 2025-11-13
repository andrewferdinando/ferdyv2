import OpenAI from 'openai'

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  return new OpenAI({ apiKey })
}

export async function analyzePostTone(allPosts: string[]): Promise<string | null> {
  if (!allPosts.length) {
    return null
  }

  const client = getClient()
  const joined = allPosts.join('\n\n')
  const prompt = `
You are analysing social media posts for a brand.

Here are some recent posts from Facebook and Instagram:

${joined}

In one short sentence (max 25 words), describe the overall tone of voice of these posts (e.g. friendly, professional, playful, humorous, educational, etc.).

Respond with just the tone description, no extra text.
  `.trim()

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You analyse social media content and summarise tone succinctly.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.4,
      max_tokens: 100,
    })

    const text = completion.choices[0]?.message?.content ?? ''
    return text.trim() || null
  } catch (error) {
    console.error('[post tone] OpenAI analysis failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return null
  }
}


