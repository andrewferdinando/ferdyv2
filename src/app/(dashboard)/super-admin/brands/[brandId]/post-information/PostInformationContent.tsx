'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

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

type Props = {
  brand: Brand
  info: BrandPostInformation | null
}

function formatNumber(value: number | null, fractionDigits = 1) {
  if (value === null || Number.isNaN(value)) return null
  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  })
}

function formatDate(value: string | null) {
  if (!value) return null
  try {
    const date = new Date(value)
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return null
  }
}

function PostList({ posts, emptyMessage }: { posts: string[]; emptyMessage: string }) {
  if (!posts.length) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>
  }

  return (
    <ul className="space-y-3">
      {posts.map((post, index) => (
        <li key={index} className="rounded-lg border border-gray-200 bg-white/60 p-3 text-sm text-gray-700 shadow-sm">
          <p className="line-clamp-4 whitespace-pre-line">{post}</p>
        </li>
      ))}
    </ul>
  )
}

export default function PostInformationContent({ brand, info }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fbPosts = info?.fb_post_examples ?? []
  const igPosts = info?.ig_post_examples ?? []
  const allPosts = useMemo(
    () => [...fbPosts, ...igPosts].filter((text) => text && text.trim().length > 0),
    [fbPosts, igPosts],
  )

  const averageChars = info?.avg_char_length ?? null
  const averageWords = info?.avg_word_count ?? null
  const analysedAt = formatDate(info?.analysed_at ?? info?.updated_at ?? null)

  const handleReanalyse = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        throw new Error('You must be signed in to re-analyse posts.')
      }

      const response = await fetch(
        `/api/super-admin/brands/${brand.id}/post-information/reanalyze`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Re-analysis failed. Please try again.')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-analysis failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-6 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Post Information</p>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl lg:text-[32px]">
              {brand.name}
            </h1>
            {analysedAt && (
              <p className="mt-1 text-sm text-gray-500">Last analysed {analysedAt}</p>
            )}
          </div>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={handleReanalyse}
              disabled={isLoading}
              className="inline-flex items-center rounded-lg border border-indigo-600 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
            >
              {isLoading ? 'Re-analysing…' : 'Re-analyse posts'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-10">
        {!info && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-gray-500">
            No post information available yet. Connect Facebook or Instagram to generate insights.
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Facebook Post Examples</h2>
            <p className="mt-1 text-sm text-gray-500">
              Showing up to the last 10 Facebook posts.
            </p>
            <div className="mt-4">
              <PostList posts={fbPosts} emptyMessage="No Facebook posts found yet." />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Instagram Post Examples</h2>
            <p className="mt-1 text-sm text-gray-500">
              Showing up to the last 10 Instagram captions.
            </p>
            <div className="mt-4">
              <PostList posts={igPosts} emptyMessage="No Instagram posts found yet." />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Post Tone</h2>
            <p className="mt-1 text-sm text-gray-500">
              Generated using recent Facebook and Instagram posts.
            </p>
            <div className="mt-4">
              {info?.post_tone ? (
                <p className="text-base font-medium text-gray-900">{info.post_tone}</p>
              ) : (
                <p className="text-sm text-gray-500">Not analysed yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Post Character Length</h2>
            <p className="mt-1 text-sm text-gray-500">
              Average length based on the most recent posts across platforms.
            </p>
            <div className="mt-4 space-y-2">
              {averageChars !== null && averageWords !== null ? (
                <>
                  <p className="text-sm text-gray-600">
                    Average length: <span className="font-semibold text-gray-900">{formatNumber(averageChars)}</span>{' '}
                    characters, <span className="font-semibold text-gray-900">{formatNumber(averageWords)}</span> words
                  </p>
                  <p className="text-sm text-gray-500">
                    Based on {allPosts.length} {allPosts.length === 1 ? 'post' : 'posts'}.
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">Not enough posts to analyse yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


