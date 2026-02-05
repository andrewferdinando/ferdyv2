'use client'

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
        <SortableContext items={selectedIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 gap-4">
            {orderedAssets.map((asset, index) => (
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
    </div>
  )
}
