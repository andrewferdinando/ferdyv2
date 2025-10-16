'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAssets } from '@/hooks/useAssets'

// Icons
const UploadIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);


// Mock data for demonstration
const mockAssets = [
  {
    id: '1',
    title: 'Go-kart racing kids',
    storage_path: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
    tags: ['Student Discount', 'Happy Hour Special'],
    status: 'ready'
  },
  {
    id: '2', 
    title: 'Go-kart child waving',
    storage_path: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
    tags: ['Corporate Team Building', 'Student Discount'],
    status: 'ready'
  },
  {
    id: '3',
    title: 'Outdoor party scene',
    storage_path: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=400&fit=crop',
    tags: [],
    status: 'needs_attention'
  }
];

export default function ContentLibraryPage() {
  const params = useParams()
  const brandId = params.brandId as string
  const { loading } = useAssets(brandId)
  
  const [activeTab, setActiveTab] = useState<'ready' | 'needs_attention'>('ready')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)

  // Use mock data for now
  const allAssets = mockAssets
  const readyAssets = allAssets.filter(asset => asset.status === 'ready')
  const needsAttentionAssets = allAssets.filter(asset => asset.status === 'needs_attention')
  
  const filteredAssets = allAssets.filter(asset => 
    asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  ).filter(asset => {
    if (activeTab === 'ready') return asset.status === 'ready'
    if (activeTab === 'needs_attention') return asset.status === 'needs_attention'
    return true
  })

  const handleUpload = () => {
    // TODO: Implement upload functionality
    console.log('Upload content clicked - deployment test')
  }

  const handleEditAsset = (assetId: string) => {
    setSelectedAsset(assetId)
  }

  const handleDeleteAsset = (assetId: string) => {
    // TODO: Implement delete functionality
    console.log('Delete asset:', assetId)
  }

  // Show detailed view when asset is selected
  if (selectedAsset) {
    return <AssetDetailView onBack={() => setSelectedAsset(null)} />
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
                onClick={handleUpload}
                className="flex items-center space-x-2 px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors"
              >
                <UploadIcon />
                <span>Upload Content</span>
              </button>
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
                    setSelectedAsset(needsAttentionAssets[0].id)
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
            {activeTab === 'ready' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset) => (
                    <div key={asset.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                      {/* Image/Video */}
                      <div className="aspect-square bg-gray-200 overflow-hidden">
                        <img
                          src={asset.storage_path}
                          alt={asset.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<div class="flex items-center justify-center text-gray-400"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                          }}
                        />
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {asset.tags.map((tag, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 text-xs font-medium rounded-full"
                              style={{
                                backgroundColor: getTagColor(tag).bg,
                                color: getTagColor(tag).text
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => handleEditAsset(asset.id)}
                            className="p-2 text-[#6366F1] hover:text-[#4F46E5] hover:bg-[#EEF2FF] rounded-lg transition-colors duration-200"
                            title="Edit"
                          >
                            <EditIcon />
                          </button>
                          <button 
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <UploadIcon className="w-16 h-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
                    <p className="text-gray-600 mb-4">Upload some images or videos to get started</p>
                    <button
                      onClick={handleUpload}
                      className="px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors"
                    >
                      Upload Content
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <UploadIcon className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-600 mb-4">No content needs attention right now</p>
                <button
                  onClick={handleUpload}
                  className="px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors"
                >
                  Upload Content
                </button>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}

// Helper function for tag colors
function getTagColor(tag: string) {
  const colors: { [key: string]: { bg: string; text: string } } = {
    'Student Discount': { bg: '#DBEAFE', text: '#1E40AF' },
    'Happy Hour Special': { bg: '#D1FAE5', text: '#065F46' },
    'Corporate Team Building': { bg: '#F3E8FF', text: '#7C3AED' },
    'Weekend Special': { bg: '#FEF3C7', text: '#D97706' },
    'Family Package': { bg: '#FCE7F3', text: '#BE185D' },
    'Birthday Party': { bg: '#F0FDF4', text: '#166534' },
    'Holiday Special': { bg: '#FFF7ED', text: '#EA580C' },
    'Summer Promotion': { bg: '#ECFDF5', text: '#047857' }
  }
  return colors[tag] || { bg: '#F3F4F6', text: '#374151' }
}

// Asset Detail View Component
function AssetDetailView({ onBack }: { onBack: () => void }) {
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<'landscape' | 'portrait' | 'square'>('square')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const availableTags = [
    'Student Discount', 'Happy Hour Special', 'Corporate Team Building',
    'Weekend Special', 'Family Package', 'Birthday Party', 'Holiday Special', 'Summer Promotion'
  ]

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleNextImage = () => {
    // TODO: Navigate to next image
    console.log('Next image clicked')
  }

  const handleDeleteImage = () => {
    // TODO: Delete current image
    console.log('Delete image clicked')
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
                Ready to Use (2)
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
                  <button
                    onClick={() => setSelectedAspectRatio('landscape')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedAspectRatio === 'landscape'
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    1.91:1 Landscape
                  </button>
                  <button
                    onClick={() => setSelectedAspectRatio('portrait')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedAspectRatio === 'portrait'
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    4:5 Portrait
                  </button>
                  <button
                    onClick={() => setSelectedAspectRatio('square')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedAspectRatio === 'square'
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    1:1 Square
                  </button>
                </div>

                {/* Image Preview */}
                <div className="relative">
                  <div className={`bg-gray-100 rounded-xl overflow-hidden ${
                    selectedAspectRatio === 'landscape' ? 'aspect-[1.91/1]' :
                    selectedAspectRatio === 'portrait' ? 'aspect-[4/5]' :
                    'aspect-square'
                  }`}>
                    <img 
                      src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=800&fit=crop"
                      alt="Content preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = '<div class="flex items-center justify-center text-gray-400"><svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                      }}
                    />
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
                    onClick={handleNextImage}
                    className="flex-1 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white px-4 py-3 rounded-xl font-medium hover:from-[#4F46E5] hover:to-[#4338CA] transition-all"
                  >
                    Next Image
                  </button>
                  <button
                    onClick={handleDeleteImage}
                    className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
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