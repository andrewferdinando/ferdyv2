'use client'

import { useState, useEffect } from 'react'
import { Asset } from '@/hooks/assets/useAssets'
import { useUpdateAsset } from '@/hooks/assets/useUpdateAsset'
import TagSelector from '@/components/assets/TagSelector'

interface EditAssetModalProps {
  asset: Asset | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  brandId: string
  saveAssetTags: (assetId: string, tagIds: string[]) => Promise<void>
}

const aspectRatios = [
  { value: 'original', label: 'Original' },
  { value: '1:1', label: '1:1 Square' },
  { value: '4:5', label: '4:5 Portrait' },
  { value: '1.91:1', label: '1.91:1 Landscape' }
]

export default function EditAssetModal({ asset, isOpen, onClose, onSave, brandId, saveAssetTags }: EditAssetModalProps) {
  const [title, setTitle] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [aspectRatio, setAspectRatio] = useState('original')
  const [cropWindows, setCropWindows] = useState('')
  const { updateAsset, updating } = useUpdateAsset()

  useEffect(() => {
    if (asset) {
      setTitle(asset.title)
      setSelectedTagIds(asset.tag_ids || [])
      setAspectRatio(asset.aspect_ratio || 'original')
      setCropWindows(asset.crop_windows ? JSON.stringify(asset.crop_windows, null, 2) : '')
    }
  }, [asset])

  const handleSave = async () => {
    if (!asset) return

    if (selectedTagIds.length === 0) {
      alert('Please select at least one tag')
      return
    }

    try {
      let parsedCropWindows = null
      if (cropWindows.trim()) {
        try {
          parsedCropWindows = JSON.parse(cropWindows)
        } catch {
          alert('Invalid JSON format for crop windows')
          return
        }
      }

      await updateAsset({
        assetId: asset.id,
        brandId: asset.brand_id,
        updates: {
          title: title.trim() || asset.title,
          aspect_ratio: aspectRatio,
          crop_windows: parsedCropWindows
        },
        onSuccess: async () => {
          // Save tags separately to asset_tags table
          await saveAssetTags(asset.id, selectedTagIds)
          onSave()
          onClose()
        },
        onError: (error) => {
          alert(`Failed to update asset: ${error}`)
        }
      })
    } catch (error) {
      console.error('Error saving asset:', error)
    }
  }

  if (!isOpen || !asset) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Asset</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              placeholder="Enter asset title"
            />
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {aspectRatios.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => setAspectRatio(ratio.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    aspectRatio === ratio.value
                      ? 'bg-[#6366F1] text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <TagSelector
              brandId={brandId}
              selectedTagIds={selectedTagIds}
              onTagsChange={setSelectedTagIds}
              required
            />
          </div>

          {/* Crop Windows (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Crop Windows (Optional)
            </label>
            <textarea
              value={cropWindows}
              onChange={(e) => setCropWindows(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent font-mono text-sm"
              rows={6}
              placeholder={`{
  "1:1": {"x":100,"y":80,"w":800,"h":800},
  "4:5": {"x":120,"y":60,"w":900,"h":1125}
}`}
            />
            <p className="text-xs text-gray-500 mt-1">
              JSON format for crop coordinates. Leave empty if not needed.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updating}
            className="px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
