'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAssets, Asset } from '@/hooks/assets/useAssets'
import { useDeleteAsset } from '@/hooks/assets/useDeleteAsset'
import UploadAsset from '@/components/assets/UploadAsset'
import AssetCard from '@/components/assets/AssetCard'
import EditAssetModal from '@/components/assets/EditAssetModal'

export default function ContentLibraryPage() {
  const params = useParams()
  const brandId = params.brandId as string
  const { assets, loading, error, refetch } = useAssets(brandId)
  const { deleteAsset, deleting } = useDeleteAsset()
  
  const [activeTab, setActiveTab] = useState<'ready' | 'needs_attention'>('ready')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Asset | null>(null)

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

  const needsAttentionAssets = assets.filter(asset => asset.tags.length === 0)
  const readyAssets = assets.filter(asset => asset.tags.length > 0)

  const handleUploadSuccess = (assetId: string) => {
    refetch()
    // Switch to needs attention tab to show the new asset
    setActiveTab('needs_attention')
    // Find and select the new asset
    const newAsset = assets.find(asset => asset.id === assetId)
    if (newAsset) {
      setSelectedAsset(newAsset)
    }
  }

  const handleUploadError = (error: string) => {
    alert(`Upload failed: ${error}`)
  }

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset)
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
  }

  // Show detailed view when asset is selected (Needs Attention tab)
  if (selectedAsset && activeTab === 'needs_attention') {
    return <AssetDetailView asset={selectedAsset} onBack={() => setSelectedAsset(null)} onUpdate={handleAssetUpdate} />
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
                onClick={() => setActiveTab('ready')}
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
                  if (needsAttentionAssets.length > 0) {
                    setSelectedAsset(needsAttentionAssets[0])
                  } else {
                    setActiveTab('needs_attention')
                  }
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
          <div className="p-4 sm:p-6 lg:p-10">
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
            {filteredAssets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onEdit={handleEditAsset}
                    onDelete={handleDeleteAsset}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeTab === 'ready' ? 'No ready content yet' : 'All caught up!'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {activeTab === 'ready' 
                    ? 'Tag your assets to make them ready to use' 
                    : 'No content needs attention right now'
                  }
                </p>
                <UploadAsset
                  brandId={brandId}
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                />
              </div>
            )}
          </div>
        </div>

        {/* Edit Asset Modal */}
        <EditAssetModal
          asset={editingAsset}
          isOpen={!!editingAsset}
          onClose={() => setEditingAsset(null)}
          onSave={handleAssetUpdate}
        />

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
function AssetDetailView({ asset, onBack, onUpdate }: { asset: Asset; onBack: () => void; onUpdate: () => void }) {
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(asset.aspect_ratio || 'original')
  const [selectedTags, setSelectedTags] = useState<string[]>(asset.tags || [])
  const [cropWindows] = useState(asset.crop_windows ? JSON.stringify(asset.crop_windows, null, 2) : '')

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
    // This would use the useUpdateAsset hook to save changes
    // For now, just call onUpdate to refresh the data
    onUpdate()
    onBack()
  }

  const isVideo = asset.storage_path.match(/\.(mp4|mov|avi)$/i)

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
              <button
                onClick={onBack}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Content Library
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10">
            <div className="flex space-x-8">
              <button
                onClick={onBack}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300`}
              >
                Ready to Use (0)
              </button>
              <button
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors border-[#6366F1] text-[#6366F1]`}
              >
                Needs Attention (1)
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 lg:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Section - Image Preview */}
              <div className="lg:col-span-2 space-y-6">
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
              <div className="space-y-6">
                {/* Available Tags */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-950 mb-4">Available Tags</h3>
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
                    className="flex-1 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white px-4 py-3 rounded-xl font-medium hover:from-[#4F46E5] hover:to-[#4338CA] transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}