import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getWebinarBySlug, webinars } from '@/app/webinar/config'
import { WebinarPage } from './WebinarPage'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return webinars.map((w) => ({ slug: w.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const config = getWebinarBySlug(slug)
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
  const config = getWebinarBySlug(slug)
  if (!config) notFound()

  return <WebinarPage config={config} />
}
