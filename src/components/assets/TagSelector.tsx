'use client'

import { useTags } from '@/hooks/useTags'

interface TagSelectorProps {
  brandId: string
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
  required?: boolean
}

export default function TagSelector({
  brandId,
  selectedTagIds,
  onTagsChange,
  required = false
}: TagSelectorProps) {
  const { tags, loading, error, refetch } = useTags(brandId)

  // Only show category tags (created via Category Wizard)
  const categoryTags = tags.filter(tag => tag.kind === 'subcategory')

  const handleTagToggle = (tagId: string) => {
    const newSelected = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId]
    onTagsChange(newSelected)
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-500">Loading categories...</div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-500">
        Error loading categories: {error}
        <button
          onClick={() => refetch()}
          className="ml-2 text-blue-600 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (categoryTags.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No categories available. Create categories in the Category Wizard first.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {categoryTags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => handleTagToggle(tag.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedTagIds.includes(tag.id)
                ? 'bg-[#6366F1] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tag.name}
          </button>
        ))}
      </div>

      {/* Validation message */}
      {required && selectedTagIds.length === 0 && (
        <p className="text-xs text-red-500">Please select at least one category</p>
      )}
    </div>
  )
}

