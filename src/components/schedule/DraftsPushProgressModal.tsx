'use client'

import React from 'react'

interface DraftsPushProgressModalProps {
  estimatedMs?: number
  onClose?: () => void
}

function useProgressTimer(estimatedMs = 60000) {
  const [progress, setProgress] = React.useState(0) // 0..100
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    const start = Date.now()

    const id = setInterval(() => {
      const ms = Date.now() - start
      setElapsed(ms)

      // Ease to 90% over estimated time, then hold
      const t = Math.min(ms / estimatedMs, 1)
      const eased = 1 - Math.pow(1 - t, 2) // easeOutQuad
      const pct = Math.min(90, Math.floor(eased * 100))

      setProgress(pct)
    }, 300)

    return () => clearInterval(id)
  }, [estimatedMs])

  return { progress, setProgress, elapsed }
}

export default function DraftsPushProgressModal({ estimatedMs = 60000, onClose }: DraftsPushProgressModalProps) {
  const { progress, elapsed } = useProgressTimer(estimatedMs)

  const step = React.useMemo(() => {
    if (progress >= 70) return 4 // Finalising
    if (progress >= 40) return 3 // Generating copy
    if (progress >= 15) return 2 // Creating drafts
    return 1 // Queueing
  }, [progress])

  const showReassure = elapsed > 30000 // after 30s

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-1 text-gray-950">Generating your drafts…</h2>
        <p className="text-sm text-gray-500 mb-4">
          You can keep working — we&apos;ll let you know when it&apos;s done.
        </p>

        {/* Progress */}
        <div className="mb-4">
          <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden progress-indeterminate">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {showReassure && (
            <div className="mt-2 text-xs text-gray-500">
              Still generating… this usually takes about a minute.
            </div>
          )}
        </div>

        {/* Steps */}
        <ul className="space-y-2 mb-2 text-sm">
          <li className={`flex items-center gap-2 ${step >= 1 ? 'text-gray-800' : 'text-gray-400'}`}>
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-300'}`} />
            Queueing
          </li>
          <li className={`flex items-center gap-2 ${step >= 2 ? 'text-gray-800' : 'text-gray-400'}`}>
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}`} />
            Creating drafts
          </li>
          <li className={`flex items-center gap-2 ${step >= 3 ? 'text-gray-800' : 'text-gray-400'}`}>
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-300'}`} />
            Generating copy
          </li>
          <li className={`flex items-center gap-2 ${step >= 4 ? 'text-gray-800' : 'text-gray-400'}`}>
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${step >= 4 ? 'bg-indigo-600' : 'bg-gray-300'}`} />
            Finalising
          </li>
        </ul>
      </div>
    </div>
  )
}

