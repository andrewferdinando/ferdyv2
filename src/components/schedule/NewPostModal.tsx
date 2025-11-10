'use client';

import React, { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/ui/Modal';
import { Form, FormField, FormActions } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { useAssets, Asset } from '@/hooks/assets/useAssets';
import { channelSupportsMedia, describeChannelSupport } from '@/lib/channelSupport';

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
  onSuccess: () => void;
}

type AssetTab = 'images' | 'videos';

export default function NewPostModal({ isOpen, onClose, brandId, onSuccess }: NewPostModalProps) {
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
  const { assets, loading: assetsLoading } = useAssets(brandId);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      if (!formData.scheduled_at) {
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
        approve_now: formData.approve_now
      });

      // Create manual post using RPC
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await supabase.rpc('rpc_create_manual_post', {
        p_brand_id: brandId,
        p_copy: formData.copy,
        p_hashtags: hashtagsArray,
        p_asset_ids: formData.asset_ids,
        p_channels: formData.channels,
        p_scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
        p_approve_now: formData.approve_now
      });

      console.log('RPC response:', { data, error });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      console.log('Post created successfully, draft IDs:', data);

      // Call onSuccess to refresh the drafts list
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
    } catch (error) {
      console.error('Failed to create post:', error);
      alert(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
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

  const toggleChannel = (channel: string) => {
    setFormData((prev) => {
      const alreadySelected = prev.channels.includes(channel);

      if (alreadySelected) {
        return {
          ...prev,
          channels: prev.channels.filter((c) => c !== channel),
        };
      }

      const incompatibleType = Array.from(selectedMediaTypes).find(
        (type) => !channelSupportsMedia(channel, type),
      );

      if (incompatibleType) {
        alert(
          `The ${channel} channel does not support ${
            incompatibleType === 'video' ? 'video' : 'image'
          } posts. Remove incompatible media or choose a different channel.`,
        );
        return prev;
      }

      return {
        ...prev,
        channels: [...prev.channels, channel],
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
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={asset.title}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">
                          No preview
                        </div>
                      )}
                      {isVideo && (
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
          <div className="space-y-2">
            {[
              { id: 'facebook', label: 'Facebook' },
              { id: 'instagram', label: 'Instagram' },
              { id: 'linkedin', label: 'LinkedIn' },
              { id: 'twitter', label: 'Twitter' },
              { id: 'tiktok', label: 'TikTok' },
            ].map((channel) => {
              const isSelected = formData.channels.includes(channel.id);
              return (
                <label
                  key={channel.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                    isSelected ? 'border-[#6366F1] bg-[#EEF2FF]' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleChannel(channel.id)}
                      className="rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
                    />
                    <span className="text-sm font-medium text-gray-700">{channel.label}</span>
                  </div>
                  <span className="text-xs text-gray-500">{describeChannelSupport(channel.id)}</span>
                </label>
              );
            })}
            {!channelsSupportSelection && (
              <p className="text-xs text-red-600">
                Selected channels do not support the chosen media type. Adjust your selection before submitting.
              </p>
            )}
          </div>
        </FormField>

        <FormField label="Schedule Date & Time" required>
          <Input
            type="datetime-local"
            value={formData.scheduled_at}
            onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
          />
        </FormField>

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

        <FormActions 
          onCancel={onClose} 
          submitText="Create Post"
          isLoading={isLoading}
        />
      </Form>
    </Modal>
  );
}
