'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import Modal from '@/components/ui/Modal';
import { useAssets, Asset } from '@/hooks/assets/useAssets';
import { normalizeHashtags } from '@/lib/utils/hashtags';
import { useBrand } from '@/hooks/useBrand';
import { utcToLocalDate, utcToLocalTime, localToUtc } from '@/lib/utils/timezone';

export default function NewPostPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  
  // Fetch brand with timezone
  const { brand, loading: brandLoading } = useBrand(brandId);
  
  // Fetch brand assets
  const { assets, loading: assetsLoading } = useAssets(brandId);
  
  // Debug: Log assets to see storage_path format
  React.useEffect(() => {
    // Test storage access first
    const testStorage = async () => {
      const { testStorageAccess } = await import('@/lib/storage/testStorage');
      const result = await testStorageAccess();
      console.log('🧪 Storage test result:', result);
    };
    testStorage();
    
    if (assets.length > 0) {
      console.log('Assets loaded:', assets);
      console.log('Sample storage_path:', assets[0]?.storage_path);
      
      // Test if we can access the storage buckets
      const testStorageAccess = async () => {
        try {
          const { supabase } = await import('@/lib/supabase-browser');
          
          // Test different bucket names and list all files
          const buckets = ['ferdy_assets', 'assets', 'brands', 'images', 'media'];
          
          // Also test if there might be a different bucket name
          const possibleBuckets = ['ferdy_assets', 'assets', 'brands', 'images', 'media', 'storage', 'uploads', 'files'];
          
          // Test all possible bucket names
          for (const bucket of possibleBuckets) {
            try {
              const { data, error } = await supabase.storage.from(bucket).list('', { limit: 10 });
              console.log(`Testing bucket ${bucket}:`, !error, `Files: ${data?.length || 0}`, data);
            } catch (err) {
              console.log(`Bucket ${bucket} error:`, err);
            }
          }
          
          for (const bucket of buckets) {
            try {
              const { data, error } = await supabase.storage.from(bucket).list('', { limit: 10 });
              console.log(`Bucket ${bucket} exists:`, !error, `Files: ${data?.length || 0}`, data);
              
              // Also try to list files recursively
              if (bucket === 'brands') {
                try {
                  const { data: brandData } = await supabase.storage.from('brands').list('986a5e5d-4d6b-4893-acc8-9ddce8083921', { limit: 10 });
                  console.log(`Brand folder contents:`, brandData);
                  
                  // Try to list files in originals folder
                  const { data: originalsData } = await supabase.storage.from('brands').list('986a5e5d-4d6b-4893-acc8-9ddce8083921/originals', { limit: 10 });
                  console.log(`Brand originals folder contents:`, originalsData);
                } catch (err) {
                  console.log(`Brand folder error:`, err);
                }
              }
              
              if (bucket === 'ferdy_assets') {
                try {
                  const { data: assetsData } = await supabase.storage.from('ferdy_assets').list('originals', { limit: 10 });
                  console.log(`Ferdy_assets originals folder contents:`, assetsData);
                } catch (err) {
                  console.log(`Ferdy_assets originals folder error:`, err);
                }
              }
              
              if (bucket === 'assets') {
                try {
                  const { data: assetsData } = await supabase.storage.from('assets').list('originals', { limit: 10 });
                  console.log(`Assets originals folder contents:`, assetsData);
                } catch (err) {
                  console.log(`Assets originals folder error:`, err);
                }
              }
            } catch (err) {
              console.log(`Bucket ${bucket} error:`, err);
            }
          }
        } catch (error) {
          console.error('Storage access test error:', error);
        }
      };
      
      testStorageAccess();
      
      // Test accessing a specific image file
      const testSpecificImage = async () => {
        try {
          const { supabase } = await import('@/lib/supabase-browser');
          const sampleAsset = assets[0];
          if (sampleAsset?.storage_path) {
            console.log('Testing specific image access for:', sampleAsset.storage_path);
            
            // Try to get the file directly
            if (sampleAsset.storage_path.startsWith('brands/')) {
              const cleanPath = sampleAsset.storage_path.replace('brands/', '');
              const { data, error } = await supabase.storage
                .from('brands')
                .download(cleanPath);
              console.log('Direct download test result:', !error, error);
            } else {
              const { data, error } = await supabase.storage
                .from('assets')
                .download(sampleAsset.storage_path);
              console.log('Direct download test result:', !error, error);
            }
          }
        } catch (error) {
          console.error('Specific image test error:', error);
        }
      };
      
      testSpecificImage();
      
      // Test signed URLs instead of public URLs
      const testSignedUrls = async () => {
        try {
          const { supabase } = await import('@/lib/supabase-browser');
          const sampleAsset = assets[0];
          if (sampleAsset?.storage_path) {
            console.log('Testing signed URL access for:', sampleAsset.storage_path);
            
            // Try to get a signed URL instead of public URL
            if (sampleAsset.storage_path.startsWith('brands/')) {
              const cleanPath = sampleAsset.storage_path.replace('brands/', '');
              const { data, error } = await supabase.storage
                .from('brands')
                .createSignedUrl(cleanPath, 3600); // 1 hour expiry
              console.log('Signed URL test result:', !error, error, data);
            } else {
              const { data, error } = await supabase.storage
                .from('ferdy_assets')
                .createSignedUrl(sampleAsset.storage_path, 3600);
              console.log('Signed URL test result:', !error, error, data);
            }
          }
        } catch (error) {
          console.error('Signed URL test error:', error);
        }
      };
      
      testSignedUrls();
    }
  }, [assets]);
  
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

  const selectedPreviewUrl = useMemo(() => {
    if (!selectedAsset) return ''
    if ((selectedAsset.asset_type ?? 'image') === 'video') {
      return selectedAsset.thumbnail_signed_url || selectedAsset.signed_url || ''
    }
    return selectedAsset.signed_url || ''
  }, [selectedAsset])

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

  const handleSave = async () => {
    if (!postCopy.trim()) {
      alert('Please enter post content');
      return;
    }

    if (selectedChannels.length === 0) {
      alert('Please select at least one channel');
      return;
    }

    if (!scheduleDate || !scheduleTime) {
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
      
      // Convert local date/time (in brand timezone) to UTC
      if (!brand?.timezone) {
        alert('Brand timezone not configured. Please update brand settings.')
        return
      }

      const scheduledAt = localToUtc(scheduleDate, scheduleTime, brand.timezone)
      
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
        p_approve_now: false
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
      const channelCount = selectedChannels.length;
      const channelText = channelCount === 1 ? 'channel' : 'channels';
      alert(`Post created successfully! Will be posted to ${channelCount} ${channelText}.`);
      
      // Navigate back to schedule page
      router.push(`/brands/${brandId}/schedule`);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
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
                      {selectedAsset && (
                        <div className="relative">
                          {(selectedAsset.asset_type ?? 'image') === 'video' ? (
                            <video
                              controls
                              preload="metadata"
                              poster={selectedPreviewUrl || undefined}
                              src={selectedAsset.signed_url || selectedAsset.storage_path}
                              className="w-full h-32 rounded-lg bg-black object-contain"
                            />
                          ) : (
                            <img
                              src={selectedPreviewUrl || selectedAsset.signed_url || selectedAsset.storage_path}
                              alt={selectedAsset.title || 'Selected media'}
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
                          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
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
                          <svg className="absolute right-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ top: '50%', transform: 'translateY(-50%)', marginTop: '-2px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                        <div className="relative">
                          <input
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
                          <svg className="absolute right-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ top: '50%', transform: 'translateY(-50%)', marginTop: '-2px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
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
                      {/* Instagram */}
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
                          <span className="font-medium text-gray-900">Instagram</span>
                        </div>
                        {selectedChannels.includes('instagram') && (
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

                      {/* LinkedIn */}
                      <div 
                        onClick={() => toggleChannel('linkedin')}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedChannels.includes('linkedin')
                            ? 'border-[#6366F1] bg-[#EEF2FF]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-[#0A66C2] rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900">LinkedIn</span>
                        </div>
                        {selectedChannels.includes('linkedin') && (
                          <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* X (Twitter) */}
                      <div 
                        onClick={() => toggleChannel('x')}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedChannels.includes('x')
                            ? 'border-[#6366F1] bg-[#EEF2FF]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900">X (Twitter)</span>
                        </div>
                        {selectedChannels.includes('x') && (
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
                  {assetsForActiveTab.map((asset) => {
                    const isSelected = selectedAssetIds.includes(asset.id);
                    const isVideo = (asset.asset_type ?? 'image') === 'video';
                    const previewUrl = isVideo
                      ? asset.thumbnail_signed_url || asset.signed_url
                      : asset.signed_url || asset.thumbnail_signed_url;

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
                className="bg-white border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white text-sm font-medium px-4 py-2 rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Post'}
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
