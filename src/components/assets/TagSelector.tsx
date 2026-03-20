'use client'

import { useState } from 'react'
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
  const [pendingTagId, setPendingTagId] = useState<string | null>(null)

  // Only show category tags (created via Category Wizard)
  const categoryTags = tags.filter(tag => tag.kind === 'subcategory')

  // Count how many currently selected tags are category tags
  const selectedCategoryCount = selectedTagIds.filter(id =>
    categoryTags.some(t => t.id === id)
  ).length

  const handleTagToggle = (tagId: string) => {
    const isRemoving = selectedTagIds.includes(tagId)

    if (!isRemoving && selectedCategoryCount >= 1) {
      // Trying to add a 2nd+ category tag — show warning
      setPendingTagId(tagId)
      return
    }

    const newSelected = isRemoving
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId]
    onTagsChange(newSelected)
  }

  const confirmAddTag = () => {
    if (pendingTagId) {
      onTagsChange([...selectedTagIds, pendingTagId])
      setPendingTagId(null)
    }
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

      {/* Multi-category warning */}
      {pendingTagId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-800 mb-1">
            This image is already assigned to a category
          </p>
          <p className="text-xs text-amber-700 mb-3">
            Adding it to multiple categories could result in the same image appearing in back-to-back posts. Are you sure you want to continue?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmAddTag}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              Yes, add to both
            </button>
            <button
              type="button"
              onClick={() => setPendingTagId(null)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

