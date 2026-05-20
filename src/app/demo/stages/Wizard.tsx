'use client'

import { useEffect } from 'react'
import LogoHeader from '../components/LogoHeader'
import WizardPagination from '../components/WizardPagination'
import type { ScopeItem } from '../data/types'

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
  items: ScopeItem[] // kept items only, in order
  categoryIndex: number // which kept item we're reviewing
  step: number // 0-indexed wizard step (across review + media for all categories)
  totalSteps: number
  onPrev: () => void
  onNext: () => void
}

/**
 * The "review" half of the per-category wizard pair. Shows the 6 input cards
 * (Schedule, Post time, Post length, Category details, Brand tone, Hashtags)
 * then a primary CTA that takes the user to the Media stage for the same
 * category. No media picker on this screen — that's its own page now.
 */
export default function Wizard({
  items,
  categoryIndex,
  step,
  totalSteps,
  onPrev,
  onNext,
}: Props) {
  const item = items[categoryIndex]

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [step])

  return (
    <div className="relative min-h-screen flex flex-col bg-gray-50">
      <LogoHeader />

      <div className="flex-1 flex flex-col items-center px-6 pt-32 pb-44">
        <div className="w-full max-w-3xl">
          {/* Header */}
          <p className="text-indigo-500 text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase mb-4">
            Category {categoryIndex + 1} of {items.length}
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
            Here’s how Ferdy would handle this category.
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
        </div>
      </div>

      <WizardPagination
        step={step}
        totalSteps={totalSteps}
        onPrev={onPrev}
        onNext={onNext}
        nextLabel="Pick photos"
      />
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
            {hint && <span className="text-xs text-gray-400 mt-0.5">{hint}</span>}
          </div>
        </div>
        <div className={stacked ? 'pl-9' : ''}>{children}</div>
      </div>
    </div>
  )
}
