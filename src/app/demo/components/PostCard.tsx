'use client'

import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react'
import type { IconColor, IconName } from '../data/types'
import CategoryIcon from './CategoryIcon'

type Props = {
  businessName: string
  homepageUrl: string
  categoryIcon: IconName
  categoryIconColor: IconColor
  imageUrl?: string
  caption: string
  hashtags: string[]
  onImageError?: () => void
}

/**
 * Recognisable-as-an-Instagram-post card without faking Meta's UI exactly.
 * Square image, header + footer chrome, caption with hashtags appended in
 * indigo. Used in the Examples stage to show what Ferdy would publish.
 */
export default function PostCard({
  businessName,
  homepageUrl,
  categoryIcon,
  categoryIconColor,
  imageUrl,
  caption,
  hashtags,
  onImageError,
}: Props) {
  // Strip protocol + trailing slash from URL for the "location" line
  const handle = homepageUrl
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .toLowerCase()

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <CategoryIcon name={categoryIcon} color={categoryIconColor} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-950 truncate">
            {businessName}
          </p>
          <p className="text-xs text-gray-500 truncate">{handle}</p>
        </div>
        <button
          type="button"
          aria-label="More"
          className="text-gray-400 -mr-1 px-2 py-1 hover:text-gray-600"
        >
          •••
        </button>
      </div>

      {/* Image (or placeholder) */}
      <div className="relative w-full aspect-square bg-gray-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={onImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            Image to come
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center px-4 pt-3 gap-4 text-gray-700">
        <Heart className="w-6 h-6" strokeWidth={1.8} />
        <MessageCircle className="w-6 h-6" strokeWidth={1.8} />
        <Send className="w-6 h-6" strokeWidth={1.8} />
        <Bookmark className="w-6 h-6 ml-auto" strokeWidth={1.8} />
      </div>

      {/* Caption */}
      <div className="px-4 pt-2 pb-4">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          <span className="font-semibold text-gray-950">{handle}</span>{' '}
          {caption}
        </p>
        {hashtags.length > 0 && (
          <p className="text-sm text-indigo-600 leading-relaxed mt-1">
            {hashtags.join(' ')}
          </p>
        )}
      </div>
    </div>
  )
}
