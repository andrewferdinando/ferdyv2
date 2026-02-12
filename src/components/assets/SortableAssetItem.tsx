'use client'

import { useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Asset } from '@/hooks/assets/useAssets'
import type { AssetUsageInfo } from './SortableAssetGrid'

interface SortableAssetItemProps {
  asset: Asset
  position: number
  onRemove: (id: string) => void
  usage?: AssetUsageInfo
}

export default function SortableAssetItem({ asset, position, onRemove, usage }: SortableAssetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: asset.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isVideo = asset.asset_type === 'video'
  const thumbUrl = isVideo
    ? asset.thumbnail_signed_url
    : asset.thumbnail_signed_url || asset.signed_url

  const [imgLoaded, setImgLoaded] = useState(false)
  const prevUrlRef = useRef(thumbUrl)
  if (prevUrlRef.current !== thumbUrl) {
    prevUrlRef.current = thumbUrl
    setImgLoaded(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group border-2 border-[#6366F1] rounded-lg overflow-hidden bg-white"
    >
      {/* Position badge and drag handle */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
        {/* Position number */}
        <div className="w-6 h-6 bg-white text-gray-900 text-xs font-semibold rounded-full flex items-center justify-center shadow-sm border border-gray-200">
          {position}
        </div>
        {/* Drag handle - visible on hover */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="w-6 h-6 bg-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shadow-sm border border-gray-200"
          aria-label="Drag to reorder"
        >
          <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Thumbnail */}
      {thumbUrl ? (
        <div className="relative w-full h-32">
          {!imgLoaded && <div className="absolute inset-0 skeleton-shimmer" />}
          <img
            src={thumbUrl}
            alt={asset.title}
            loading="lazy"
            className={`w-full h-32 object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(true)}
          />
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-32 skeleton-shimmer" />
      )}

      {/* Usage badges */}
      {usage && (
        <div className="absolute bottom-0 left-0 flex items-center gap-1 p-1.5">
          {usage.usedCount === 0 && usage.queuedCount === 0 && (
            <span className="text-[10px] font-medium leading-none px-1.5 py-0.5 rounded bg-green-100 text-green-700">
              New
            </span>
          )}
          {usage.usedCount > 0 && (
            <span className="text-[10px] font-medium leading-none px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              Used {usage.usedCount}x
            </span>
          )}
          {usage.queuedCount > 0 && (
            <span className="text-[10px] font-medium leading-none px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
              Queued
            </span>
          )}
        </div>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(asset.id)}
        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        aria-label="Remove"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
