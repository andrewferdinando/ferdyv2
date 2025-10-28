'use client'

import { useState } from 'react'
import { useTags, Tag } from '@/hooks/useTags'
import { supabase } from '@/lib/supabase-browser'

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
  const { tags, loading, createCustomTag } = useTags(brandId)
  const [showAddTagInput, setShowAddTagInput] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  // Separate tags by kind
  const subcategoryTags = tags.filter(tag => tag.kind === 'subcategory')
  const customTags = tags.filter(tag => tag.kind === 'custom')

  const handleTagToggle = (tagId: string) => {
    const newSelected = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId]
    onTagsChange(newSelected)
  }

  const handleCreateCustomTag = async () => {
    if (!newTagName.trim()) {
      return
    }

    try {
      setIsCreatingTag(true)
      const newTag = await createCustomTag(newTagName.trim())
      
      // Select the newly created tag
      onTagsChange([...selectedTagIds, newTag.id])
      
      // Reset form
      setNewTagName('')
      setShowAddTagInput(false)
    } catch (error) {
      console.error('Error creating tag:', error)
      alert(`Failed to create tag: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreatingTag(false)
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-500">Loading tags...</div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Subcategory Tags */}
      {subcategoryTags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Subcategory Tags</h4>
          <div className="flex flex-wrap gap-2">
            {subcategoryTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleTagToggle(tag.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTagIds.includes(tag.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Tags */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Tags</h4>
        <div className="flex flex-wrap gap-2">
          {customTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleTagToggle(tag.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTagIds.includes(tag.id)
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag.name}
            </button>
          ))}
          
          {/* Add Custom Tag Button/Input */}
          {showAddTagInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCustomTag()
                  } else if (e.key === 'Escape') {
                    setShowAddTagInput(false)
                    setNewTagName('')
                  }
                }}
                placeholder="Tag name"
                className="px-3 py-1 text-xs border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateCustomTag}
                disabled={isCreatingTag || !newTagName.trim()}
                className="px-2 py-1 text-xs bg-[#6366F1] text-white rounded-full hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingTag ? '...' : '✓'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddTagInput(false)
                  setNewTagName('')
                }}
                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddTagInput(true)}
              className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors border-2 border-dashed border-gray-300"
            >
              + Add Custom Tag
            </button>
          )}
        </div>
      </div>

      {/* Validation message */}
      {required && selectedTagIds.length === 0 && (
        <p className="text-xs text-red-500">At least one tag is required</p>
      )}
    </div>
  )
}

