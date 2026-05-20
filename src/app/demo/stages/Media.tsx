'use client'

import { useEffect, useState } from 'react'
import LogoHeader from '../components/LogoHeader'
import WizardPagination from '../components/WizardPagination'
import type { ScopeItem, ScopeResult, UnsplashImage } from '../data/types'

const MAX_SELECTIONS = 2

type Props = {
  result: ScopeResult
  items: ScopeItem[] // kept items only
  categoryIndex: number // which kept item we're picking media for
  step: number // 0-indexed wizard step (across review + media for all categories)
  totalSteps: number
  selections: Record<string, string[]>
  onToggleImage: (itemId: string, url: string) => void
  onPrev: () => void
  onNext: () => void
}

export default function Media({
  result,
  items,
  categoryIndex,
  step,
  totalSteps,
  selections,
  onToggleImage,
  onPrev,
  onNext,
}: Props) {
  const item = items[categoryIndex]
  const isLastStep = step === totalSteps - 1

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
  }, [step])

  const selected = selections[item.id] ?? []
  const scrapedImages = result.images.filter((u) => !brokenUrls.has(u))
  const unsplashImages = (item.unsplashImages ?? []).filter(
    (img) => !brokenUrls.has(img.url)
  )
  const totalAvailable = scrapedImages.length + unsplashImages.length

  // Cap at 2 — additional toggles to ADD are silently ignored when full.
  // Deselecting always works.
  const handleClick = (url: string) => {
    const alreadySelected = selected.includes(url)
    if (!alreadySelected && selected.length >= MAX_SELECTIONS) return
    onToggleImage(item.id, url)
  }

  const reachedMax = selected.length >= MAX_SELECTIONS
  const meetsMin = selected.length >= Math.min(MAX_SELECTIONS, totalAvailable)
  const helper = meetsMin
    ? undefined
    : `Pick ${MAX_SELECTIONS - selected.length} more to continue`

  return (
    <div className="relative min-h-screen flex flex-col bg-gray-50">
      <LogoHeader />

      <div className="flex-1 flex flex-col items-center px-6 pt-32 pb-44">
        <div className="w-full max-w-3xl">
          {/* Header */}
          <p className="text-indigo-500 text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase mb-4">
            Category {categoryIndex + 1} of {items.length} · Photos
          </p>

          <h1 className="text-4xl sm:text-5xl font-bold text-gray-950 tracking-tight leading-[1.05] mb-3">
            Pick {MAX_SELECTIONS} photos for {item.title}.
          </h1>

          <p className="text-base sm:text-lg text-gray-500 mb-2">
            Pulled from your site, with Unsplash stock to top up.
          </p>

          <p className="text-sm text-gray-400 mb-10">
            {selected.length} of {MAX_SELECTIONS} selected
          </p>

          {/* Selected preview */}
          {selected.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-8 shadow-sm">
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400 mb-3">
                Your picks
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {selected.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                    onError={() => markBroken(url)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Picker — From your site */}
          <PickerSection
            title="From your site"
            count={scrapedImages.length}
            tone="indigo"
            empty={
              scrapedImages.length === 0
                ? "We couldn't pull usable photos from this site. Use the stock photos below."
                : null
            }
          >
            {scrapedImages.map((url) => (
              <ScrapedThumb
                key={url}
                url={url}
                isSelected={selected.includes(url)}
                disabled={!selected.includes(url) && reachedMax}
                onClick={() => handleClick(url)}
                onError={() => markBroken(url)}
              />
            ))}
          </PickerSection>

          {/* Picker — Stock */}
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
                disabled={!selected.includes(img.url) && reachedMax}
                onClick={() => handleClick(img.url)}
                onError={() => markBroken(img.url)}
              />
            ))}
          </PickerSection>

          {totalAvailable === 0 && (
            <p className="mt-6 text-sm text-gray-400 text-center">
              No photos available for this category. You can continue and add your own at setup.
            </p>
          )}

          {/* Subtle videos note */}
          <p className="mt-8 text-xs text-gray-400 text-center italic">
            In Ferdy, you can also add videos to any category.
          </p>
        </div>
      </div>

      <WizardPagination
        step={step}
        totalSteps={totalSteps}
        onPrev={onPrev}
        onNext={onNext}
        nextLabel={isLastStep ? 'See your posts' : 'Continue'}
        nextDisabled={totalAvailable > 0 && !meetsMin}
        helper={helper}
      />
    </div>
  )
}

function PickerSection({
  title,
  count,
  tone,
  empty,
  children,
}: {
  title: string
  count: number
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
  disabled,
  onClick,
  onError,
}: {
  url: string
  isSelected: boolean
  disabled: boolean
  onClick: () => void
  onError: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 relative w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden border-2 transition ${
        isSelected
          ? 'border-indigo-500'
          : disabled
          ? 'border-transparent opacity-40 cursor-not-allowed'
          : 'border-transparent hover:border-gray-300'
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
  disabled,
  onClick,
  onError,
}: {
  img: UnsplashImage
  isSelected: boolean
  disabled: boolean
  onClick: () => void
  onError: () => void
}) {
  return (
    <div className="shrink-0 flex flex-col items-start gap-1.5 w-32 sm:w-40">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden border-2 transition ${
          isSelected
            ? 'border-indigo-500'
            : disabled
            ? 'border-transparent opacity-40 cursor-not-allowed'
            : 'border-transparent hover:border-gray-300'
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
