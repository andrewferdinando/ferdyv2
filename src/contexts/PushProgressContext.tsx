'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import DraftsPushProgressModal from '@/components/schedule/DraftsPushProgressModal'

interface PushProgressState {
  isVisible: boolean
  message?: string
  visibleFrom?: number
}

interface PushProgressContextValue {
  startPushProgress: (message?: string) => void
  completePushProgress: (options?: { message?: string; minVisibleMs?: number }) => void
  failPushProgress: (errorMessage: string) => void
  state: PushProgressState
}

const PushProgressContext = createContext<PushProgressContextValue | undefined>(undefined)

export function PushProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PushProgressState>({ isVisible: false })
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null)

  const startPushProgress = useCallback((message?: string) => {
    // Clear any existing timer
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    setState({
      isVisible: true,
      message,
      visibleFrom: Date.now(),
    })
  }, [])

  const completePushProgress = useCallback(
    (options?: { message?: string; minVisibleMs?: number }) => {
      const minVisibleMs = options?.minVisibleMs ?? 1500 // Default 1.5 seconds
      const visibleFrom = state.visibleFrom ?? Date.now()
      const elapsed = Date.now() - visibleFrom
      const remaining = Math.max(0, minVisibleMs - elapsed)

      console.log(
        `[PushProgress] Completing. Visible for ${elapsed}ms, waiting ${remaining}ms more (min: ${minVisibleMs}ms)`
      )

      // Clear any existing timer
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }

      // Wait for remaining time, then close
      closeTimerRef.current = setTimeout(() => {
        const totalVisible = Date.now() - visibleFrom
        console.log(`[PushProgress] Closing after minimum visibility (total: ${totalVisible}ms)`)
        setState({ isVisible: false })
        closeTimerRef.current = null

        // If there's a completion message, we'll handle it via toast in the calling code
      }, remaining)
    },
    [state.visibleFrom]
  )

  const failPushProgress = useCallback((errorMessage: string) => {
    // Clear any existing timer
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    // Hide modal immediately on error
    setState({ isVisible: false })
    console.error(`[PushProgress] Failed: ${errorMessage}`)
  }, [])

  return (
    <PushProgressContext.Provider
      value={{
        startPushProgress,
        completePushProgress,
        failPushProgress,
        state,
      }}
    >
      {children}
      {/* Render modal here - it will stay mounted even when children unmount */}
      {state.isVisible && (
        <DraftsPushProgressModal
          estimatedMs={60000}
          onClose={() => {
            // Prevent manual closing while push is in progress
            // Only allow closing if it's been visible for a while
            const visibleFrom = state.visibleFrom ?? 0
            const elapsed = Date.now() - visibleFrom
            if (elapsed < 1000) {
              console.log(`[PushProgress] Blocked manual close - only ${elapsed}ms elapsed`)
              return
            }
          }}
        />
      )}
    </PushProgressContext.Provider>
  )
}

export function usePushProgress() {
  const context = useContext(PushProgressContext)
  if (context === undefined) {
    throw new Error('usePushProgress must be used within a PushProgressProvider')
  }
  return context
}

