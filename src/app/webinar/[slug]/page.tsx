import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase-server'
import { WebinarPage } from './WebinarPage'
import { WebinarConfig } from '@/app/webinar/config'

interface Props {
  params: Promise<{ slug: string }>
}

async function getWebinarFromDb(slug: string): Promise<WebinarConfig | null> {
  const { data, error } = await supabaseAdmin
    .from('webinars')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !data) return null

  return {
    slug: data.slug,
    name: data.name,
    niche: data.niche,
    location: data.location,
    headline: data.headline,
    subHeadline: data.sub_headline,
    date: data.date_label,
    datetime: data.datetime,
    duration_minutes: data.duration_minutes,
    zoom_url: data.zoom_url,
    spots: data.spots,
    host: {
      name: data.host_name,
      bio: data.host_bio,
    },
    what_you_will_learn: data.what_you_will_learn,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const config = await getWebinarFromDb(slug)
  if (!config) return {}

  return {
    title: `${config.name} — Free Training | Ferdy`,
    description: config.subHeadline,
    openGraph: {
      title: config.headline,
      description: config.subHeadline,
      type: 'website',
    },
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const config = await getWebinarFromDb(slug)
  if (!config) notFound()

  return <WebinarPage config={config} />
}
