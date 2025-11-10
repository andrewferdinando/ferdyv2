'use client'

import { useEffect, useState } from 'react'
import { Asset } from '@/hooks/assets/useAssets'

interface AssetCardProps {
  asset: Asset
  onEdit: (asset: Asset) => void
  onDelete: (asset: Asset) => void
  onPreview?: (asset: Asset) => void
}

export default function AssetCard({ asset, onEdit, onDelete, onPreview }: AssetCardProps) {
  const isVideo = asset.asset_type === 'video'
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    if (isVideo && !asset.thumbnail_signed_url && asset.signed_url) {
      setGeneratedThumbnail(null)
      generateVideoThumbnail(asset.signed_url)
        .then((thumbnail) => {
          if (isMounted) {
            setGeneratedThumbnail(thumbnail ?? null)
          }
        })
        .catch(() => {
          if (isMounted) {
            setGeneratedThumbnail(null)
          }
        })
    } else {
      setGeneratedThumbnail(null)
    }

    return () => {
      isMounted = false
    }
  }, [asset.id, asset.signed_url, asset.thumbnail_signed_url, isVideo])

  const previewUrl = isVideo
    ? generatedThumbnail || asset.thumbnail_signed_url || undefined
    : asset.signed_url
  const canPreview = isVideo && typeof onPreview === 'function'

  const handlePreviewClick = () => {
    if (canPreview) {
      onPreview!(asset)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div
        className={`relative aspect-square bg-gray-100 overflow-hidden ${canPreview ? 'cursor-pointer' : ''}`}
        onClick={canPreview ? handlePreviewClick : undefined}
        role={canPreview ? 'button' : undefined}
        tabIndex={canPreview ? 0 : undefined}
        onKeyDown={
          canPreview
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handlePreviewClick()
                }
              }
            : undefined
        }
        aria-label={canPreview ? `Preview video ${asset.title}` : undefined}
      >
        {!previewUrl ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="text-xs">No preview</div>
              <div className="text-xs text-gray-300 break-all px-2">{asset.storage_path}</div>
            </div>
          </div>
        ) : (
          <img
            src={previewUrl}
            alt={asset.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.parentElement!.innerHTML = `
                <div class="flex h-full items-center justify-center text-gray-400">
                  <div class="text-center">
                    <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <div class="text-xs">Preview unavailable</div>
                    <div class="text-xs text-gray-300 break-all px-2">${asset.storage_path}</div>
                  </div>
                </div>
              `
            }}
          />
        )}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#6366F1] shadow">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        {asset.tags && asset.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {asset.tags.map((tag) => (
              <span
                key={tag.id}
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  tag.kind === 'subcategory'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => onEdit(asset)}
            className="p-2 text-[#6366F1] hover:text-[#4F46E5] hover:bg-[#EEF2FF] rounded-lg transition-colors duration-200"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(asset)}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

async function generateVideoThumbnail(url: string): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null
  }

  return new Promise((resolve) => {
    const video = document.createElement('video')
    let resolved = false

    const finalize = (value: string | null) => {
      if (resolved) return
      resolved = true
      video.pause()
      video.removeAttribute('src')
      video.load()
      resolve(value)
    }

    video.crossOrigin = 'anonymous'
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = url

    video.onloadedmetadata = () => {
      try {
        const duration = video.duration || 0
        const targetTime = duration > 0 ? Math.min(duration * 0.1, duration - 0.1) : 0.1
        video.currentTime = Number.isFinite(targetTime) ? Math.max(targetTime, 0.1) : 0.1
      } catch {
        finalize(null)
      }
    }

    video.onseeked = () => {
      try {
        const width = video.videoWidth || 640
        const height = video.videoHeight || 360
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) {
          finalize(null)
          return
        }
        context.drawImage(video, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        finalize(dataUrl)
      } catch {
        finalize(null)
      }
    }

    video.onerror = () => finalize(null)

    setTimeout(() => finalize(null), 7000)
  })
}

