import AppLayout from '@/components/layout/AppLayout'
import { supabaseAdmin } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import PostInformationContent from './PostInformationContent'

type Brand = {
  id: string
  name: string
}

type BrandPostInformation = {
  fb_post_examples: string[] | null
  ig_post_examples: string[] | null
  post_tone: string | null
  avg_char_length: number | null
  avg_word_count: number | null
  analysed_at: string | null
  updated_at: string | null
}

export default async function PostInformationPage({ params }: { params: { brandId: string } }) {
  const { brandId } = params

  const { data: brand, error: brandError } = await supabaseAdmin
    .from('brands')
    .select('id, name')
    .eq('id', brandId)
    .single<Brand>()

  if (brandError || !brand) {
    notFound()
  }

  const { data: info } = await supabaseAdmin
    .from('brand_post_information')
    .select(
      'fb_post_examples, ig_post_examples, post_tone, avg_char_length, avg_word_count, analysed_at, updated_at',
    )
    .eq('brand_id', brandId)
    .maybeSingle<BrandPostInformation>()

  return (
    <AppLayout>
      <PostInformationContent brand={brand} info={info ?? null} />
    </AppLayout>
  )
}


