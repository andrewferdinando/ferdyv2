'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import LogoHeader from '../components/LogoHeader'
import type { ScopeItem, ScopeResult } from '../data/types'

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
  selections: Record<string, number[]> // itemId → selected image indices
  onPrev: () => void
  onNext: () => void
  onJump: (idx: number) => void
  onToggleImage: (itemId: string, imageIdx: number) => void
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
  const visibleThumbs = selected.slice(0, 4)

  return (
    <div className="relative min-h-screen flex flex-col">
      <LogoHeader />

      <div className="flex-1 flex flex-col items-center px-6 pt-32 pb-40">
        <div className="w-full max-w-4xl">
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

          <p className="text-lg sm:text-xl text-gray-500 mb-12">
            Here’s what the 7 inputs look like filled in.
          </p>

          {/* 7-input grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            {/* 1 — Content */}
            <Row n={1} label="Content">
              <div className="flex items-center gap-1.5">
                {visibleThumbs.length === 0 && (
                  <span className="text-sm text-gray-400">No images selected</span>
                )}
                {visibleThumbs.map((imgIdx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={imgIdx}
                    src={result.images[imgIdx]}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                  />
                ))}
                {selected.length > 4 && (
                  <span className="text-xs text-gray-400 ml-1">+{selected.length - 4}</span>
                )}
              </div>
            </Row>

            {/* 2 — Brand tone */}
            <Row n={2} label="Brand tone">
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

            {/* 3 — Category information */}
            <Row n={3} label={item.type === 'event' ? 'Event information' : 'Category information'} stacked>
              <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
            </Row>

            {/* 4 — Hashtags */}
            <Row n={4} label="Hashtags" stacked>
              <div className="flex flex-wrap gap-1.5 justify-end md:justify-start md:flex-row">
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

            {/* 5 — Schedule */}
            <Row n={5} label={item.type === 'event' ? 'When' : 'Schedule'}>
              <span className="text-sm text-gray-700 font-medium">{item.schedule}</span>
            </Row>

            {/* 6 — Post time */}
            <Row n={6} label="Post time">
              <span className="text-sm text-gray-700 font-medium">{item.postTime}</span>
            </Row>

            {/* 7 — Post length */}
            <Row n={7} label="Post length">
              <span className="text-sm text-gray-700 font-medium">{item.postLength}</span>
            </Row>
          </div>

          {/* Image picker strip */}
          <div className="mt-12">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-xs font-semibold tracking-wider uppercase text-gray-400">
                Pick from your site
              </p>
              <p className="text-xs text-gray-400">{selected.length} selected</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
              {result.images.map((src, i) => {
                const isSelected = selected.includes(i)
                return (
                  <button
                    key={i}
                    onClick={() => onToggleImage(item.id, i)}
                    className={`shrink-0 relative w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                      isSelected ? 'border-indigo-500' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-indigo-500/15" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
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

function Row({
  n,
  label,
  children,
  stacked = false,
}: {
  n: number
  label: string
  children: React.ReactNode
  stacked?: boolean
}) {
  return (
    <div className="border-b border-gray-200 py-5 first:pt-0">
      <div
        className={`flex ${stacked ? 'flex-col gap-2' : 'items-center justify-between gap-4'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs font-medium flex items-center justify-center shrink-0">
            {n}
          </span>
          <span className="text-base font-semibold text-gray-950">{label}</span>
        </div>
        <div className={stacked ? 'pl-9' : ''}>{children}</div>
      </div>
    </div>
  )
}
