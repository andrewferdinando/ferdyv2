'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/ToastProvider'
import { getChannelLabel } from '@/lib/channels'
import type { PostJobSummary } from '@/types/postJobs'
import { canonicalizeChannel } from '@/lib/channels'

export interface UsePublishNowOptions {
  onSuccess?: (result: {
    draftStatus?: string
    jobs?: PostJobSummary[]
  }) => void | Promise<void>
  onError?: (error: string) => void
  channels?: string[] // For building initial modal message
}

export interface UsePublishNowReturn {
  isPublishing: boolean
  isModalOpen: boolean
  modalMessage: string
  isModalComplete: boolean
  publishNow: (draftId: string, options?: UsePublishNowOptions) => Promise<void>
  closeModal: () => void
}

/**
 * Reusable hook for publishing a draft immediately
 * Handles the publish-now API call, modal state, and success/error handling
 */
export function usePublishNow(): UsePublishNowReturn {
  const { showToast } = useToast()
  const [isPublishing, setIsPublishing] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [isModalComplete, setIsModalComplete] = useState(false)

  const publishNow = useCallback(
    async (draftId: string, options?: UsePublishNowOptions) => {
      setIsPublishing(true)
      setIsModalComplete(false)

      // Build initial modal message from channels if provided
      const initialMessage = options?.channels && options.channels.length > 0
        ? `Publishing your post to ${options.channels.map(ch => getChannelLabel(ch)).join(', ')}…`
        : 'Publishing your post…'
      setModalMessage(initialMessage)
      setIsModalOpen(true)

      try {
        // Call the publish-now endpoint
        const response = await fetch('/api/publishing/publish-now', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftId }),
        })

        const data = await response.json()

        if (!response.ok || !data.ok) {
          const errorMessage = data.error || 'Failed to publish now'
          setModalMessage(`Publishing failed: ${errorMessage}`)
          setIsModalComplete(true)
          showToast({
            title: 'Publishing failed',
            message: errorMessage,
            type: 'error',
          })
          options?.onError?.(errorMessage)
          return
        }

        // Compute successful and failed channels from jobs
        const jobs = data.jobs || []
        const successfulChannels: string[] = []
        const failedChannels: string[] = []

        jobs.forEach((job: {
          channel: string
          status: string
        }) => {
          const channelLabel = getChannelLabel(job.channel)
          if (job.status.toLowerCase() === 'success' || job.status.toLowerCase() === 'published') {
            successfulChannels.push(channelLabel)
          } else if (job.status.toLowerCase() === 'failed') {
            failedChannels.push(channelLabel)
          }
        })

        // Update modal message based on results
        let resultMessage = ''
        if (successfulChannels.length > 0 && failedChannels.length === 0) {
          // All success
          resultMessage = `Published to ${successfulChannels.join(', ')}.`
        } else if (successfulChannels.length > 0 && failedChannels.length > 0) {
          // Partial success
          resultMessage = `Published to ${successfulChannels.join(', ')}. Failed on: ${failedChannels.join(', ')}.`
        } else if (failedChannels.length > 0) {
          // All failed
          resultMessage = `Publishing failed on all channels. See channel status for details.`
        } else {
          resultMessage = 'Publishing completed.'
        }

        setModalMessage(resultMessage)
        setIsModalComplete(true)

        // Normalize jobs for callback
        const normalizedJobs: PostJobSummary[] = jobs
          .map((job: {
            id: string
            draft_id: string | null
            channel: string
            status: string
            error: string | null
            external_post_id: string | null
            external_url: string | null
            last_attempt_at: string | null
          }): PostJobSummary | null => {
            const canonical = canonicalizeChannel(job.channel)
            if (!canonical) return null
            return {
              id: job.id,
              draft_id: job.draft_id,
              channel: canonical,
              status: job.status,
              error: job.error ?? null,
              external_post_id: job.external_post_id ?? null,
              external_url: job.external_url ?? null,
              last_attempt_at: job.last_attempt_at ?? null,
            } as PostJobSummary
          })
          .filter((job: PostJobSummary | null): job is PostJobSummary => Boolean(job))

        // Sort by channel order
        const CHANNEL_ORDER = ['facebook', 'instagram_feed', 'instagram_story', 'linkedin_profile', 'tiktok', 'x']
        const CHANNEL_ORDER_INDEX = new Map(CHANNEL_ORDER.map((channel, index) => [channel, index]))
        normalizedJobs.sort((a, b) => {
          const aIndex = CHANNEL_ORDER_INDEX.get(a.channel) ?? Number.MAX_SAFE_INTEGER
          const bIndex = CHANNEL_ORDER_INDEX.get(b.channel) ?? Number.MAX_SAFE_INTEGER
          if (aIndex === bIndex) {
            return a.channel.localeCompare(b.channel)
          }
          return aIndex - bIndex
        })

        // Call onSuccess callback if provided
        if (options?.onSuccess) {
          await options.onSuccess({
            draftStatus: data.draftStatus,
            jobs: normalizedJobs,
          })
        }
      } catch (error) {
        console.error('Error publishing now:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to publish now. Please try again.'
        setModalMessage(`Publishing failed: ${errorMessage}`)
        setIsModalComplete(true)
        showToast({
          title: 'Publishing failed',
          message: errorMessage,
          type: 'error',
        })
        options?.onError?.(errorMessage)
      } finally {
        setIsPublishing(false)
        // Note: Modal stays open if publish succeeded (isComplete will be true)
        // User will close it manually via the Close button
      }
    },
    [showToast],
  )

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setIsModalComplete(false)
    setModalMessage('')
  }, [])

  return {
    isPublishing,
    isModalOpen,
    modalMessage,
    isModalComplete,
    publishNow,
    closeModal,
  }
}

