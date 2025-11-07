'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import Breadcrumb from '@/components/navigation/Breadcrumb'
import { useAssets, Asset } from '@/hooks/assets/useAssets'
import { useDeleteAsset } from '@/hooks/assets/useDeleteAsset'
import UploadAsset from '@/components/assets/UploadAsset'
import AssetCard from '@/components/assets/AssetCard'
import TagSelector from '@/components/assets/TagSelector'

interface CropData {
  x: number
  y: number
}

// Search Icon Component
const SearchIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default function ContentLibraryPage() {
  const params = useParams()
  const brandId = params.brandId as string
  const { assets, loading, error, refetch, saveAssetTags } = useAssets(brandId)
  const { deleteAsset, deleting } = useDeleteAsset()
  
  const [activeTab, setActiveTab] = useState<'ready' | 'needs_attention'>('ready')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Asset | null>(null)
  const [editingAssetData, setEditingAssetData] = useState<Asset | null>(null)

  // Filter assets based on tab and search
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags.some(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
    
    if (activeTab === 'ready') {
      return asset.tags.length > 0 && matchesSearch
    } else {
      return asset.tags.length === 0 && matchesSearch
    }
  })

  const needsAttentionAssets = assets
    .filter(asset => asset.tags.length === 0)
    .sort((a, b) => {
      // If we have editingAssetData, prioritize that asset first
      if (editingAssetData) {
        if (a.id === editingAssetData.id) return -1
        if (b.id === editingAssetData.id) return 1
      }
      // Otherwise, sort by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  const readyAssets = assets.filter(asset => asset.tags.length > 0)

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
                <div className="mb-4">
                  <Breadcrumb />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
                <p className="text-gray-600 mt-1">Manage your images and videos</p>
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
              <div className="mb-6">
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
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'needs_attention' ? (
              // Needs Attention tab - show processing interface directly
              needsAttentionAssets.length > 0 ? (
                <AssetDetailView 
                  asset={needsAttentionAssets[0]} 
                  originalAssetData={editingAssetData}
                  onBack={() => {}} 
                  onUpdate={handleAssetUpdate}
                  brandId={brandId}
                  saveAssetTags={saveAssetTags}
                />
              ) : (
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
            ) : (
              // Ready to Use tab - show grid of ready assets
              filteredAssets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredAssets.map((asset) => (
                    <div key={asset.id}>
                      <AssetCard
                        asset={asset}
                        onEdit={handleEditAsset}
                        onDelete={handleDeleteAsset}
                      />
                    </div>
                  ))}
                </div>
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
      </AppLayout>
    </RequireAuth>
  )
}

// Asset Detail View Component for Needs Attention tab
function AssetDetailView({ asset, originalAssetData, onBack, onUpdate, brandId, saveAssetTags }: { 
  asset: Asset; 
  originalAssetData: Asset | null; 
  onBack: () => void; 
  onUpdate: () => void;
  brandId: string;
  saveAssetTags: (assetId: string, tagIds: string[]) => Promise<void>;
}) {
  // Use original asset data if available (for editing), otherwise use current asset data
  const displayAsset = originalAssetData || asset
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(displayAsset.aspect_ratio || 'original')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(displayAsset.tag_ids || [])
  const [cropWindows] = useState(displayAsset.crop_windows ? JSON.stringify(displayAsset.crop_windows, null, 2) : '')
  const [saving, setSaving] = useState(false)
  const [imagePosition, setImagePosition] = useState(() => {
    // Initialize position from saved crop_windows data
    if (displayAsset.crop_windows && typeof displayAsset.crop_windows === 'object') {
      const cropData = displayAsset.crop_windows[selectedAspectRatio] || displayAsset.crop_windows[displayAsset.aspect_ratio]
      if (cropData && typeof cropData === 'object' && 'x' in cropData && 'y' in cropData) {
        return { x: (cropData as CropData).x || 0, y: (cropData as CropData).y || 0 }
      }
    }
    // Default to center the 150% image properly
    return { x: 0, y: 0 }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const aspectRatios = [
    { value: 'original', label: 'Original' },
    { value: '1:1', label: '1:1 Square' },
    { value: '4:5', label: '4:5 Portrait' },
    { value: '1.91:1', label: '1.91:1 Landscape' }
  ]

  const handleAspectRatioChange = (ratio: string) => {
    setSelectedAspectRatio(ratio)
    
    // Update image position based on saved crop data for this aspect ratio
    if (displayAsset.crop_windows && typeof displayAsset.crop_windows === 'object') {
      const cropData = displayAsset.crop_windows[ratio]
      if (cropData && typeof cropData === 'object' && 'x' in cropData && 'y' in cropData) {
        setImagePosition({ x: (cropData as CropData).x || 0, y: (cropData as CropData).y || 0 })
      } else {
        setImagePosition({ x: 0, y: 0 })
      }
    } else {
      setImagePosition({ x: 0, y: 0 })
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    
    // Constrain movement within reasonable bounds (larger since image is 150% size)
    const maxX = 150
    const maxY = 150
    const constrainedX = Math.max(-maxX, Math.min(maxX, newX))
    const constrainedY = Math.max(-maxY, Math.min(maxY, newY))
    
    setImagePosition({ x: constrainedX, y: constrainedY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleSave = async () => {
    if (selectedTagIds.length === 0) {
      alert('Please select at least one tag')
      return
    }

    try {
      setSaving(true)
      
      const { supabase } = await import('@/lib/supabase-browser')
      
      // Update the asset with aspect ratio and crop position
      const cropData = {
        [selectedAspectRatio]: {
          x: imagePosition.x,
          y: imagePosition.y,
          ...(cropWindows.trim() ? JSON.parse(cropWindows) : {})
        }
      }
      
      const { error: assetError } = await supabase
        .from('assets')
        .update({
          aspect_ratio: selectedAspectRatio,
          crop_windows: cropData
        })
        .eq('id', asset.id)
        .eq('brand_id', asset.brand_id)

      if (assetError) {
        throw assetError
      }

      // Save tags to asset_tags table
      await saveAssetTags(asset.id, selectedTagIds)

      // Refresh the data
      onUpdate()
      onBack()
    } catch (error) {
      console.error('Error saving asset:', error)
      alert('Failed to save asset. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isVideo = asset.storage_path.match(/\.(mp4|mov|avi)$/i)

  return (
    <div className="flex-1 overflow-auto">

          {/* Content */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Section - Image Preview */}
              <div className="lg:col-span-2 space-y-4">
                {/* Aspect Ratio Selection */}
                <div className="flex space-x-3">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => handleAspectRatioChange(ratio.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedAspectRatio === ratio.value
                          ? 'bg-[#6366F1] text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>

                {/* Image Preview */}
                <div className="relative">
                  <div 
                    className={`bg-gray-100 rounded-xl overflow-hidden cursor-move ${
                      selectedAspectRatio === '1.91:1' ? 'aspect-[1.91/1]' :
                      selectedAspectRatio === '4:5' ? 'aspect-[4/5]' :
                      selectedAspectRatio === '1:1' ? 'aspect-square' :
                      'aspect-square'
                    }`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {isVideo ? (
                      <video
                        src={asset.signed_url}
                        className="select-none"
                        style={{ 
                          width: '150%',
                          height: '150%',
                          objectFit: 'contain',
                          objectPosition: '50% 50%',
                          transform: `translate(calc(-25% + ${imagePosition.x}px), calc(-25% + ${imagePosition.y}px))`,
                          transition: isDragging ? 'none' : 'transform 0.2s ease'
                        }}
                        muted
                      />
                    ) : (
                      <img 
                        src={asset.signed_url}
                        alt={asset.title}
                        className="select-none"
                        style={{ 
                          width: '150%',
                          height: '150%',
                          objectFit: 'contain',
                          objectPosition: '50% 50%',
                          transform: `translate(calc(-25% + ${imagePosition.x}px), calc(-25% + ${imagePosition.y}px))`,
                          transition: isDragging ? 'none' : 'transform 0.2s ease'
                        }}
                        draggable={false}
                      />
                    )}
                  </div>
                  <div className="absolute top-4 left-4 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm">
                    Click and drag to reposition
                  </div>
                </div>
              </div>

              {/* Right Section - Tags and Actions */}
              <div className="space-y-4">
                {/* Tags */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-950 mb-3">Tags</h3>
                  <TagSelector
                    brandId={brandId}
                    selectedTagIds={selectedTagIds}
                    onTagsChange={setSelectedTagIds}
                    required
                  />
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white px-4 py-3 rounded-xl font-medium hover:from-[#4F46E5] hover:to-[#4338CA] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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