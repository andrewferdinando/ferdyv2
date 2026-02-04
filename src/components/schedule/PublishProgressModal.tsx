'use client'

import React from 'react'

interface PublishProgressModalProps {
  isOpen: boolean
  message: string
  isComplete?: boolean
  onClose: () => void
}

function useProgressTimer(isActive: boolean, estimatedMs = 30000) {
  const [progress, setProgress] = React.useState(0) // 0..100
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    if (!isActive) {
      setProgress(0)
      setElapsed(0)
      return
    }

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
  }, [isActive, estimatedMs])

  return { progress, setProgress, elapsed }
}

export default function PublishProgressModal({ 
  isOpen, 
  message, 
  isComplete = false,
  onClose 
}: PublishProgressModalProps) {
  const { progress } = useProgressTimer(isOpen && !isComplete, 30000)

  if (!isOpen) return null

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
    >
      <div 
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-1 text-gray-950">
          {isComplete ? 'Publishing complete' : 'Publishing your post…'}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          {message}
        </p>

        {!isComplete && (
          <p className="text-xs text-gray-400 mb-4">This can take a couple of minutes.</p>
        )}

        {/* Progress */}
        {!isComplete && (
          <div className="mb-4">
            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden progress-indeterminate">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Close button when complete */}
        {isComplete && (
          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

