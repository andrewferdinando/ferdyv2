'use client'

import { channelSupportsMedia, describeChannelSupport } from '@/lib/channelSupport'

interface Channel {
  id: string
  label: string
}

interface ChannelSelectorProps {
  selectedChannels: string[]
  onChannelsChange: (channels: string[]) => void
  selectedMediaTypes?: Set<'image' | 'video'>
  required?: boolean
  className?: string
}

/**
 * Reusable channel selector component
 * Displays selectable channel tiles with media type support indicators
 * Used in both Create Post and Edit Post flows
 */
export default function ChannelSelector({
  selectedChannels,
  onChannelsChange,
  selectedMediaTypes = new Set(),
  required = false,
  className = '',
}: ChannelSelectorProps) {
  const channels: Channel[] = [
    { id: 'instagram_feed', label: 'Instagram Feed' },
    { id: 'instagram_story', label: 'Instagram Story' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'linkedin_profile', label: 'LinkedIn Profile' },
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

  const channelsSupportSelection =
    selectedMediaTypes.size === 0
      ? true
      : selectedChannels.every((channel) =>
          Array.from(selectedMediaTypes).every((type) => channelSupportsMedia(channel, type)),
        )

  return (
    <div className={className}>
      <div className="space-y-2">
        {channels.map((channel) => {
          const isSelected = selectedChannels.includes(channel.id)
          // Get provider channel for describeChannelSupport (e.g., 'instagram_feed' -> 'instagram')
          const providerChannel =
            channel.id === 'instagram_feed' || channel.id === 'instagram_story'
              ? 'instagram'
              : channel.id === 'linkedin_profile'
              ? 'linkedin'
              : channel.id

          return (
            <label
              key={channel.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors cursor-pointer ${
                isSelected ? 'border-[#6366F1] bg-[#EEF2FF]' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleChannel(channel.id)}
                  className="rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
                />
                <span className="text-sm font-medium text-gray-700">{channel.label}</span>
              </div>
              <span className="text-xs text-gray-500">{describeChannelSupport(providerChannel)}</span>
            </label>
          )
        })}
        {!channelsSupportSelection && (
          <p className="text-xs text-red-600">
            Selected channels do not support the chosen media type. Adjust your selection before submitting.
          </p>
        )}
      </div>
    </div>
  )
}

