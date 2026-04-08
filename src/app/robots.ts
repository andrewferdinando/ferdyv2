import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/auth/',
          '/onboarding/',
          '/brands/',
          '/account/',
          '/super-admin/',
          '/api/',
          '/archive/',
          '/schedule',
        ],
      },
      // Explicitly allow AI crawlers
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'Claude-Web', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
      { userAgent: 'cohere-ai', allow: '/' },
    ],
    sitemap: 'https://ferdy.io/sitemap.xml',
  }
}
