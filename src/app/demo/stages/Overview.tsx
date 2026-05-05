'use client'

import { ArrowRight, Check } from 'lucide-react'
import LogoHeader from '../components/LogoHeader'
import CategoryIcon from '../components/CategoryIcon'
import type { ScopeResult } from '../data/types'

type Props = {
  result: ScopeResult
  keptIds: Set<string>
  onToggle: (id: string) => void
  onNext: () => void
  onBack: () => void
}

export default function Overview({ result, keptIds, onToggle, onNext, onBack }: Props) {
  const keptCount = keptIds.size

  return (
    <div className="relative min-h-screen flex flex-col">
      <LogoHeader />

      <div className="flex-1 flex flex-col items-center px-6 pt-32 pb-32">
        <div className="w-full max-w-4xl">
          <p className="text-indigo-500 text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase mb-4 text-center">
            Here’s what we found
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-950 tracking-tight text-center leading-[1.1] mb-4">
            {result.businessName}
          </h1>
          <p className="text-base sm:text-lg text-gray-500 text-center mb-12 max-w-xl mx-auto">
            Tap a card to keep or remove it. We’ll set up the ones you keep.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.items.map((item) => {
              const kept = keptIds.has(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => onToggle(item.id)}
                  className={`group relative text-left bg-white border rounded-2xl p-6 transition-all ${
                    kept
                      ? 'border-indigo-300 shadow-md'
                      : 'border-gray-200 opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <CategoryIcon name={item.icon} color={item.iconColor} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded ${
                          item.type === 'event'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {item.type === 'event' ? 'Event' : 'Recurring'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-950 leading-tight mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500 leading-snug">{item.subtitle}</p>
                    </div>
                  </div>

                  {/* Toggle indicator */}
                  <div
                    className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      kept
                        ? 'bg-indigo-500 text-white'
                        : 'border-2 border-gray-300 bg-white'
                    }`}
                  >
                    {kept && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-gray-950">{keptCount}</span> of {result.items.length} kept
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="h-12 px-5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              onClick={onNext}
              disabled={keptCount === 0}
              className="h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-px transition disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
