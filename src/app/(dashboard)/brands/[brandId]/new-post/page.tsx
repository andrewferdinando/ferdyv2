'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import Modal from '@/components/ui/Modal';
import { useAssets, Asset } from '@/hooks/assets/useAssets';
import { normalizeHashtags } from '@/lib/utils/hashtags';
import { useBrand } from '@/hooks/useBrand';
import { localToUtc } from '@/lib/utils/timezone';
import { usePublishNow } from '@/hooks/usePublishNow';
import PublishProgressModal from '@/components/schedule/PublishProgressModal';

export default function NewPostPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  
  // Fetch brand with timezone
  const { brand, loading: brandLoading } = useBrand(brandId);
  
  // Fetch brand assets
  const { assets, loading: assetsLoading } = useAssets(brandId, { onlyReady: true });
  
  // Empty initial state for new post
  const [postCopy, setPostCopy] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assetTab, setAssetTab] = useState<'images' | 'videos'>('images');
  const [publishMode, setPublishMode] = useState<'schedule' | 'publish-now'>('schedule');
  const scheduleDateInputRef = useRef<HTMLInputElement>(null);
  const scheduleTimeInputRef = useRef<HTMLInputElement>(null);
  
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
      { imageAssets: [] as Asset[], videoAssets: [] as Asset[] },
    )
    return grouped
  }, [assets])

  const assetsForActiveTab = assetTab === 'videos' ? videoAssets : imageAssets

  // Assets already have public URLs populated by useAssets
  const resolvedAssetsForTab = assetsForActiveTab
  const resolvedSelectedAsset = selectedAsset

  const selectedPreviewUrl = useMemo(() => {
    if (!resolvedSelectedAsset) return ''
    if ((resolvedSelectedAsset.asset_type ?? 'image') === 'video') {
      return resolvedSelectedAsset.thumbnail_signed_url || resolvedSelectedAsset.signed_url || ''
    }
    return resolvedSelectedAsset.signed_url || ''
  }, [resolvedSelectedAsset])

  const handleHashtagKeyPress = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && newHashtag.trim()) {
      e.preventDefault();
      // Normalize the new hashtag and add it to the array, then re-normalize the entire array
      const newTags = [...hashtags, newHashtag.trim()];
      setHashtags(normalizeHashtags(newTags));
      setNewHashtag('');
    } else if (e.key === 'Backspace' && !newHashtag && hashtags.length > 0) {
      setHashtags(hashtags.slice(0, -1));
    }
  };

  const removeHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  const toggleChannel = (channel: string) => {
    setSelectedChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleMediaSelect = (asset: Asset) => {
    setSelectedAsset(asset);
    setSelectedAssetIds([asset.id]);
    setIsMediaModalOpen(false);
  };

  const [isSaving, setIsSaving] = useState(false);

  // Validate that all assets have tags
  const validateAssetsHaveTags = async (assetIds: string[]): Promise<boolean> => {
    if (!assetIds || assetIds.length === 0) {
      return true // No assets means no validation needed
    }

    try {
      const { supabase } = await import('@/lib/supabase-browser')
      
      // Fetch assets with their tags via asset_tags join
      const { data: assetsData, error } = await supabase
        .from('assets')
        .select(`
          id,
          asset_tags (
            tag_id,
            tags (
              id,
              is_active
            )
          )
        `)
        .in('id', assetIds)
        .eq('brand_id', brandId)

      if (error) {
        console.error('Error validating asset tags:', error)
        return false
      }

      // Check each asset has at least one active tag
      interface AssetWithTags {
        id: string
        asset_tags?: Array<{
          tag_id: string
          tags?: {
            id: string
            is_active: boolean
          } | null
        }>
      }

      const assetsWithoutTags = ((assetsData || []) as unknown as AssetWithTags[]).filter((asset) => {
        const activeTags = (asset.asset_tags || []).filter(
          (at) => at.tags && at.tags.is_active
        )
        return activeTags.length === 0
      })

      if (assetsWithoutTags.length > 0) {
        const assetIdsWithoutTags = assetsWithoutTags.map((a) => a.id)
        alert(
          `Cannot create this post. The following assets do not have tags:\n\n` +
          `${assetIdsWithoutTags.join(', ')}\n\n` +
          `Please tag all assets in the Content Library before creating this post.`
        )
        return false
      }

      return true
    } catch (error) {
      console.error('Error validating asset tags:', error)
      return false
    }
  }

  const handleSave = async (mode?: 'schedule' | 'publish-now') => {
    const submitMode = mode || publishMode;
    
    if (!postCopy.trim()) {
      alert('Please enter post content');
      return;
    }

    if (selectedChannels.length === 0) {
      alert('Please select at least one channel');
      return;
    }

    // For publish-now, scheduled_at is optional (we'll use now())
    // For schedule, it's required
    if (submitMode === 'schedule' && (!scheduleDate || !scheduleTime)) {
      alert('Please select a date and time');
      return;
    }

    // Validate assets have tags before creating post
    if (selectedAssetIds && selectedAssetIds.length > 0) {
      const assetsValid = await validateAssetsHaveTags(selectedAssetIds)
      if (!assetsValid) {
        return // Validation failed, error message already shown
      }
    }

    setIsSaving(true);

    try {
      const { supabase } = await import('@/lib/supabase-browser');
      
      // For publish-now, use current time (or a couple minutes in the future)
      // The publish-now endpoint will publish immediately regardless
      let scheduledAt: Date;
      if (submitMode === 'publish-now') {
        scheduledAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
      } else {
        // Convert local date/time (in brand timezone) to UTC
        if (!brand?.timezone) {
          alert('Brand timezone not configured. Please update brand settings.')
          return
        }
        scheduledAt = localToUtc(scheduleDate, scheduleTime, brand.timezone)
      }
      
      // Normalize hashtags before saving
      const normalizedHashtags = normalizeHashtags(hashtags);
      
      // Call the RPC function to create a single post with multiple channels
      const { data, error } = await supabase.rpc('rpc_create_single_manual_post', {
        p_brand_id: brandId,
        p_copy: postCopy.trim(),
        p_hashtags: normalizedHashtags,
        p_asset_ids: selectedAssetIds,
        p_channels: selectedChannels,
        p_scheduled_at: scheduledAt.toISOString(), // UTC timestamp
        p_approve_now: submitMode === 'publish-now' ? true : false
      });

      if (error) {
        console.error('Error creating post:', error);
        
        // Check if the RPC function doesn't exist (needs to be deployed)
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          alert('Database function not found. Please run the SQL migration in Supabase SQL editor first.');
          return;
        }
        
        alert(`Failed to create post: ${error.message}`);
        return;
      }

      console.log('Post created successfully:', data);

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
          channels: selectedChannels,
          onSuccess: async () => {
            // Navigate to Schedule → Published tab
            router.push(`/brands/${brandId}/schedule?tab=published`);
          },
          onError: () => {
            // Keep page open on error, form data preserved
            setIsSaving(false);
          },
        });
      } else {
        // Regular schedule mode - just navigate back
        const channelCount = selectedChannels.length;
        const channelText = channelCount === 1 ? 'channel' : 'channels';
        alert(`Post created successfully! Will be posted to ${channelCount} ${channelText}.`);
        
        // Navigate back to schedule page
        router.push(`/brands/${brandId}/schedule`);
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Create New Post</h1>
              <p className="text-gray-600 mt-1 text-sm">Create a new post to schedule across your social channels.</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-4 sm:p-6 lg:p-10">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Section - Post Details */}
                <div className="space-y-6">
                  {/* Media */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Media</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Existing Image */}
                      {resolvedSelectedAsset && (
                        <div className="relative">
                          {(resolvedSelectedAsset.asset_type ?? 'image') === 'video' ? (
                            <video
                              controls
                              preload="metadata"
                              poster={selectedPreviewUrl || undefined}
                              src={resolvedSelectedAsset.signed_url || resolvedSelectedAsset.storage_path}
                              className="w-full h-32 rounded-lg bg-black object-contain"
                            />
                          ) : (
                            <img
                              src={selectedPreviewUrl || resolvedSelectedAsset.signed_url || resolvedSelectedAsset.storage_path}
                              alt={resolvedSelectedAsset.title || 'Selected media'}
                              className="w-full h-32 object-cover rounded-lg"
                              onError={(e) => {
                                console.error('Selected media failed to load:', selectedPreviewUrl)
                                e.currentTarget.src =
                                  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjhmYSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNmI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+'
                              }}
                            />
                          )}
                          <button 
                            onClick={() => {
                              setSelectedAsset(null);
                              setSelectedAssetIds([]);
                            }}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      )}
                      
                      {/* Add Media Placeholder */}
                      <div 
                        onClick={() => setIsMediaModalOpen(true)}
                        className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Add Media</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post Copy */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Post Copy</h3>
                    <textarea
                      value={postCopy}
                      onChange={(e) => setPostCopy(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent resize-none"
                      placeholder="Write your post content here..."
                    />
                    <p className="text-sm text-gray-500 mt-2">{postCopy.length} characters</p>
                  </div>

                  {/* Hashtags */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Hashtags</h3>
                    <div className="space-y-4">
                      {/* Existing Hashtags */}
                      {hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {hashtags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#EEF2FF] text-[#6366F1]"
                            >
                              {tag}
                              <button
                                onClick={() => removeHashtag(tag)}
                                className="ml-2 text-[#6366F1] hover:text-[#4F46E5]"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Add Hashtag Input */}
                      <input
                        type="text"
                        value={newHashtag}
                        onChange={(e) => setNewHashtag(e.target.value)}
                        onKeyDown={handleHashtagKeyPress}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                        placeholder="Add hashtags..."
                      />
                      <p className="text-xs text-gray-500">
                        Press Enter or comma to add • Backspace to remove last hashtag
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Section - Scheduling & Channels */}
                <div className="space-y-6">
                  {/* Schedule */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                        <div className="relative">
                          <input
                            ref={scheduleDateInputRef}
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                            style={{
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              MozAppearance: 'textfield',
                              lineHeight: '1.5'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const node = scheduleDateInputRef.current;
                              if (!node) return;
                              if (typeof node.showPicker === 'function') {
                                node.showPicker();
                              } else {
                                node.focus();
                                node.click();
                              }
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#6366F1] transition-colors"
                            aria-label="Choose date"
                            style={{ top: '50%', transform: 'translateY(-50%) scale(0.9)' }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                        <div className="relative">
                          <input
                            ref={scheduleTimeInputRef}
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                            style={{
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              MozAppearance: 'textfield',
                              lineHeight: '1.5'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const node = scheduleTimeInputRef.current;
                              if (!node) return;
                              if (typeof node.showPicker === 'function') {
                                node.showPicker();
                              } else {
                                node.focus();
                                node.click();
                              }
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#6366F1] transition-colors"
                            aria-label="Choose time"
                            style={{ top: '50%', transform: 'translateY(-50%) scale(0.9)' }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Channels */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Channels</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Select the channels where this post will be published. All selected channels will show this same post.
                    </p>
                    <div className="space-y-3">
                      {/* Instagram Feed */}
                      <div 
                        onClick={() => toggleChannel('instagram')}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedChannels.includes('instagram')
                            ? 'border-[#6366F1] bg-[#EEF2FF]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900">Instagram Feed</span>
                        </div>
                        {selectedChannels.includes('instagram') && (
                          <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* Instagram Story */}
                      <div
                        onClick={() => toggleChannel('instagram_story')}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedChannels.includes('instagram_story')
                            ? 'border-[#6366F1] bg-[#EEF2FF]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.2c3.2 0 3.6.01 4.9.07 3.26.15 4.78 1.7 4.93 4.93.06 1.27.07 1.65.07 4.9s-.01 3.63-.07 4.9c-.15 3.22-1.67 4.78-4.93 4.93-1.27.06-1.65.07-4.9.07s-3.63-.01-4.9-.07c-3.22-.15-4.78-1.71-4.93-4.93-.06-1.27-.07-1.65-.07-4.9s.01-3.63.07-4.9C2.29 3.97 3.81 2.41 7.03 2.26 8.3 2.2 8.68 2.2 12 2.2zm0 1.8c-3.17 0-3.54.01-4.78.07-2.37.11-3.47 1.24-3.58 3.58-.06 1.24-.06 1.61-.06 4.78s0 3.54.06 4.78c.11 2.33 1.2 3.47 3.58 3.58 1.24.06 1.61.07 4.78.07 3.17 0 3.54-.01 4.78-.07 2.36-.11 3.47-1.23 3.58-3.58.06-1.24.06-1.61.06-4.78s0-3.54-.06-4.78c-.11-2.33-1.2-3.47-3.58-3.58-1.24-.06-1.61-.07-4.78-.07zm0 3.3a4.7 4.7 0 110 9.4 4.7 4.7 0 010-9.4zm0 7.6a2.9 2.9 0 100-5.8 2.9 2.9 0 000 5.8zm5.4-7.9a1.1 1.1 0 11-2.2 0 1.1 1.1 0 012.2 0z" />
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900">Instagram Story</span>
                        </div>
                        {selectedChannels.includes('instagram_story') && (
                          <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* Facebook */}
                      <div 
                        onClick={() => toggleChannel('facebook')}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedChannels.includes('facebook')
                            ? 'border-[#6366F1] bg-[#EEF2FF]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-[#1877F2] rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900">Facebook</span>
                        </div>
                        {selectedChannels.includes('facebook') && (
                          <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Media Selection Modal */}
        <Modal
          isOpen={isMediaModalOpen}
          onClose={() => setIsMediaModalOpen(false)}
          title="Select Media"
        >
          {assetsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No assets available for this brand.</p>
              <p className="text-sm text-gray-400">Upload assets in the Content Library first.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
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
              {assetsForActiveTab.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-500">
                  {assetTab === 'videos'
                    ? 'No videos available yet. Upload a video in the Content Library.'
                    : 'No images available yet. Upload an image in the Content Library.'}
                </p>
              ) : (
                <div className="grid max-h-96 grid-cols-2 gap-4 overflow-y-auto sm:grid-cols-3">
                  {resolvedAssetsForTab.map((asset) => {
                    const isSelected = selectedAssetIds.includes(asset.id);
                    const isVideo = (asset.asset_type ?? 'image') === 'video';
                    const previewUrl = asset.thumbnail_signed_url || asset.signed_url;

                    return (
                      <button
                        type="button"
                        key={asset.id}
                        onClick={() => handleMediaSelect(asset)}
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
                              alt={asset.title || 'Asset'}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-gray-500">
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
                          {isVideo && (
                            <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                              Video
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
                              ? asset.duration_seconds
                                ? `${Math.round(asset.duration_seconds)}s`
                                : 'Video'
                              : asset.aspect_ratio || 'Image'}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </Modal>

        {/* Action Buttons - Bottom Right */}
        <div className="bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-10 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => router.push(`/brands/${brandId}/schedule`)}
                disabled={isSaving || isPublishingNow}
                className="bg-white border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPublishMode('schedule');
                    handleSave('schedule');
                  }}
                  disabled={isSaving || isPublishingNow}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving && publishMode === 'schedule' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Schedule'
                  )}
                </button>
                <button
                  onClick={() => {
                    setPublishMode('publish-now');
                    handleSave('publish-now');
                  }}
                  disabled={isSaving || isPublishingNow}
                  className="px-4 py-2 text-sm font-medium bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving || isPublishingNow ? (
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
          </div>
        </div>

        {/* Publish Progress Modal */}
        <PublishProgressModal
          isOpen={isPublishModalOpen}
          message={publishModalMessage}
          isComplete={isPublishModalComplete}
          onClose={closePublishModal}
        />
      </AppLayout>
    </RequireAuth>
  );
}
