'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAssets, Asset } from '@/hooks/assets/useAssets'
import { useDeleteAsset } from '@/hooks/assets/useDeleteAsset'
import UploadAsset from '@/components/assets/UploadAsset'
import AssetCard from '@/components/assets/AssetCard'
import TagSelector from '@/components/assets/TagSelector'
import { getSignedUrl } from '@/lib/storage/getSignedUrl'

// Search Icon Component
const SearchIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FORMATS = [
  { key: '1:1', ratio: 1, hint: 'Feed' },
  { key: '4:5', ratio: 4 / 5, hint: 'Feed (tall)' },
  { key: '1.91:1', ratio: 1.91, hint: 'Feed (landscape)' },
  { key: '9:16', ratio: 9 / 16, hint: 'Reels & Stories' },
] as const

const EPSILON = 1e-6

type MediaFilterValue = 'images' | 'videos'
type VideoGroupKey = 'vertical' | 'square' | 'landscape'

const VIDEO_GROUP_ORDER: VideoGroupKey[] = ['vertical', 'square', 'landscape']
const VIDEO_GROUP_LABELS: Record<VideoGroupKey, string> = {
  vertical: 'Vertical format',
  square: 'Square format',
  landscape: 'Landscape format',
}

const MAX_ZOOM_MULTIPLIER = 4

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const ensureCropWithinBounds = (
  crop: { scale: number; x: number; y: number },
  nextScale: number,
  minScale: number,
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
) => {
  const safeScale = Math.max(nextScale, minScale)

  const overflowX = Math.max(0, (imageWidth * safeScale - frameWidth) / 2)
  const overflowY = Math.max(0, (imageHeight * safeScale - frameHeight) / 2)

  const prevOverflowX = Math.max(0, (imageWidth * crop.scale - frameWidth) / 2)
  const prevOverflowY = Math.max(0, (imageHeight * crop.scale - frameHeight) / 2)

  const prevPxX = prevOverflowX === 0 ? 0 : crop.x * prevOverflowX
  const prevPxY = prevOverflowY === 0 ? 0 : crop.y * prevOverflowY

  return {
    scale: safeScale,
    x: overflowX === 0 ? 0 : clamp(prevPxX / overflowX, -1, 1),
    y: overflowY === 0 ? 0 : clamp(prevPxY / overflowY, -1, 1),
  }
}

const parseAspectRatio = (value?: string | null): number | null => {
  if (!value) return null
  const cleaned = value.trim()
  if (!cleaned) return null

  if (cleaned.includes(':')) {
    const [left, right] = cleaned.split(':')
    const leftNum = Number(left)
    const rightNum = Number(right)
    if (Number.isFinite(leftNum) && Number.isFinite(rightNum) && rightNum !== 0) {
      return leftNum / rightNum
    }
  }

  if (cleaned.includes('/')) {
    const [left, right] = cleaned.split('/')
    const leftNum = Number(left)
    const rightNum = Number(right)
    if (Number.isFinite(leftNum) && Number.isFinite(rightNum) && rightNum !== 0) {
      return leftNum / rightNum
    }
  }

  const numeric = Number(cleaned)
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric
  }

  return null
}

const getAssetAspectRatio = (asset: Asset): number | null => {
  if (asset.width && asset.height) {
    if (asset.height === 0) return null
    return asset.width / asset.height
  }

  if (asset.aspect_ratio) {
    return parseAspectRatio(asset.aspect_ratio)
  }

  return null
}

const classifyVideoShape = (asset: Asset): VideoGroupKey => {
  const ratio = getAssetAspectRatio(asset)
  if (!ratio) return 'landscape'
  if (ratio < 0.9) return 'vertical'
  if (ratio <= 1.1) return 'square'
  return 'landscape'
}

const assetMatchesMediaFilter = (asset: Asset, filter: MediaFilterValue) => {
  const isVideo = (asset.asset_type ?? 'image') === 'video'
  return filter === 'images' ? !isVideo : isVideo
}

type CropState = {
  scale: number
  x: number
  y: number
}

export default function ContentLibraryPage() {
  const params = useParams()
  const brandId = params.brandId as string
  const { assets, loading, error, refetch, saveAssetTags } = useAssets(brandId)
  const { deleteAsset, deleting } = useDeleteAsset()
  
  const [activeTab, setActiveTab] = useState<'ready' | 'needs_attention'>('ready')
  const [searchQuery, setSearchQuery] = useState('')
  const [mediaFilter, setMediaFilter] = useState<MediaFilterValue>('images')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Asset | null>(null)
  const [editingAssetData, setEditingAssetData] = useState<Asset | null>(null)
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null)

  // Filter assets based on tab and search
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags.some(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesFilter = assetMatchesMediaFilter(asset, mediaFilter)

    if (activeTab === 'ready') {
      return asset.tags.length > 0 && matchesSearch && matchesFilter
    } else {
      return asset.tags.length === 0 && matchesSearch && matchesFilter
    }
  })

  const needsAttentionAssets = assets
    .filter(asset => {
      const matchesFilter = assetMatchesMediaFilter(asset, mediaFilter)
      return asset.tags.length === 0 && matchesFilter
    })
    .sort((a, b) => {
      // If we have editingAssetData, prioritize that asset first
      if (editingAssetData) {
        if (a.id === editingAssetData.id) return -1
        if (b.id === editingAssetData.id) return 1
      }
      // Otherwise, sort by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  const readyAssets = assets.filter((asset) => {
    const matchesFilter = assetMatchesMediaFilter(asset, mediaFilter)

    return asset.tags.length > 0 && matchesFilter
  })

  const isVideoFilter = mediaFilter === 'videos'

  const groupedVideoAssets = useMemo(() => {
    if (!isVideoFilter) return null
    return filteredAssets.reduce<Record<VideoGroupKey, Asset[]>>(
      (acc, asset) => {
        const group = classifyVideoShape(asset)
        acc[group].push(asset)
        return acc
      },
      {
        vertical: [],
        square: [],
        landscape: [],
      },
    )
  }, [filteredAssets, isVideoFilter])

  const filterOptions: { key: MediaFilterValue; label: string }[] = [
    { key: 'images', label: 'Images' },
    { key: 'videos', label: 'Videos' },
  ]

  const handleUploadSuccess = (assetIds: string[]) => {
    refetch()
    // Switch to needs attention tab to show the new assets
    setActiveTab('needs_attention')
    // Store the first uploaded asset as editing data to prioritize it
    if (assetIds.length > 0) {
      setTimeout(() => {
        const newAsset = assets.find(asset => asset.id === assetIds[0])
        if (newAsset) {
          setEditingAssetData(newAsset)
        }
      }, 500)
    }
  }

  const handleUploadError = (error: string) => {
    alert(`Upload failed: ${error}`)
  }

  const handlePreviewAsset = (asset: Asset) => {
    if (asset.asset_type === 'video') {
      setPreviewAsset(asset)
    }
  }

  const handleEditAsset = async (asset: Asset) => {
    try {
      // Store the original asset data for editing
      setEditingAssetData(asset)
      
      // Move asset to "Needs Attention" by clearing its tags
      const { supabase } = await import('@/lib/supabase-browser')
      
      const { error } = await supabase
        .from('assets')
        .update({ 
          tags: [], // Clear tags to move to needs attention
        })
        .eq('id', asset.id)
        .eq('brand_id', asset.brand_id)

      if (error) {
        throw error
      }

      // Refresh the data and switch to needs attention tab
      refetch()
      setActiveTab('needs_attention')
    } catch (error) {
      console.error('Error moving asset to needs attention:', error)
      alert('Failed to move asset for editing. Please try again.')
    }
  }

  const handleDeleteAsset = (asset: Asset) => {
    setShowDeleteConfirm(asset)
  }

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return

    await deleteAsset({
      assetId: showDeleteConfirm.id,
      brandId: showDeleteConfirm.brand_id,
      storagePath: showDeleteConfirm.storage_path,
      thumbnailPath: showDeleteConfirm.thumbnail_url ?? undefined,
      onSuccess: () => {
        refetch()
        setShowDeleteConfirm(null)
      },
      onError: (error) => {
        alert(`Delete failed: ${error}`)
      }
    })
  }

  const handleAssetUpdate = () => {
    refetch()
    setEditingAssetData(null) // Clear editing data after successful update
  }


  if (loading) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
          </div>
        </AppLayout>
      </RequireAuth>
    )
  }

  if (error) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 mb-4">Error loading assets: {error}</p>
              <button
                onClick={refetch}
                className="px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </AppLayout>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
              </div>
              <UploadAsset
                brandId={brandId}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10">
            <div className="flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab('ready')
                  setEditingAssetData(null) // Clear editing data when switching tabs
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'ready'
                    ? 'border-[#6366F1] text-[#6366F1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Ready to Use ({readyAssets.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('needs_attention')
                  setEditingAssetData(null) // Clear editing data when switching tabs
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'needs_attention'
                    ? 'border-[#6366F1] text-[#6366F1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Needs Attention ({needsAttentionAssets.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            {/* Search */}
            {activeTab === 'ready' && (
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full max-w-md">
                  <SearchIcon className="absolute left-3 top-[13px] text-gray-500 h-4 w-4 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 px-3 py-2 pl-12 border border-gray-300 rounded-lg text-sm focus:border-[#6366F1] focus:ring-4 focus:ring-[#EEF2FF] focus:outline-none transition-all duration-150"
                  />
                </div>
                <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs font-semibold text-gray-600">
                  {filterOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setMediaFilter(option.key)}
                      className={`rounded-full px-3 py-1 transition-all ${(mediaFilter === option.key ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-800')}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'needs_attention' ? (
              (() => {
                const fallbackAsset = editingAssetData ?? null
                const prioritizedAssets = needsAttentionAssets.length
                  ? [
                      ...needsAttentionAssets.filter((asset) => editingAssetData && asset.id === editingAssetData.id),
                      ...needsAttentionAssets.filter((asset) => !editingAssetData || asset.id !== editingAssetData.id),
                    ]
                  : []

                const assetToEdit = prioritizedAssets[0] ?? fallbackAsset

                if (assetToEdit) {
                  const originalData =
                    editingAssetData && assetToEdit.id === editingAssetData.id ? editingAssetData : null

                  return (
                <AssetDetailView 
                      asset={assetToEdit}
                      originalAssetData={originalData}
                  onBack={() => {}} 
                  onUpdate={handleAssetUpdate}
                  brandId={brandId}
                  saveAssetTags={saveAssetTags}
                      onPreviewAsset={handlePreviewAsset}
                />
                  )
                }

                return (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <div className="text-center mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                    <p className="text-gray-600">No content needs attention right now</p>
                  </div>
                  <div className="mt-auto">
                    <UploadAsset
                      brandId={brandId}
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={handleUploadError}
                    />
                  </div>
                </div>
              )
              })()
            ) : (
              // Ready to Use tab - show grid of ready assets
              filteredAssets.length > 0 ? (
                isVideoFilter && groupedVideoAssets
                  ? (() => {
                      const groups = groupedVideoAssets
                      return (
                        <div className="mt-6 space-y-6">
                          {VIDEO_GROUP_ORDER.map((groupKey) => {
                            const groupAssets = groups[groupKey]
                            if (groupAssets.length === 0) return null
                            return (
                              <div key={groupKey} className="space-y-3">
                                <div className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {VIDEO_GROUP_LABELS[groupKey]}
                                </div>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                                  {groupAssets.map((asset) => (
                                    <div key={asset.id}>
                                      <AssetCard
                                        asset={asset}
                                        onEdit={handleEditAsset}
                                        onDelete={handleDeleteAsset}
                                        onPreview={handlePreviewAsset}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()
                  : (
                    <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                  {filteredAssets.map((asset) => (
                    <div key={asset.id}>
                      <AssetCard
                        asset={asset}
                        onEdit={handleEditAsset}
                        onDelete={handleDeleteAsset}
                            onPreview={handlePreviewAsset}
                      />
                    </div>
                  ))}
                </div>
                  )
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <div className="text-center mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No ready content yet</h3>
                    <p className="text-gray-600">Tag your assets to make them ready to use</p>
                  </div>
                  <div className="mt-auto">
                    <UploadAsset
                      brandId={brandId}
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={handleUploadError}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </div>


        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Asset</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete &quot;{showDeleteConfirm.title}&quot;? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
        {previewAsset && previewAsset.asset_type === 'video' && (
          <VideoPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
        )}
      </AppLayout>
    </RequireAuth>
  )
}

// Asset Detail View Component for Needs Attention tab
function AssetDetailView({
  asset,
  originalAssetData,
  onBack,
  onUpdate,
  brandId,
  saveAssetTags,
  onPreviewAsset,
}: {
  asset: Asset
  originalAssetData: Asset | null
  onBack: () => void
  onUpdate: () => void
  brandId: string
  saveAssetTags: (assetId: string, tagIds: string[]) => Promise<void>
  onPreviewAsset?: (asset: Asset) => void
}) {
  const displayAsset = originalAssetData || asset
  const isVideo = (displayAsset.asset_type ?? 'image') === 'video'
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(displayAsset.tag_ids || [])
  const [saving, setSaving] = useState(false)

  const initialFormat = FORMATS.some((format) => format.key === displayAsset.aspect_ratio)
    ? (displayAsset.aspect_ratio as typeof FORMATS[number]['key'])
    : FORMATS[0].key

  const [selectedFormat, setSelectedFormat] = useState<typeof FORMATS[number]['key']>(initialFormat)
  const [crops, setCrops] = useState<Record<string, CropState>>(() => {
    const initial: Record<string, CropState> = {}
    FORMATS.forEach(({ key }) => {
      const stored = displayAsset.image_crops?.[key]
      initial[key] = {
        scale: stored?.scale ?? 1,
        x: stored?.x ?? 0,
        y: stored?.y ?? 0,
      }
    })
    return initial
  })

  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({
    width: displayAsset.width ?? 0,
    height: displayAsset.height ?? 0,
  })
  const [isImageLoading, setIsImageLoading] = useState(false)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 })
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    crop: CropState
  } | null>(null)
  const didAutoSelectRef = useRef(false)
  const initializedFormatsRef = useRef<Record<string, boolean>>({})
  const defaultVideoPlacement = useMemo<"feed" | "story">(() => {
    if ((displayAsset.asset_type ?? 'image') !== 'video') {
      return 'feed'
    }
    const sourceWidth = displayAsset.width ?? imageDimensions.width
    const sourceHeight = displayAsset.height ?? imageDimensions.height
    if (sourceWidth && sourceHeight && sourceWidth < sourceHeight) {
      return 'story'
    }
    return 'feed'
  }, [displayAsset.asset_type, displayAsset.height, displayAsset.width, imageDimensions.height, imageDimensions.width])
  const [videoPlacement, setVideoPlacement] = useState<'feed' | 'story'>(defaultVideoPlacement)

  useEffect(() => {
    setVideoPlacement(defaultVideoPlacement)
  }, [defaultVideoPlacement])

  useEffect(() => {
    initializedFormatsRef.current = {}
  }, [asset.id])

  useEffect(() => {
    if (isVideo) return
    if (imageDimensions.width && imageDimensions.height) return
    if (!displayAsset.signed_url && !displayAsset.thumbnail_signed_url) return

    setIsImageLoading(true)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = displayAsset.signed_url || displayAsset.thumbnail_signed_url || ''
    img.onload = () => {
      setImageDimensions({
        width: img.naturalWidth || displayAsset.width || 1080,
        height: img.naturalHeight || displayAsset.height || 1080,
      })
      setIsImageLoading(false)
    }
    img.onerror = () => {
      setIsImageLoading(false)
    }
  }, [displayAsset.height, displayAsset.signed_url, displayAsset.thumbnail_signed_url, displayAsset.width, imageDimensions.height, imageDimensions.width, isVideo])

  useEffect(() => {
    if (!frameRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      setFrameSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(frameRef.current)
    return () => observer.disconnect()
  }, [selectedFormat])

  const activeFormat = FORMATS.find((format) => format.key === selectedFormat) ?? FORMATS[0]

  const aspectClass =
    activeFormat.key === '1.91:1'
      ? 'aspect-[1.91/1]'
      : activeFormat.key === '4:5'
      ? 'aspect-[4/5]'
      : activeFormat.key === '9:16'
      ? 'aspect-[9/16]'
      : 'aspect-square'

  const minScale = useMemo(() => {
    if (
      !imageDimensions.width ||
      !imageDimensions.height ||
      !frameSize.width ||
      !frameSize.height
    ) {
      return 1
    }

    return Math.max(
      frameSize.width / imageDimensions.width,
      frameSize.height / imageDimensions.height,
    )
  }, [frameSize.height, frameSize.width, imageDimensions.height, imageDimensions.width])

  const maxScale = minScale * MAX_ZOOM_MULTIPLIER

  useEffect(() => {
    if (!imageDimensions.width || !imageDimensions.height || !frameSize.width || !frameSize.height) {
      return
    }

    setCrops((prev) => {
      const current = prev[selectedFormat] ?? { scale: minScale, x: 0, y: 0 }
      const bounded = ensureCropWithinBounds(
        current,
        current.scale,
        minScale,
        imageDimensions.width,
        imageDimensions.height,
        frameSize.width,
        frameSize.height,
      )

      if (
        Math.abs(bounded.scale - current.scale) < EPSILON &&
        Math.abs(bounded.x - current.x) < EPSILON &&
        Math.abs(bounded.y - current.y) < EPSILON
      ) {
        return prev
      }

      return {
        ...prev,
        [selectedFormat]: bounded,
      }
    })
  }, [frameSize.height, frameSize.width, imageDimensions.height, imageDimensions.width, minScale, selectedFormat])

  const imageAspectRatio = useMemo(() => {
    if (!imageDimensions.width || !imageDimensions.height) return 1
    return imageDimensions.width / imageDimensions.height
  }, [imageDimensions.height, imageDimensions.width])

  const bestFormat = useMemo(() => {
    if (!imageAspectRatio) {
      return FORMATS[0]
    }

    const computeScale = (formatRatio: number) => Math.max(formatRatio / imageAspectRatio, 1)

    return FORMATS.reduce((best, candidate) => {
      const bestScale = computeScale(best.ratio)
      const candidateScale = computeScale(candidate.ratio)

      if (candidateScale < bestScale - EPSILON) {
        return candidate
      }

      if (Math.abs(candidateScale - bestScale) <= EPSILON) {
        return Math.abs(candidate.ratio - imageAspectRatio) < Math.abs(best.ratio - imageAspectRatio)
          ? candidate
          : best
      }

      return best
    }, FORMATS[0])
  }, [imageAspectRatio])

  useEffect(() => {
    if (didAutoSelectRef.current) return
    if (!imageAspectRatio) return
    const hasExistingCrops =
      displayAsset.image_crops && Object.keys(displayAsset.image_crops).length > 0
    if (hasExistingCrops) return

    didAutoSelectRef.current = true
    setSelectedFormat(bestFormat.key)
  }, [bestFormat.key, displayAsset.image_crops, imageAspectRatio])

  useEffect(() => {
    if (isVideo) return
    if (!imageDimensions.width || !imageDimensions.height) return
    if (!frameSize.width || !frameSize.height) return
    if (displayAsset.image_crops?.[selectedFormat]) return
    if (initializedFormatsRef.current[selectedFormat]) return

    initializedFormatsRef.current[selectedFormat] = true
    setCrops((prev) => ({
      ...prev,
      [selectedFormat]: {
        scale: minScale,
        x: 0,
        y: 0,
      },
    }))
  }, [displayAsset.image_crops, frameSize.height, frameSize.width, imageDimensions.height, imageDimensions.width, isVideo, minScale, selectedFormat])

  const activeCrop = crops[selectedFormat] ?? { scale: 1, x: 0, y: 0 }

  const overflowX = useMemo(() => {
    if (!imageDimensions.width || !frameSize.width) return 0
    return Math.max(0, (imageDimensions.width * activeCrop.scale - frameSize.width) / 2)
  }, [activeCrop.scale, frameSize.width, imageDimensions.width])

  const overflowY = useMemo(() => {
    if (!imageDimensions.height || !frameSize.height) return 0
    return Math.max(0, (imageDimensions.height * activeCrop.scale - frameSize.height) / 2)
  }, [activeCrop.scale, frameSize.height, imageDimensions.height])

  const translateX = overflowX === 0 ? 0 : activeCrop.x * overflowX
  const translateY = overflowY === 0 ? 0 : activeCrop.y * overflowY

  const sliderValue = useMemo(() => {
    if (maxScale === minScale) return 0
    return Math.round(((activeCrop.scale - minScale) / (maxScale - minScale)) * 100)
  }, [activeCrop.scale, maxScale, minScale])

  const rawVideoAspectRatio =
    imageDimensions.width && imageDimensions.height
      ? imageDimensions.width / imageDimensions.height
      : displayAsset.width && displayAsset.height
      ? displayAsset.width / displayAsset.height
      : null

  const normalizedVideoAspectRatio =
    rawVideoAspectRatio && Number.isFinite(rawVideoAspectRatio) && rawVideoAspectRatio > 0
      ? rawVideoAspectRatio
      : (displayAsset.asset_type ?? 'image') === 'video'
      ? 16 / 9
      : 1

  const placementAspectRatio =
    videoPlacement === 'story' ? 9 / 16 : normalizedVideoAspectRatio

  const updateCrop = (formatKey: string, nextState: CropState) => {
    setCrops((prev) => ({
      ...prev,
      [formatKey]: nextState,
    }))
  }

  const handleScaleChange = (nextScale: number) => {
    if (!imageDimensions.width || !imageDimensions.height) return
    const clampedScale = clamp(nextScale, minScale, maxScale)
    updateCrop(
      selectedFormat,
      ensureCropWithinBounds(
        activeCrop,
        clampedScale,
        minScale,
        imageDimensions.width,
        imageDimensions.height,
        frameSize.width || 0,
        frameSize.height || 0,
      ),
    )
  }

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const ratio = Number(event.target.value) / 100
    const scale = minScale + (maxScale - minScale) * ratio
    handleScaleChange(scale)
  }

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault()
    const delta = -event.deltaY * 0.001
    handleScaleChange(activeCrop.scale * (1 + delta))
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!frameRef.current || isVideo) return
    frameRef.current.setPointerCapture(event.pointerId)
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      crop: { ...activeCrop },
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return
    event.preventDefault()

    const { startX, startY, crop } = dragStateRef.current
    const deltaX = event.clientX - startX
    const deltaY = event.clientY - startY

    const spanX = Math.max(0, (imageDimensions.width * crop.scale - frameSize.width) / 2)
    const spanY = Math.max(0, (imageDimensions.height * crop.scale - frameSize.height) / 2)

    updateCrop(selectedFormat, {
      scale: crop.scale,
      x: spanX === 0 ? 0 : clamp(crop.x + deltaX / spanX, -1, 1),
      y: spanY === 0 ? 0 : clamp(crop.y + deltaY / spanY, -1, 1),
    })
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current && dragStateRef.current.pointerId === event.pointerId && frameRef.current) {
      frameRef.current.releasePointerCapture(event.pointerId)
      dragStateRef.current = null
    }
  }

  const handleFormatChange = (formatKey: typeof FORMATS[number]['key']) => {
    setSelectedFormat(formatKey)
  }

  const handleSave = async () => {
    if (selectedTagIds.length === 0) {
      alert('Please select at least one tag')
      return
    }

    try {
      setSaving(true)
      
      if (!isVideo) {
      const { supabase } = await import('@/lib/supabase-browser')
      
        const cropsToPersist = Object.fromEntries(
          Object.entries(crops).map(([key, value]) => [
            key,
            {
              scale: Number(value.scale.toFixed(6)),
              x: Number(value.x.toFixed(6)),
              y: Number(value.y.toFixed(6)),
            },
          ]),
        )
      
      const { error: assetError } = await supabase
        .from('assets')
        .update({
            aspect_ratio: selectedFormat,
            image_crops: cropsToPersist,
            crop_windows: null,
        })
        .eq('id', asset.id)
        .eq('brand_id', asset.brand_id)

      if (assetError) {
        throw assetError
        }
      }

      await saveAssetTags(asset.id, selectedTagIds)
      onUpdate()
      onBack()
    } catch (error) {
      console.error('Error saving asset:', error)
      alert('Failed to save asset. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {!isVideo && (
              <div className="flex flex-wrap gap-3">
                {FORMATS.map((format) => {
                  const isActive = format.key === selectedFormat
                  return (
                    <button
                      key={format.key}
                      onClick={() => handleFormatChange(format.key)}
                      className={`rounded-xl border px-4 py-2 text-left shadow-sm transition-all hover:border-[#6366F1] hover:text-[#6366F1] ${
                        isActive
                          ? 'border-[#6366F1] bg-[#EEF2FF] text-[#6366F1]'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{format.key}</span>
                      <span className={`block text-xs ${isActive ? 'text-[#4F46E5]' : 'text-gray-500'}`}>
                        {format.hint}
                      </span>
                    </button>
                  )
                })}
                </div>
            )}

            {isVideo && (
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs font-semibold text-gray-600">
                  <button
                    type="button"
                    onClick={() => setVideoPlacement('feed')}
                    className={`rounded-full px-3 py-1 transition-all ${
                      videoPlacement === 'feed'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Feed
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoPlacement('story')}
                    className={`rounded-full px-3 py-1 transition-all ${
                      videoPlacement === 'story'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Reels & Story
                  </button>
                </div>
              </div>
            )}

            <div className="relative">
                    {isVideo ? (
                <div
                  className="relative w-full overflow-hidden rounded-xl bg-black"
                  style={{ aspectRatio: `${placementAspectRatio}` }}
                >
                      <video
                    controls
                    preload="metadata"
                    poster={displayAsset.thumbnail_signed_url || undefined}
                    src={displayAsset.signed_url}
                    className="h-full w-full"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {onPreviewAsset && videoPlacement !== 'story' && (
                    <button
                      onClick={() => onPreviewAsset(displayAsset)}
                      className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-sm font-medium text-gray-900 shadow hover:bg-white"
                    >
                      <svg className="h-4 w-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Open preview
                    </button>
                  )}
                </div>
              ) : (
                <div className={`${aspectClass} relative w-full overflow-hidden rounded-xl bg-gray-100`}>
                  <div
                    ref={frameRef}
                    className="absolute inset-0 cursor-move"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onWheel={handleWheel}
                  >
                    {isImageLoading && (
                      <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                        Loading image...
                      </div>
                    )}
                    {!isImageLoading && (
                      <img
                        src={displayAsset.signed_url}
                        alt={displayAsset.title}
                        className="pointer-events-none absolute left-1/2 top-1/2 select-none"
                        style={{ 
                          width: imageDimensions.width || '100%',
                          height: imageDimensions.height || '100%',
                          maxWidth: 'none',
                          maxHeight: 'none',
                          transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${activeCrop.scale})`,
                          transformOrigin: 'center',
                        }}
                        draggable={false}
                      />
                    )}
                  </div>
                  <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-gray-900/70 px-3 py-1 text-xs font-medium text-white">
                    Drag to pan • Scroll or use slider to zoom
                  </div>
                </div>
              )}
              </div>

            {!isVideo && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700" htmlFor="crop-zoom">
                  Zoom
                </label>
                <input
                  id="crop-zoom"
                  type="range"
                  min={0}
                  max={100}
                  value={sliderValue}
                  onChange={handleSliderChange}
                  className="flex-1 accent-[#6366F1]"
                />
              </div>
            )}
          </div>

              <div className="space-y-4">
                <div>
              <h3 className="mb-3 text-lg font-semibold text-gray-950">
                Tags <span className="text-red-500">*</span>
              </h3>
                  <TagSelector
                    brandId={brandId}
                    selectedTagIds={selectedTagIds}
                    onTagsChange={setSelectedTagIds}
                    required
                  />
                </div>

            {isVideo && (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                <div className="font-medium text-gray-900">{displayAsset.title}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {displayAsset.duration_seconds != null && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-400">Duration</div>
                      <div>{Math.round(displayAsset.duration_seconds)}s</div>
                    </div>
                  )}
                  {displayAsset.file_size != null && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-400">File size</div>
                      <div>{(displayAsset.file_size / (1024 * 1024)).toFixed(1)} MB</div>
                    </div>
                  )}
                  {displayAsset.mime_type && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-400">Format</div>
                      <div>{displayAsset.mime_type}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

                <div className="flex space-x-3">
                  <button
                    onClick={handleSave}
                disabled={saving || selectedTagIds.length === 0}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#4F46E5] px-4 py-3 font-medium text-white transition-all hover:from-[#4F46E5] hover:to-[#4338CA] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
  )
}

function VideoPreviewModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(asset.signed_url ?? null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const refreshSignedUrl = async () => {
      try {
        setLoading(true)
        setError(null)
        const freshUrl = await getSignedUrl(asset.storage_path)
        if (!isActive) return
        setSignedUrl(freshUrl ?? asset.signed_url ?? null)
      } catch (err) {
        console.error('Error generating signed URL for video preview:', err)
        if (isActive) {
          setError('Unable to load this video right now.')
          setSignedUrl(null)
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    refreshSignedUrl()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      isActive = false
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [asset, onClose])

  const handleOverlayClick = () => {
    onClose()
  }

  const handleDialogClick = (event: React.MouseEvent) => {
    event.stopPropagation()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Previewing ${asset.title}`}
    >
      <div className="relative w-full max-w-4xl" onClick={handleDialogClick}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
          aria-label="Close preview"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="overflow-hidden rounded-2xl bg-black shadow-2xl">
          <div className="px-6 py-4 text-white">
            <div className="text-lg font-semibold">{asset.title}</div>
            {asset.tags && asset.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-white/70">
                {asset.tags.map((tag) => (
                  <span key={tag.id} className="rounded-full bg-white/10 px-2 py-1">
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center bg-black">
            {loading ? (
              <div className="flex h-[60vh] w-full items-center justify-center text-white/80">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
              </div>
            ) : error ? (
              <div className="flex h-[60vh] w-full items-center justify-center px-6 text-center text-sm text-red-300">
                {error}
              </div>
            ) : signedUrl ? (
              <video
                key={signedUrl}
                controls
                autoPlay
                preload="auto"
                poster={asset.thumbnail_signed_url || undefined}
                src={signedUrl}
                className="max-h-[70vh] w-full bg-black object-contain"
              />
            ) : (
              <div className="flex h-[60vh] w-full items-center justify-center px-6 text-center text-sm text-red-300">
                Unable to load this video.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}