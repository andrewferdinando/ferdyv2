'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/ui/Modal';
import { Form, FormField, FormActions } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { useAssets, Asset } from '@/hooks/assets/useAssets';
import { channelSupportsMedia, describeChannelSupport } from '@/lib/channelSupport';
import { usePublishNow } from '@/hooks/usePublishNow';
import PublishProgressModal from '@/components/schedule/PublishProgressModal';
import ChannelSelector from '@/components/forms/ChannelSelector';

const CROP_RATIOS: Record<string, number> = {
  '1:1': 1,
  '4:5': 4 / 5,
  '1.91:1': 1.91,
  '9:16': 9 / 16,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const ensureCropWithinBounds = (
  crop: { scale: number; x: number; y: number },
  nextScale: number,
  minScale: number,
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
) => {
  const safeScale = Math.max(nextScale, minScale);

  const overflowX = Math.max(0, (imageWidth * safeScale - frameWidth) / 2);
  const overflowY = Math.max(0, (imageHeight * safeScale - frameHeight) / 2);

  const prevOverflowX = Math.max(0, (imageWidth * crop.scale - frameWidth) / 2);
  const prevOverflowY = Math.max(0, (imageHeight * crop.scale - frameHeight) / 2);

  const prevPxX = prevOverflowX === 0 ? 0 : crop.x * prevOverflowX;
  const prevPxY = prevOverflowY === 0 ? 0 : crop.y * prevOverflowY;

  return {
    scale: safeScale,
    x: overflowX === 0 ? 0 : clamp(prevPxX / overflowX, -1, 1),
    y: overflowY === 0 ? 0 : clamp(prevPxY / overflowY, -1, 1),
  };
};

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
  onSuccess: () => void;
}

type AssetTab = 'images' | 'videos';

export default function NewPostModal({ isOpen, onClose, brandId, onSuccess }: NewPostModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    copy: '',
    hashtags: '',
    asset_ids: [] as string[],
    channels: [] as string[],
    scheduled_at: '',
    approve_now: false
  });
  const [assetTab, setAssetTab] = useState<AssetTab>('images');
  const [isLoading, setIsLoading] = useState(false);
  const [publishMode, setPublishMode] = useState<'schedule' | 'publish-now'>('schedule');
  const { assets, loading: assetsLoading } = useAssets(brandId, { onlyReady: true });
  
  // Use shared publish-now hook
  const {
    isPublishing: isPublishingNow,
    isModalOpen: isPublishModalOpen,
    modalMessage: publishModalMessage,
    isModalComplete: isPublishModalComplete,
    publishNow: publishDraftNow,
    closeModal: closePublishModal,
  } = usePublishNow();

  const { imageAssets, videoAssets } = useMemo(() => {
    const grouped = assets.reduce(
      (acc, asset) => {
        if ((asset.asset_type ?? 'image') === 'video') {
          acc.videoAssets.push(asset);
        } else {
          acc.imageAssets.push(asset);
        }
        return acc;
      },
      { imageAssets: [] as Asset[], videoAssets: [] as Asset[] }
    );
    return grouped;
  }, [assets]);

  const assetsForActiveTab = assetTab === 'videos' ? videoAssets : imageAssets;

  const selectedAssets = useMemo(() => {
    if (formData.asset_ids.length === 0) {
      return [] as Asset[];
    }
    return assets.filter((asset) => formData.asset_ids.includes(asset.id));
  }, [assets, formData.asset_ids]);

  const selectedMediaTypes = useMemo(() => {
    const types = new Set<'image' | 'video'>();
    selectedAssets.forEach((asset) => types.add(asset.asset_type ?? 'image'));
    return types;
  }, [selectedAssets]);

  const channelsSupportSelection = useMemo(() => {
    if (selectedMediaTypes.size === 0) {
      return true;
    }
    return formData.channels.every((channel) =>
      Array.from(selectedMediaTypes).every((type) => channelSupportsMedia(channel, type)),
    );
  }, [formData.channels, selectedMediaTypes]);

  const handleSubmit = async (e?: React.FormEvent, mode?: 'schedule' | 'publish-now') => {
    e?.preventDefault();
    
    const submitMode = mode || publishMode;
    
    try {
      setIsLoading(true);

      // Validate required fields
      if (!formData.copy.trim()) {
        alert('Please enter post copy');
        return;
      }
      if (formData.channels.length === 0) {
        alert('Please select at least one channel');
        return;
      }
      
      // For publish-now, scheduled_at is optional (we'll use now())
      // For schedule, it's required
      if (submitMode === 'schedule' && !formData.scheduled_at) {
        alert('Please select a scheduled date and time');
        return;
      }

      if (!channelsSupportSelection) {
        alert('One or more selected channels do not support the chosen media type. Please adjust your selection.');
        return;
      }

      // Parse hashtags
      const hashtagsArray = formData.hashtags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);

      console.log('Creating post with data:', {
        brandId,
        copy: formData.copy,
        hashtags: hashtagsArray,
        asset_ids: formData.asset_ids,
        channels: formData.channels,
        scheduled_at: formData.scheduled_at,
        approve_now: submitMode === 'publish-now' ? true : formData.approve_now,
        publishMode: submitMode,
      });

      // Create manual post using RPC
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // For publish-now, use current time (or a couple minutes in the future)
      // The publish-now endpoint will publish immediately regardless
      const scheduledAt = submitMode === 'publish-now'
        ? new Date(Date.now() + 2 * 60 * 1000).toISOString() // 2 minutes from now
        : (formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null);

      const { data, error } = await supabase.rpc('rpc_create_manual_post', {
        p_brand_id: brandId,
        p_copy: formData.copy,
        p_hashtags: hashtagsArray,
        p_asset_ids: formData.asset_ids,
        p_channels: formData.channels,
        p_scheduled_at: scheduledAt,
        p_approve_now: submitMode === 'publish-now' ? true : formData.approve_now
      });

      console.log('RPC response:', { data, error });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      console.log('Post created successfully, draft IDs:', data);

      // Extract draftId from RPC response
      // RPC may return a single UUID or an array of UUIDs
      let draftId: string | null = null;
      if (Array.isArray(data)) {
        draftId = data.length > 0 ? data[0] : null;
      } else if (typeof data === 'string') {
        draftId = data;
      } else if (data && typeof data === 'object' && 'id' in data) {
        draftId = (data as { id: string }).id;
      }

      if (!draftId) {
        throw new Error('RPC did not return a draft ID');
      }

      // If publish-now mode, trigger publishing
      if (submitMode === 'publish-now') {
        await publishDraftNow(draftId, {
          channels: formData.channels,
          onSuccess: async () => {
            // Close the new post modal
            onClose();
            
            // Reset form
            setFormData({
              copy: '',
              hashtags: '',
              asset_ids: [],
              channels: [],
              scheduled_at: '',
              approve_now: false
            });
            setPublishMode('schedule');
            
            // Navigate to Schedule → Published tab
            router.push(`/brands/${brandId}/schedule?tab=published`);
            
            // Call onSuccess to refresh the drafts list
            onSuccess();
          },
          onError: () => {
            // Keep modal open on error, form data preserved
            setIsLoading(false);
          },
        });
      } else {
        // Regular schedule mode - just close and refresh
        onSuccess();
        onClose();
        
        // Reset form
        setFormData({
          copy: '',
          hashtags: '',
          asset_ids: [],
          channels: [],
          scheduled_at: '',
          approve_now: false
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      alert(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const toggleAsset = (asset: Asset) => {
    setFormData((prev) => {
      const alreadySelected = prev.asset_ids.includes(asset.id);

      if (alreadySelected) {
        return {
          ...prev,
          asset_ids: prev.asset_ids.filter((id) => id !== asset.id),
        };
      }

      const mediaType = asset.asset_type ?? 'image';
      const incompatibleChannel = prev.channels.find(
        (channel) => !channelSupportsMedia(channel, mediaType),
      );

      if (incompatibleChannel) {
        alert(
          `The ${incompatibleChannel} channel does not support ${
            mediaType === 'video' ? 'video' : 'image'
          } posts. Remove the incompatible channel or choose different media.`,
        );
        return prev;
      }

      return {
        ...prev,
        asset_ids: [...prev.asset_ids, asset.id],
      };
    });
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Post"
      subtitle="Schedule a manual post across your social channels"
      maxWidth="2xl"
    >
      <Form onSubmit={handleSubmit}>
        <FormField label="Post Copy" required>
          <textarea
            value={formData.copy}
            onChange={(e) => setFormData({ ...formData, copy: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            rows={4}
            placeholder="What do you want to share?"
          />
        </FormField>

        <FormField label="Hashtags">
          <Input
            type="text"
            value={formData.hashtags}
            onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
            placeholder="Enter hashtags separated by commas (e.g., #marketing, #social)"
          />
        </FormField>

        <FormField label="Select Assets">
          <div className="mb-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAssetTab('images')}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                assetTab === 'images'
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Images ({imageAssets.length})
            </button>
            <button
              type="button"
              onClick={() => setAssetTab('videos')}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                assetTab === 'videos'
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Videos ({videoAssets.length})
            </button>
          </div>

          {assetsLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-gray-500">
              Loading assets...
            </div>
          ) : assetsForActiveTab.length > 0 ? (
            <div className="grid max-h-64 grid-cols-3 gap-3 overflow-y-auto">
              {assetsForActiveTab.map((asset) => {
                const isSelected = formData.asset_ids.includes(asset.id);
                const isVideo = (asset.asset_type ?? 'image') === 'video';
                const previewUrl = isVideo
                  ? asset.thumbnail_signed_url || asset.signed_url
                  : asset.thumbnail_signed_url || asset.signed_url;

                const formatKey = (Object.keys(CROP_RATIOS) as Array<keyof typeof CROP_RATIOS>).includes(
                  asset.aspect_ratio as keyof typeof CROP_RATIOS,
                )
                  ? (asset.aspect_ratio as keyof typeof CROP_RATIOS)
                  : '1:1';
                const frameRatio = CROP_RATIOS[formatKey];

                const imageWidth = asset.width ?? 1080;
                const imageHeight = asset.height ?? 1080;
                const imageRatio = imageWidth / Math.max(imageHeight, 1);
                const minScale = Math.max(frameRatio / imageRatio, 1);

                const storedCrop = asset.image_crops?.[formatKey];
                const crop = ensureCropWithinBounds(
                  {
                    scale: storedCrop?.scale ?? minScale,
                    x: storedCrop?.x ?? 0,
                    y: storedCrop?.y ?? 0,
                  },
                  storedCrop?.scale ?? minScale,
                  minScale,
                  imageRatio,
                  1,
                  frameRatio,
                  1,
                );

                const overflowX = Math.max(0, (imageRatio * crop.scale - frameRatio) / 2);
                const overflowY = Math.max(0, (crop.scale - 1) / 2);
                const translateXPercent = overflowX === 0 ? 0 : (crop.x * overflowX * 100) / frameRatio;
                const translateYPercent = overflowY === 0 ? 0 : crop.y * overflowY * 100;
                const widthPercent = (imageRatio * crop.scale * 100) / frameRatio;
                const heightPercent = crop.scale * 100;

                return (
                  <button
                    type="button"
                    key={asset.id}
                    onClick={() => toggleAsset(asset)}
                    className={`group relative flex flex-col overflow-hidden rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-[#6366F1] ring-2 ring-[#6366F1] ring-opacity-20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: frameRatio }}>
                      {previewUrl ? (
                        isVideo ? (
                          <img
                            src={previewUrl}
                            alt={asset.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <img
                            src={previewUrl}
                            alt={asset.title}
                            className="pointer-events-none absolute left-1/2 top-1/2 transition-transform duration-200 group-hover:scale-[1.02]"
                            style={{
                              width: `${widthPercent}%`,
                              height: `${heightPercent}%`,
                              transform: `translate(-50%, -50%) translate(${translateXPercent}%, ${translateYPercent}%)`,
                              transformOrigin: 'center',
                            }}
                            draggable={false}
                          />
                        )
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">
                          No preview
                        </div>
                      )}
                      {isVideo && previewUrl && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#6366F1] shadow">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#6366F1] text-white shadow">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-1">
                      <p className="truncate text-xs font-medium text-gray-700">{asset.title}</p>
                      <p className="text-xs text-gray-400">
                        {isVideo
                          ? `${asset.duration_seconds ? `${Math.round(asset.duration_seconds)}s` : 'Video'}`
                          : asset.aspect_ratio || 'Image'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {assetTab === 'videos'
                ? 'No videos available yet. Upload a video in the Content Library.'
                : 'No images available yet. Upload an image in the Content Library.'}
            </p>
          )}
        </FormField>

        <FormField label="Channels" required>
          <ChannelSelector
            selectedChannels={formData.channels}
            onChannelsChange={(channels) => setFormData({ ...formData, channels })}
            selectedMediaTypes={selectedMediaTypes}
            required
          />
        </FormField>

        <FormField label="Schedule Date & Time" required>
          <Input
            type="datetime-local"
            value={formData.scheduled_at}
            onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
          />
        </FormField>

        {publishMode === 'schedule' && (
          <FormField label="">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.approve_now}
                onChange={(e) => setFormData({ ...formData, approve_now: e.target.checked })}
                className="rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
              />
              <span className="text-sm text-gray-700">Approve immediately (skip draft review)</span>
            </label>
          </FormField>
        )}

        <div className="flex items-center justify-between gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading || isPublishingNow}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleSubmit(undefined, 'schedule')}
              disabled={isLoading || isPublishingNow}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && publishMode === 'schedule' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Creating...</span>
                </>
              ) : (
                'Schedule'
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(undefined, 'publish-now')}
              disabled={isLoading || isPublishingNow}
              className="px-4 py-2 text-sm font-medium bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading || isPublishingNow ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{isPublishingNow ? 'Publishing...' : 'Creating...'}</span>
                </>
              ) : (
                'Publish now'
              )}
            </button>
          </div>
        </div>
      </Form>

      {/* Publish Progress Modal */}
      <PublishProgressModal
        isOpen={isPublishModalOpen}
        message={publishModalMessage}
        isComplete={isPublishModalComplete}
        onClose={closePublishModal}
      />
    </Modal>
  );
}
