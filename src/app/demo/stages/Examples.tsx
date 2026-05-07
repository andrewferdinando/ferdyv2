'use client'

import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import LogoHeader from '../components/LogoHeader'
import PostCard from '../components/PostCard'
import type { ScopeItem, ScopeResult } from '../data/types'

type Props = {
  result: ScopeResult
  keptItems: ScopeItem[]
  selections: Record<string, string[]> // itemId -> selected URLs
  // Map of itemId -> array of generated captions for that category. May be
  // partially populated if generation is still in flight.
  captionsByItem: Record<string, string[]>
  loading: boolean
  error: string | null
  onContinue: () => void
}

export default function Examples({
  result,
  keptItems,
  selections,
  captionsByItem,
  loading,
  error,
  onContinue,
}: Props) {
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set())
  const markBroken = (url: string) =>
    setBrokenUrls((prev) => {
      if (prev.has(url)) return prev
      const next = new Set(prev)
      next.add(url)
      return next
    })

  // Reset scroll on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [])

  // Build the flat list of post cards. Two per item; pair captions with
  // selected images by index. If an image slot is empty, fall back to the
  // other selected one — placeholder if neither.
  const cards = keptItems.flatMap((item) => {
    const captions = captionsByItem[item.id] ?? []
    const selectedUrls = (selections[item.id] ?? []).filter(
      (u) => !brokenUrls.has(u)
    )
    return captions.slice(0, 2).map((caption, i) => {
      const imageUrl = selectedUrls[i] ?? selectedUrls[0] ?? undefined
      return {
        key: `${item.id}-${i}`,
        item,
        caption,
        imageUrl,
      }
    })
  })

  return (
    <div className="relative min-h-screen flex flex-col bg-gray-50">
      <LogoHeader />

      <div className="flex-1 flex flex-col items-center px-6 pt-32 pb-32">
        <div className="w-full max-w-3xl">
          <p className="text-indigo-500 text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase mb-4 text-center">
            Your posts, written
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-950 tracking-tight text-center leading-[1.05] mb-4">
            Here’s what Ferdy would post.
          </h1>
          <p className="text-base sm:text-lg text-gray-500 text-center max-w-xl mx-auto mb-12">
            Two example Instagram posts per category, written from the briefs you
            saw. Same brief, different angle each time — that’s the rhythm.
          </p>

          {loading && cards.length === 0 && (
            <div className="text-center py-16">
              <div className="mx-auto mb-6 w-12 h-12 flex items-center justify-center">
                <span className="absolute w-12 h-12 rounded-full bg-indigo-500 opacity-20 animate-ping" />
                <span className="relative w-3 h-3 rounded-full bg-indigo-500" />
              </div>
              <p className="text-sm text-gray-500">Drafting your posts…</p>
            </div>
          )}

          {error && cards.length === 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5 text-center">
              <p className="text-sm font-medium mb-1">Couldn’t draft examples</p>
              <p className="text-xs opacity-80">{error}</p>
              <button
                type="button"
                onClick={onContinue}
                className="mt-4 text-xs underline underline-offset-4 hover:no-underline"
              >
                Skip and continue
              </button>
            </div>
          )}

          {cards.length > 0 && (
            <div className="space-y-8">
              {cards.map((c) => (
                <PostCard
                  key={c.key}
                  businessName={result.businessName}
                  homepageUrl={result.homepageUrl}
                  categoryIcon={c.item.icon}
                  categoryIconColor={c.item.iconColor}
                  imageUrl={c.imageUrl}
                  caption={c.caption}
                  hashtags={c.item.hashtags}
                  onImageError={() => c.imageUrl && markBroken(c.imageUrl)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500 hidden sm:block">
            Like what you see?
          </p>
          <button
            type="button"
            onClick={onContinue}
            className="ml-auto h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-px transition flex items-center gap-2"
          >
            Worth a chat?
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
