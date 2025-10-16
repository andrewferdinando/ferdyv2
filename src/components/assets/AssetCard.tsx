'use client'

import { Asset } from '@/hooks/assets/useAssets'

interface AssetCardProps {
  asset: Asset
  onEdit: (asset: Asset) => void
  onDelete: (asset: Asset) => void
}

export default function AssetCard({ asset, onEdit, onDelete }: AssetCardProps) {
  const isVideo = asset.storage_path.match(/\.(mp4|mov|avi)$/i)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Image/Video */}
      <div className="aspect-square bg-gray-200 overflow-hidden">
        {!asset.signed_url ? (
          <div className="flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
        ) : isVideo ? (
          <video
            src={asset.signed_url}
            className="w-full h-full object-cover"
            muted
            onError={(e) => {
              const target = e.target as HTMLVideoElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<div class="flex items-center justify-center text-gray-400"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></div>';
            }}
          />
        ) : (
          <img
            src={asset.signed_url}
            alt={asset.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<div class="flex items-center justify-center text-gray-400"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-sm font-medium text-gray-900 mb-2 truncate" title={asset.title}>
          {asset.title}
        </h3>

        {/* Tags */}
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
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
        )}

        {/* Actions */}
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
