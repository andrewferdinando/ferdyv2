'use client'

import { channelSupportsMedia, describeChannelSupport } from '@/lib/channelSupport'
import { getChannelLabel } from '@/lib/channels'

interface Channel {
  id: string
  label: string
}

interface ChannelStatus {
  channel: string
  status?: string
}

interface ChannelSelectorProps {
  selectedChannels: string[]
  onChannelsChange: (channels: string[]) => void
  selectedMediaTypes?: Set<'image' | 'video'>
  channelStatuses?: ChannelStatus[] // Optional: for Edit mode to show status
  required?: boolean
  className?: string
}

/**
 * Reusable channel selector component
 * Displays clickable channel tiles with icons, selection checkmarks, and optional status
 * Used in both Create Post and Edit Post flows
 */
export default function ChannelSelector({
  selectedChannels,
  onChannelsChange,
  selectedMediaTypes = new Set(),
  channelStatuses = [],
  required = false,
  className = '',
}: ChannelSelectorProps) {
  const channels: Channel[] = [
    { id: 'instagram_feed', label: 'Instagram Feed' },
    { id: 'instagram_story', label: 'Instagram Story' },
    { id: 'facebook', label: 'Facebook' },
    // LinkedIn Profile removed - not currently supported
  ]

  const toggleChannel = (channelId: string) => {
    const isSelected = selectedChannels.includes(channelId)
    
    if (isSelected) {
      onChannelsChange(selectedChannels.filter((c) => c !== channelId))
    } else {
      // Check for incompatible media types
      const incompatibleType = Array.from(selectedMediaTypes).find(
        (type) => !channelSupportsMedia(channelId, type),
      )

      if (incompatibleType) {
        alert(
          `The ${channels.find((c) => c.id === channelId)?.label || channelId} channel does not support ${
            incompatibleType === 'video' ? 'video' : 'image'
          } posts. Please remove incompatible media or choose a different channel.`,
        )
        return
      }

      onChannelsChange([...selectedChannels, channelId])
    }
  }

  const renderChannelIcon = (channelId: string) => {
    switch (channelId) {
      case 'facebook':
        return (
          <div className="w-8 h-8 bg-[#1877F2] rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
        )
      case 'instagram_feed':
        return (
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
        )
      case 'instagram_story':
        return (
          <div className="w-8 h-8 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.2c3.2 0 3.6.01 4.9.07 3.26.15 4.78 1.7 4.93 4.93.06 1.27.07 1.65.07 4.9s-.01 3.63-.07 4.9c-.15 3.22-1.67 4.78-4.93 4.93-1.27.06-1.65.07-4.9.07s-3.63-.01-4.9-.07c-3.22-.15-4.78-1.71-4.93-4.93-.06-1.27-.07-1.65-.07-4.9s.01-3.63.07-4.9C2.29 3.97 3.81 2.41 7.03 2.26 8.3 2.2 8.68 2.2 12 2.2zm0 1.8c-3.17 0-3.54.01-4.78.07-2.37.11-3.47 1.24-3.58 3.58-.06 1.24-.06 1.61-.06 4.78s0 3.54.06 4.78c.11 2.33 1.2 3.47 3.58 3.58 1.24.06 1.61.07 4.78.07 3.17 0 3.54-.01 4.78-.07 2.36-.11 3.47-1.23 3.58-3.58.06-1.24.06-1.61.06-4.78s0-3.54-.06-4.78c-.11-2.33-1.2-3.47-3.58-3.58-1.24-.06-1.61-.07-4.78-.07zm0 3.3a4.7 4.7 0 110 9.4 4.7 4.7 0 010-9.4zm0 7.6a2.9 2.9 0 100-5.8 2.9 2.9 0 000 5.8zm5.4-7.9a1.1 1.1 0 11-2.2 0 1.1 1.1 0 012.2 0z" />
            </svg>
          </div>
        )
      case 'linkedin_profile':
        return (
          <div className="w-8 h-8 bg-[#0A66C2] rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-xs font-semibold uppercase text-gray-700">{channelId.slice(0, 2)}</span>
          </div>
        )
    }
  }

  const getChannelStatusMeta = (status?: string) => {
    if (!status) return null
    const normalized = status.toLowerCase()
    if (normalized === 'success' || normalized === 'published') {
      return {
        text: 'Published',
        textClass: 'text-emerald-600',
        pillBgClass: 'bg-emerald-100',
      }
    }
    if (normalized === 'failed') {
      return {
        text: 'Failed',
        textClass: 'text-rose-600',
        pillBgClass: 'bg-rose-100',
      }
    }
    if (normalized === 'publishing') {
      return {
        text: 'Publishing',
        textClass: 'text-blue-600',
        pillBgClass: 'bg-blue-100',
      }
    }
    if (normalized === 'ready' || normalized === 'generated') {
      return {
        text: normalized === 'ready' ? 'Ready' : 'Generated',
        textClass: 'text-blue-600',
        pillBgClass: 'bg-blue-100',
      }
    }
    return {
      text: 'Pending',
      textClass: 'text-amber-600',
      pillBgClass: 'bg-amber-100',
    }
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {channels.map((channel) => {
          const isSelected = selectedChannels.includes(channel.id)
          const statusInfo = channelStatuses.find((cs) => cs.channel === channel.id)
          const statusMeta = getChannelStatusMeta(statusInfo?.status)
          // Get provider channel for describeChannelSupport (e.g., 'instagram_feed' -> 'instagram')
          const providerChannel =
            channel.id === 'instagram_feed' || channel.id === 'instagram_story'
              ? 'instagram'
              : channel.id === 'linkedin_profile'
              ? 'linkedin'
              : channel.id

          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => toggleChannel(channel.id)}
              className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 transition-colors text-left ${
                isSelected ? 'border-[#6366F1] bg-[#EEF2FF]' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1">
                {renderChannelIcon(channel.id)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">{channel.label}</span>
                    {isSelected && (
                      <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{describeChannelSupport(providerChannel)}</span>
                </div>
              </div>
              {statusMeta && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMeta.textClass} ${statusMeta.pillBgClass}`}>
                  {statusMeta.text}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

