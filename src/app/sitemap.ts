import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://ferdy.io'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/contact`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/help/meta-2fa`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/data-deletion`,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ]

  // Dynamic webinar pages
  let webinarPages: MetadataRoute.Sitemap = []
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: webinars } = await supabase
      .from('webinars')
      .select('slug, updated_at')
      .eq('status', 'active')

    if (webinars) {
      webinarPages = webinars.map((w) => ({
        url: `${BASE_URL}/webinar/${w.slug}`,
        lastModified: w.updated_at ? new Date(w.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
    }
  } catch (error) {
    console.error('[sitemap] Failed to fetch webinars:', error)
  }

  return [...staticPages, ...webinarPages]
}
