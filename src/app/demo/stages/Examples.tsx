'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import PostCard from '../components/PostCard'
import { formatDateEyebrow, nextDatesFor } from '../lib/scheduleDates'
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

type FeedCard = {
  key: string
  item: ScopeItem
  caption: string
  imageUrl?: string
  date: Date
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

  // Reset scroll on mount.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [])

  // Build chronologically-sorted feed: 2 posts per kept item, each paired with
  // its computed publish date, then sorted ascending so the prospect sees the
  // calendar starting from today.
  //
  // Image-fallback chain (ensures every category has at least 2 distinct
  // images at the booth, even if Andrew only picked 0 or 1 in the wizard):
  //   1. user's selections for this category
  //   2. category's Unsplash photos
  //   3. site-wide scraped photos
  //   → take first 2 unique URLs
  const cards = useMemo<FeedCard[]>(() => {
    const today = new Date()
    const flat: FeedCard[] = []
    for (const item of keptItems) {
      const captions = captionsByItem[item.id] ?? []
      const selectedUrls = (selections[item.id] ?? []).filter(
        (u) => !brokenUrls.has(u)
      )
      const unsplashUrls = (item.unsplashImages ?? [])
        .map((img) => img.url)
        .filter((u) => !brokenUrls.has(u))
      const scrapedUrls = result.images.filter((u) => !brokenUrls.has(u))

      // Build candidate pool with priority + dedup.
      const pool: string[] = []
      const seen = new Set<string>()
      for (const url of [...selectedUrls, ...unsplashUrls, ...scrapedUrls]) {
        if (seen.has(url)) continue
        seen.add(url)
        pool.push(url)
        if (pool.length >= 2) break
      }

      const dates = nextDatesFor(item.schedule, captions.length || 2, today)
      captions.slice(0, 2).forEach((caption, i) => {
        // Prefer pool[i], fall back to pool[0] if pool has only 1 image,
        // undefined → PostCard renders the "Image to come" placeholder.
        const imageUrl = pool[i] ?? pool[0] ?? undefined
        flat.push({
          key: `${item.id}-${i}`,
          item,
          caption,
          imageUrl,
          date: dates[i] ?? dates[0] ?? today,
        })
      })
    }
    flat.sort((a, b) => a.date.getTime() - b.date.getTime())
    return flat
  }, [keptItems, captionsByItem, selections, brokenUrls, result.images])

  return (
    <div className="relative min-h-screen flex flex-col bg-gray-50">

      <div className="flex-1 flex flex-col items-center px-6 pt-32 pb-32">
        <div className="w-full max-w-3xl">
          <p className="text-indigo-500 text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase mb-4 text-center">
            Your posts, written
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-950 tracking-tight text-center leading-[1.05] mb-4">
            Here’s what Ferdy would post{' '}
            <span className="text-gray-400 font-normal">(once approved)</span>.
          </h1>
          <p className="text-base sm:text-lg text-gray-500 text-center max-w-xl mx-auto mb-12">
            Two example Instagram posts per category, in the order they’d
            publish. Same brief, different angle each time — that’s the rhythm.
          </p>

          {loading && cards.length === 0 && (
            <div className="text-center py-16">
              <div className="relative mx-auto mb-6 w-12 h-12 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-indigo-500 opacity-20 animate-ping" />
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
            <div className="space-y-10">
              {cards.map((c) => (
                <div key={c.key}>
                  <div className="text-center mb-3">
                    <p className="text-indigo-500 text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase">
                      {formatDateEyebrow(c.date)} · {c.item.postTime}
                    </p>
                    <p className="text-sm font-semibold text-gray-700 mt-1">
                      {c.item.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.item.schedule}
                    </p>
                  </div>
                  <PostCard
                    businessName={result.businessName}
                    homepageUrl={result.homepageUrl}
                    categoryIcon={c.item.icon}
                    categoryIconColor={c.item.iconColor}
                    imageUrl={c.imageUrl}
                    caption={c.caption}
                    hashtags={c.item.hashtags}
                    onImageError={() => c.imageUrl && markBroken(c.imageUrl)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onContinue}
            className="h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-px transition flex items-center gap-2"
          >
            Worth a chat?
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
