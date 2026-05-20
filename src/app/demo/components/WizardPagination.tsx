'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  step: number // 0-indexed
  totalSteps: number
  onPrev: () => void
  onNext: () => void
  /** Label shown on the primary right-side button. Required — this is always a CTA, never just an arrow. */
  nextLabel: string
  /** When true, the primary button is greyed out (e.g. user hasn't met the per-step requirement yet). */
  nextDisabled?: boolean
  /** Optional helper text shown above the pill — e.g. "Pick 2 to continue". */
  helper?: string
}

/**
 * Shared bottom-pill pagination for the wizard + media stages. Shows prev
 * arrow + step dots + counter + primary CTA button. The CTA label varies per
 * stage ("Pick photos for this category →", "Continue →", "Done →") so the
 * user always sees the next action clearly named.
 */
export default function WizardPagination({
  step,
  totalSteps,
  onPrev,
  onNext,
  nextLabel,
  nextDisabled,
  helper,
}: Props) {
  return (
    <div className="fixed bottom-6 left-0 right-0 flex flex-col items-center justify-center pointer-events-none px-6 gap-2">
      {helper && (
        <p className="pointer-events-none text-xs text-gray-500 bg-white/90 backdrop-blur px-3 py-1 rounded-full border border-gray-200">
          {helper}
        </p>
      )}
      <div className="pointer-events-auto bg-white border border-gray-200 rounded-full shadow-md flex items-center px-2 py-1.5 gap-1">
        <button
          onClick={onPrev}
          disabled={step === 0}
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 px-2" aria-hidden>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all ${
                i === step ? 'bg-indigo-500 w-6 h-2' : 'bg-gray-300 w-2 h-2'
              }`}
            />
          ))}
        </div>

        <span className="text-xs font-medium text-gray-500 px-2 tabular-nums">
          {step + 1} / {totalSteps}
        </span>

        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="ml-1 h-9 px-4 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-semibold text-sm hover:shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {nextLabel}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
