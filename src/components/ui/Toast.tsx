'use client'

import React, { useEffect, useState } from 'react'

export interface Toast {
  id: string
  title: string
  message?: string
  type: 'success' | 'error' | 'warning'
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRemoving(true)
      // Wait for fade-out animation before removing
      setTimeout(() => {
        onRemove(toast.id)
      }, 300)
    }, toast.duration || 4000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const isSuccess = toast.type === 'success'
  const isWarning = toast.type === 'warning'
  const bgColor = isSuccess ? 'bg-[#ECFDF5]' : isWarning ? 'bg-[#FFFBEB]' : 'bg-[#FEF2F2]'
  const borderColor = isSuccess ? 'border-[#10B981]' : isWarning ? 'border-[#F59E0B]' : 'border-[#EF4444]'
  const textColor = isSuccess ? 'text-[#10B981]' : isWarning ? 'text-[#F59E0B]' : 'text-[#EF4444]'
  const titleColor = isSuccess ? 'text-[#065F46]' : isWarning ? 'text-[#92400E]' : 'text-[#991B1B]'

  return (
    <div
      className={`
        ${bgColor} ${borderColor} border-l-4
        rounded-lg shadow-md
        p-4 mb-3
        min-w-[320px] max-w-[420px]
      `}
      style={{
        animation: isRemoving 
          ? 'fadeOutSlide 0.3s ease-in forwards'
          : 'fadeInSlide 0.3s ease-out forwards'
      }}
      role="alert"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className={`text-sm font-semibold ${titleColor} mb-1`}>
            {toast.title}
          </h4>
          {toast.message && (
            <p className={`text-sm ${isSuccess ? 'text-gray-700' : 'text-gray-700'}`}>
              {toast.message}
            </p>
          )}
          {toast.actionLabel && toast.onAction && (
            <button
              onClick={toast.onAction}
              className={`mt-3 text-sm font-medium ${textColor} hover:underline`}
            >
              {toast.actionLabel} →
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setIsRemoving(true)
            setTimeout(() => {
              onRemove(toast.id)
            }, 300)
          }}
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close notification"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default ToastComponent

