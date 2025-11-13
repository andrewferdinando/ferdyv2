import { supabaseAdmin } from '@/lib/supabase-server'
import { analyzePostTone } from './analyzePostTone'
import { fetchRecentPostsForSocialAccount } from '@/server/social/fetchMetaPosts'

type SocialAccountRow = {
  id: string
  brand_id: string
  provider: string
  account_id: string
  token_encrypted: string | null
  metadata: Record<string, unknown> | null
  status: string | null
}

type BrandPostInformationRow = {
  id: string
  brand_id: string
  fb_post_examples: string[] | null
  ig_post_examples: string[] | null
  post_tone: string | null
  avg_char_length: number | null
  avg_word_count: number | null
}

export async function updateBrandPostInformationFromSocialAccount(socialAccountId: string) {
  try {
    const { data: socialAccount, error: socialAccountError } = await supabaseAdmin
      .from('social_accounts')
      .select('id, brand_id, provider, account_id, token_encrypted, metadata, status')
      .eq('id', socialAccountId)
      .single<SocialAccountRow>()

    if (socialAccountError) {
      console.error('[brand post info] Failed to load social account', {
        socialAccountId,
        error: socialAccountError.message,
      })
      return
    }

    if (!socialAccount) {
      console.warn('[brand post info] Social account not found', { socialAccountId })
      return
    }

    if (!['facebook', 'instagram'].includes(socialAccount.provider)) {
      return
    }

    if (socialAccount.status && socialAccount.status !== 'connected') {
      console.log('[brand post info] Skipping social account due to status', {
        socialAccountId,
        status: socialAccount.status,
      })
      return
    }

    const posts = await fetchRecentPostsForSocialAccount(socialAccount)

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('brand_post_information')
      .select(
        'id, brand_id, fb_post_examples, ig_post_examples, post_tone, avg_char_length, avg_word_count',
      )
      .eq('brand_id', socialAccount.brand_id)
      .maybeSingle<BrandPostInformationRow>()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[brand post info] Failed to load existing record', {
        brandId: socialAccount.brand_id,
        error: existingError.message,
      })
      return
    }

    const existingFbPosts = existing?.fb_post_examples ?? []
    const existingIgPosts = existing?.ig_post_examples ?? []

    const nextFbPosts =
      socialAccount.provider === 'facebook'
        ? posts.length > 0
          ? posts
          : existingFbPosts
        : existingFbPosts

    const nextIgPosts =
      socialAccount.provider === 'instagram'
        ? posts.length > 0
          ? posts
          : existingIgPosts
        : existingIgPosts

    const allPosts = [...nextFbPosts, ...nextIgPosts].filter(
      (text): text is string => typeof text === 'string' && text.trim().length > 0,
    )

    let avgCharLength = existing?.avg_char_length ?? null
    let avgWordCount = existing?.avg_word_count ?? null
    let postTone = existing?.post_tone ?? null

    if (allPosts.length > 0) {
      const totalChars = allPosts.reduce((sum, text) => sum + text.length, 0)
      const totalWords = allPosts.reduce((sum, text) => {
        const words = text.trim().split(/\s+/).filter(Boolean)
        return sum + words.length
      }, 0)

      avgCharLength = totalChars / allPosts.length
      avgWordCount = totalWords / allPosts.length

      const tone = await analyzePostTone(allPosts)
      if (tone) {
        postTone = tone
      }
    }

    const upsertPayload = {
      brand_id: socialAccount.brand_id,
      fb_post_examples: nextFbPosts,
      ig_post_examples: nextIgPosts,
      avg_char_length: avgCharLength,
      avg_word_count: avgWordCount,
      post_tone: postTone,
      analysed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (existing?.id) {
      const { error: updateError } = await supabaseAdmin
        .from('brand_post_information')
        .update(upsertPayload)
        .eq('id', existing.id)

      if (updateError) {
        console.error('[brand post info] Failed to update record', {
          brandId: socialAccount.brand_id,
          error: updateError.message,
        })
      }
    } else {
      const insertPayload = {
        ...upsertPayload,
        created_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabaseAdmin
        .from('brand_post_information')
        .insert(insertPayload)

      if (insertError) {
        console.error('[brand post info] Failed to insert record', {
          brandId: socialAccount.brand_id,
          error: insertError.message,
        })
      }
    }
  } catch (error) {
    console.error('[brand post info] Unexpected error', {
      socialAccountId,
      error: error instanceof Error ? error.message : 'unknown',
    })
  }
}

