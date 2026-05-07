'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import LogoHeader from '../components/LogoHeader'
import type { ScopeItem, ScopeResult, UnsplashImage } from '../data/types'

function FacebookMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.91h-2.33V22c4.78-.76 8.43-4.92 8.43-9.94Z" />
    </svg>
  )
}

function InstagramMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

type Props = {
  result: ScopeResult
  items: ScopeItem[] // kept items only, in order
  index: number
  selections: Record<string, string[]> // itemId → selected image URLs
  onPrev: () => void
  onNext: () => void
  onJump: (idx: number) => void
  onToggleImage: (itemId: string, url: string) => void
  onFinish: () => void
}

export default function Wizard({
  result,
  items,
  index,
  selections,
  onPrev,
  onNext,
  onJump,
  onToggleImage,
  onFinish,
}: Props) {
  const item = items[index]
  const isLast = index === items.length - 1

  const selected = useMemo(() => selections[item.id] ?? [], [selections, item.id])

  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set())
  const markBroken = (url: string) =>
    setBrokenUrls((prev) => {
      if (prev.has(url)) return prev
      const next = new Set(prev)
      next.add(url)
      return next
    })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [index])

  const scrapedImages = result.images.filter((u) => !brokenUrls.has(u))
  const unsplashImages = (item.unsplashImages ?? []).filter(
    (img) => !brokenUrls.has(img.url)
  )
  const totalImages = scrapedImages.length + unsplashImages.length

  return (
    <div className="relative min-h-screen flex flex-col bg-gray-50">
      <LogoHeader />

      <div className="flex-1 flex flex-col items-center px-6 pt-32 pb-40">
        <div className="w-full max-w-3xl">
          {/* Header */}
          <p className="text-indigo-500 text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase mb-4">
            One {item.type === 'event' ? 'event' : 'category'}, zoomed in
          </p>

          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-950 tracking-tight leading-[1.05]">
              {item.title}
            </h1>
            {item.type === 'event' && (
              <span className="shrink-0 mt-2 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded bg-amber-100 text-amber-700">
                Event
              </span>
            )}
          </div>

          <p className="text-lg sm:text-xl text-gray-500 mb-10">
            Here’s what the 7 inputs look like filled in.
          </p>

          {/* Card 1 — When */}
          <Card title="When">
            <Row n={1} label={item.type === 'event' ? 'When' : 'Schedule'}>
              <span className="text-sm text-gray-700 font-medium">{item.schedule}</span>
            </Row>
            <Row n={2} label="Post time">
              <span className="text-sm text-gray-700 font-medium">{item.postTime}</span>
            </Row>
            <Row n={3} label="Post length" last>
              <span className="text-sm text-gray-700 font-medium">{item.postLength}</span>
            </Row>
          </Card>

          {/* Card 2 — What it's about */}
          <Card title="What it’s about">
            <Row
              n={4}
              label={item.type === 'event' ? 'Event details' : 'Category details'}
              hint="What Ferdy uses to write each post"
              stacked
              last
            >
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {item.categoryInfo}
              </p>
            </Row>
          </Card>

          {/* Card 3 — How it posts */}
          <Card title="How it posts">
            <Row n={5} label="Brand tone">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Connect to</span>
                <div className="w-7 h-7 rounded-md bg-[#1877F2] flex items-center justify-center text-white">
                  <FacebookMark className="w-4 h-4" />
                </div>
                <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-[#FED576] via-[#F47133] to-[#BC3081] flex items-center justify-center text-white">
                  <InstagramMark className="w-4 h-4" />
                </div>
              </div>
            </Row>
            <Row n={6} label="Hashtags" stacked last>
              <div className="flex flex-wrap gap-1.5">
                {item.hashtags.map((h) => (
                  <span
                    key={h}
                    className="text-xs font-medium text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-md"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </Row>
          </Card>

          {/* Card 4 — Media */}
          <Card title="Media">
            <Row n={7} label="Select content" hint="Pick from below" stacked last>
              <div className="flex items-center gap-1.5 flex-wrap">
                {selected.length === 0 && (
                  <span className="text-sm text-gray-400">No images selected yet</span>
                )}
                {selected.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                    onError={() => markBroken(url)}
                  />
                ))}
              </div>
            </Row>
          </Card>

          {/* Picker — section 1: from the customer's website */}
          <PickerSection
            title="From your site"
            count={scrapedImages.length}
            selectedCount={selected.length}
            tone="indigo"
            empty={
              scrapedImages.length === 0
                ? "We couldn't pull usable photos from this site. Use stock photos below or add your own at setup."
                : null
            }
          >
            {scrapedImages.map((url) => (
              <ScrapedThumb
                key={url}
                url={url}
                isSelected={selected.includes(url)}
                onClick={() => onToggleImage(item.id, url)}
                onError={() => markBroken(url)}
              />
            ))}
          </PickerSection>

          {/* Picker — section 2: Unsplash supplementation */}
          <PickerSection
            title="Stock photos via Unsplash"
            count={unsplashImages.length}
            tone="amber"
            empty={
              unsplashImages.length === 0
                ? 'No matching stock photos right now.'
                : null
            }
          >
            {unsplashImages.map((img) => (
              <UnsplashThumb
                key={img.url}
                img={img}
                isSelected={selected.includes(img.url)}
                onClick={() => onToggleImage(item.id, img.url)}
                onError={() => markBroken(img.url)}
              />
            ))}
          </PickerSection>

          {totalImages === 0 && (
            <p className="mt-6 text-sm text-gray-400 text-center">
              We’ll pick images live with you at setup if you’d rather.
            </p>
          )}
        </div>
      </div>

      {/* Bottom pagination pill */}
      <div className="fixed bottom-6 left-0 right-0 flex items-center justify-center pointer-events-none px-6">
        <div className="pointer-events-auto bg-white border border-gray-200 rounded-full shadow-md flex items-center px-2 py-1.5 gap-1">
          <button
            onClick={onPrev}
            disabled={index === 0}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 px-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => onJump(i)}
                className={`rounded-full transition-all ${
                  i === index
                    ? 'bg-indigo-500 w-6 h-2'
                    : 'bg-gray-300 hover:bg-gray-400 w-2 h-2'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          <span className="text-xs font-medium text-gray-500 px-2 tabular-nums">
            {index + 1} / {items.length}
          </span>

          {isLast ? (
            <button
              onClick={onFinish}
              className="ml-1 h-9 px-4 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-semibold text-sm hover:shadow-md transition flex items-center gap-1.5"
            >
              Done
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onNext}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400 mb-3">
        {title}
      </p>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  )
}

function Row({
  n,
  label,
  hint,
  children,
  stacked = false,
  last = false,
}: {
  n: number
  label: string
  hint?: string
  children: React.ReactNode
  stacked?: boolean
  last?: boolean
}) {
  // Use uniform vertical padding (no first:pt-0) so paired rows always align.
  return (
    <div className={`py-4 ${last ? 'last:pb-0' : ''} first:pt-0`}>
      <div
        className={`flex ${stacked ? 'flex-col gap-2' : 'items-center justify-between gap-4'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs font-medium flex items-center justify-center shrink-0">
            {n}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-base font-semibold text-gray-950">{label}</span>
            {hint && (
              <span className="text-xs text-gray-400 mt-0.5">{hint}</span>
            )}
          </div>
        </div>
        <div className={stacked ? 'pl-9' : ''}>{children}</div>
      </div>
    </div>
  )
}

function PickerSection({
  title,
  count,
  selectedCount,
  tone,
  empty,
  children,
}: {
  title: string
  count: number
  selectedCount?: number
  tone: 'indigo' | 'amber'
  empty?: string | null
  children: React.ReactNode
}) {
  const dotColor = tone === 'indigo' ? 'bg-indigo-500' : 'bg-amber-500'

  return (
    <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-gray-500 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          {title}
          <span className="font-normal normal-case tracking-normal text-gray-300">
            ({count})
          </span>
        </p>
        {selectedCount != null && (
          <p className="text-xs text-gray-400">{selectedCount} selected</p>
        )}
      </div>
      {empty ? (
        <p className="text-sm text-gray-400 italic">{empty}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 sm:-mx-6 sm:px-6">
          {children}
        </div>
      )}
    </div>
  )
}

function ScrapedThumb({
  url,
  isSelected,
  onClick,
  onError,
}: {
  url: string
  isSelected: boolean
  onClick: () => void
  onError: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 relative w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden border-2 transition ${
        isSelected ? 'border-indigo-500' : 'border-transparent hover:border-gray-300'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="w-full h-full object-cover"
        onError={onError}
      />
      {isSelected && <div className="absolute inset-0 bg-indigo-500/15" />}
    </button>
  )
}

function UnsplashThumb({
  img,
  isSelected,
  onClick,
  onError,
}: {
  img: UnsplashImage
  isSelected: boolean
  onClick: () => void
  onError: () => void
}) {
  return (
    <div className="shrink-0 flex flex-col items-start gap-1.5 w-32 sm:w-40">
      <button
        onClick={onClick}
        className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden border-2 transition ${
          isSelected ? 'border-indigo-500' : 'border-transparent hover:border-gray-300'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.thumbUrl || img.url}
          alt={`Photo by ${img.photographerName}`}
          className="w-full h-full object-cover"
          onError={onError}
        />
        <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-500 text-white shadow-sm">
          Stock
        </span>
        {isSelected && <div className="absolute inset-0 bg-indigo-500/15" />}
      </button>
      <a
        href={img.photographerUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="text-[10px] text-gray-400 hover:text-gray-600 truncate max-w-full px-1"
        onClick={(e) => e.stopPropagation()}
      >
        by {img.photographerName}
      </a>
    </div>
  )
}
