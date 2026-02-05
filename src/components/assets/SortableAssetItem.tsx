'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Asset } from '@/hooks/assets/useAssets'

interface SortableAssetItemProps {
  asset: Asset
  position: number
  onRemove: (id: string) => void
}

export default function SortableAssetItem({ asset, position, onRemove }: SortableAssetItemProps) {
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
  const thumbUrl = isVideo ? asset.thumbnail_signed_url : asset.signed_url

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
        <>
          <img
            src={thumbUrl}
            alt={asset.title}
            className="w-full h-32 object-cover"
            draggable={false}
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
        </>
      ) : (
        <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
          {isVideo ? (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          ) : (
            'Loading...'
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
