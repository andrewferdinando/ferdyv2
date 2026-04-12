'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase-browser'

interface PageInfo {
  id: string
  name: string
  category: string | null
  pictureUrl: string | null
  hasInstagram: boolean
}

interface FacebookPageSelectModalProps {
  isOpen: boolean
  onClose: () => void
  pendingId: string
  brandId: string
  onConnected: (providers: string[]) => void
}

export default function FacebookPageSelectModal({
  isOpen,
  onClose,
  pendingId,
  brandId,
  onConnected,
}: FacebookPageSelectModalProps) {
  const [pages, setPages] = useState<PageInfo[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPages = useCallback(async () => {
    if (!pendingId) return

    setLoading(true)
    setError(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        setError('Session expired. Please try again.')
        return
      }

      const response = await fetch(`/api/integrations/pending-pages?pendingId=${pendingId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to load pages.')
      }

      const data = await response.json()
      setPages(data.pages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pages.')
    } finally {
      setLoading(false)
    }
  }, [pendingId])

  useEffect(() => {
    if (isOpen && pendingId) {
      fetchPages()
    }
  }, [isOpen, pendingId, fetchPages])

  const handleSubmit = async () => {
    if (!selectedPageId || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        setError('Session expired. Please try again.')
        return
      }

      const response = await fetch('/api/integrations/finalize-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ pendingId, selectedPageId }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to connect page.')
      }

      const data = await response.json()
      onConnected(data.connected)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect page.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select a Facebook Page"
      subtitle="Choose the Facebook Page you'd like to connect to this brand."
      maxWidth="md"
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <span className="ml-3 text-sm text-gray-500">Loading pages...</span>
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {pages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setSelectedPageId(page.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                  selectedPageId === page.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {/* Profile picture */}
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {page.pictureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={page.pictureUrl}
                      alt={page.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">
                      {page.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Page info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{page.name}</p>
                  <div className="flex items-center gap-2">
                    {page.category && (
                      <span className="text-xs text-gray-500">{page.category}</span>
                    )}
                    {page.hasInstagram && (
                      <span className="text-xs text-purple-600 font-medium">+ Instagram</span>
                    )}
                  </div>
                </div>

                {/* Selection indicator */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedPageId === page.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedPageId === page.id && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedPageId || submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {submitting ? 'Connecting...' : 'Connect Page'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
