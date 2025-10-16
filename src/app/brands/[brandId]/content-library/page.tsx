'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAssets, Asset } from '@/hooks/assets/useAssets'
import { useDeleteAsset } from '@/hooks/assets/useDeleteAsset'
import UploadAsset from '@/components/assets/UploadAsset'
import AssetCard from '@/components/assets/AssetCard'

export default function ContentLibraryPage() {
  const params = useParams()
  const brandId = params.brandId as string
  const { assets, loading, error, refetch } = useAssets(brandId)
  const { deleteAsset, deleting } = useDeleteAsset()
  
  const [activeTab, setActiveTab] = useState<'ready' | 'needs_attention'>('ready')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Asset | null>(null)
  const [editingAssetData, setEditingAssetData] = useState<Asset | null>(null)

  // Filter assets based on tab and search
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
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
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">🔍</div>
                  <input
                    type="text"
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
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
function AssetDetailView({ asset, originalAssetData, onBack, onUpdate }: { asset: Asset; originalAssetData: Asset | null; onBack: () => void; onUpdate: () => void }) {
  // Use original asset data if available (for editing), otherwise use current asset data
  const displayAsset = originalAssetData || asset
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(displayAsset.aspect_ratio || 'original')
  const [selectedTags, setSelectedTags] = useState<string[]>(displayAsset.tags || [])
  const [cropWindows] = useState(displayAsset.crop_windows ? JSON.stringify(displayAsset.crop_windows, null, 2) : '')
  const [saving, setSaving] = useState(false)

  const availableTags = [
    'Student Discount', 'Happy Hour Special', 'Corporate Team Building',
    'Weekend Special', 'Family Package', 'Birthday Party', 'Holiday Special', 'Summer Promotion'
  ]

  const aspectRatios = [
    { value: 'original', label: 'Original' },
    { value: '1:1', label: '1:1 Square' },
    { value: '4:5', label: '4:5 Portrait' },
    { value: '1.91:1', label: '1.91:1 Landscape' }
  ]

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const { supabase } = await import('@/lib/supabase-browser')
      
      // Update the asset with new tags and aspect ratio
      const { error } = await supabase
        .from('assets')
        .update({
          tags: selectedTags,
          aspect_ratio: selectedAspectRatio,
          crop_windows: cropWindows.trim() ? JSON.parse(cropWindows) : null
        })
        .eq('id', asset.id)
        .eq('brand_id', asset.brand_id)

      if (error) {
        throw error
      }

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
                      onClick={() => setSelectedAspectRatio(ratio.value)}
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
                  <div className={`bg-gray-100 rounded-xl overflow-hidden ${
                    selectedAspectRatio === '1.91:1' ? 'aspect-[1.91/1]' :
                    selectedAspectRatio === '4:5' ? 'aspect-[4/5]' :
                    selectedAspectRatio === '1:1' ? 'aspect-square' :
                    'aspect-square'
                  }`}>
                    {isVideo ? (
                      <video
                        src={asset.signed_url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img 
                        src={asset.signed_url}
                        alt={asset.title}
                        className="w-full h-full object-cover"
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
                {/* Available Tags */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-950 mb-3">Available Tags</h3>
                  <div className="grid grid-cols-2 gap-1">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-[#6366F1] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                    <button className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                      + Tag
                    </button>
                  </div>
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