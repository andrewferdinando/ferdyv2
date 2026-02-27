'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import SortableAssetItem from './SortableAssetItem'
import type { Asset } from '@/hooks/assets/useAssets'

export interface AssetUsageInfo {
  usedCount: number
  queuedCount: number
}

const PAGE_SIZE = 12

interface SortableAssetGridProps {
  assets: Asset[]
  selectedIds: string[]
  onReorder: (newOrder: string[]) => void
  onRemove: (id: string) => void
  assetUsage?: Map<string, AssetUsageInfo>
}

export default function SortableAssetGrid({
  assets,
  selectedIds,
  onReorder,
  onRemove,
  assetUsage,
}: SortableAssetGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Map selectedIds to ordered assets (preserving selection order)
  const orderedAssets = selectedIds
    .map(id => assets.find(a => a.id === id))
    .filter((a): a is Asset => a !== undefined)

  const visibleAssets = orderedAssets.slice(0, visibleCount)
  const visibleIds = visibleAssets.map(a => a.id)
  const hasMore = orderedAssets.length > visibleCount

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = selectedIds.indexOf(active.id as string)
      const newIndex = selectedIds.indexOf(over.id as string)
      const newOrder = arrayMove(selectedIds, oldIndex, newIndex)
      onReorder(newOrder)
    }
  }

  if (orderedAssets.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <p className="text-sm text-gray-500">
          No media selected yet. Upload or select images from the library below.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Drag to reorder. First image will be used for the first post.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {visibleAssets.map((asset, index) => (
              <SortableAssetItem
                key={asset.id}
                asset={asset}
                position={index + 1}
                onRemove={onRemove}
                usage={assetUsage?.get(asset.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
            className="px-6 py-2 text-sm font-medium text-[#6366F1] border border-[#6366F1] rounded-lg hover:bg-[#EEF2FF] transition-colors"
          >
            Show more ({orderedAssets.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  )
}
