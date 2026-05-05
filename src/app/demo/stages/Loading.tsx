'use client'

import { useEffect, useState } from 'react'
import LogoHeader from '../components/LogoHeader'

const STEPS = [
  'Reading your site…',
  'Looking for patterns…',
  'Gathering visuals…',
  'Mapping rhythms…',
  'Drafting your categories…',
]

type Props = {
  // Total minimum duration in ms. The flow can wait longer if real work is still in flight.
  minDurationMs?: number
  onComplete: () => void
  ready: boolean
}

export default function Loading({ minDurationMs = 12000, onComplete, ready }: Props) {
  const [stepIdx, setStepIdx] = useState(0)
  const [minElapsed, setMinElapsed] = useState(false)

  // Step messages cycle every ~2.4s, hold the last step indefinitely.
  useEffect(() => {
    const interval = Math.floor(minDurationMs / STEPS.length)
    const id = setInterval(() => {
      setStepIdx((i) => (i < STEPS.length - 1 ? i + 1 : i))
    }, interval)
    return () => clearInterval(id)
  }, [minDurationMs])

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), minDurationMs)
    return () => clearTimeout(t)
  }, [minDurationMs])

  useEffect(() => {
    if (minElapsed && ready) onComplete()
  }, [minElapsed, ready, onComplete])

  return (
    <div className="relative min-h-screen flex flex-col">
      <LogoHeader />

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-xl text-center">
          {/* Pulsing dot */}
          <div className="mx-auto mb-10 relative w-16 h-16 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-indigo-500 opacity-20 animate-ping" />
            <span className="absolute inset-2 rounded-full bg-indigo-500 opacity-30 animate-pulse" />
            <span className="relative w-5 h-5 rounded-full bg-indigo-500" />
          </div>

          <div className="relative h-12 sm:h-14 flex items-center justify-center mb-10">
            {STEPS.map((s, i) => (
              <p
                key={s}
                className={`absolute inset-0 flex items-center justify-center text-xl sm:text-2xl font-semibold text-gray-950 transition-opacity duration-500 ${
                  i === stepIdx ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {s}
              </p>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mx-auto max-w-sm h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 scope-fill"
              style={{ animationDuration: `${minDurationMs}ms` }}
            />
          </div>

          <p className="text-sm text-gray-400 mt-8">This usually takes about 15 seconds.</p>
        </div>
      </div>
    </div>
  )
}
