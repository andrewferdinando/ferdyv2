'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import Modal from '@/components/ui/Modal';
import Breadcrumb from '@/components/navigation/Breadcrumb';
import { useAssets } from '@/hooks/useAssets';
import { supabase } from '@/lib/supabase-browser';
import { normalizeHashtags } from '@/lib/utils/hashtags';

console.log('Edit Post page component loaded');

interface Draft {
  id: string;
  brand_id: string;
  post_job_id: string;
  channel: string;
  copy: string;
  hashtags: string[];
  asset_ids: string[];
  tone: string;
  generated_by: 'ai' | 'human' | 'ai+human';
  created_by: string;
  created_at: string;
  created_at_nzt: string;
  approved: boolean;
  scheduled_for?: string; // UTC timestamp
  scheduled_for_nzt?: string; // NZT timestamp
  schedule_source?: 'manual' | 'auto';
  scheduled_by?: string;
  publish_status?: string;
  post_jobs?: {
    id: string;
    scheduled_at: string;
    scheduled_local: string;
    scheduled_tz: string;
    status: string;
    target_month: string;
  };
  assets?: {
    id: string;
    title: string;
    storage_path: string;
    aspect_ratio: string;
    signed_url?: string;
  }[];
}

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  const draftId = params.draftId as string;
  
  console.log('Edit Post page rendered with params:', { brandId, draftId });
  
  // Fetch brand assets
  const { assets, loading: assetsLoading } = useAssets(brandId);
  
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [postCopy, setPostCopy] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Check if post can be approved (allow without connected social accounts for now)
  const canApprove = postCopy.trim() && selectedChannels.length > 0 && scheduleDate && scheduleTime && draft?.asset_ids && draft.asset_ids.length > 0;

  // Load draft data
  useEffect(() => {
    const loadDraft = async () => {
      try {
        console.log('Edit Post: Loading draft with ID:', draftId, 'Brand ID:', brandId);
        const { supabase } = await import('@/lib/supabase-browser');
        
        // Fetch draft with all required fields including new scheduling fields
        const { data, error } = await supabase
          .from('drafts')
          .select('id, brand_id, post_job_id, channel, copy, hashtags, asset_ids, tone, generated_by, created_by, created_at, approved, created_at_nzt, scheduled_for, scheduled_for_nzt, schedule_source, scheduled_by, publish_status')
          .eq('id', draftId)
          .eq('brand_id', brandId)
          .single();

        console.log('Edit Post: Draft query result:', { data, error });

        if (error) {
          console.error('Error loading draft:', error);
          if (error.code === 'PGRST116') {
            setError('Draft not found');
          } else {
            setError('Failed to load post');
          }
          return;
        }

        if (!data) {
          console.log('Edit Post: No data returned from query');
          setError('Draft not found');
          return;
        }

        console.log('Edit Post: Setting draft data:', data);
        setDraft(data);
        
        // Populate form with draft data
        console.log('Edit Post: Populating form with data:', {
          copy: data.copy,
          hashtags: data.hashtags,
          channel: data.channel
        });
        setPostCopy(data.copy || '');
        // Normalize hashtags when loading from database
        setHashtags(normalizeHashtags(data.hashtags || []));
        
        // Handle comma-separated channels
        if (data.channel) {
          const channels = data.channel.split(',').map((c: string) => c.trim()).filter((c: string) => c);
          console.log('Edit Post: Setting channels:', channels);
          setSelectedChannels(channels);
        }
        
        // Load assets if asset_ids exist
        if (data.asset_ids && data.asset_ids.length > 0) {
          const { data: assetsData, error: assetsError } = await supabase
            .from('assets')
            .select('id, title, storage_path, aspect_ratio')
            .in('id', data.asset_ids)
            .eq('brand_id', brandId);

          if (assetsError) {
            console.error('Error loading assets:', assetsError);
          } else if (assetsData) {
            // Generate public URLs for assets
            const assetsWithUrls = assetsData.map(asset => {
              const { data } = supabase.storage
                .from('ferdy-assets')
                .getPublicUrl(asset.storage_path);
              return { ...asset, signed_url: data.publicUrl };
            });
            
            setDraft(prev => prev ? { ...prev, assets: assetsWithUrls } : null);
            
            // Set first asset as selected media if available
            if (assetsWithUrls.length > 0) {
              setSelectedMedia(assetsWithUrls[0].signed_url || '');
            }
          }
        }
        
             // Parse scheduled date and time from scheduled_for field (preferred) or post_jobs
             if (data.scheduled_for) {
               // Convert UTC to local time for the date/time pickers
               const scheduledDate = new Date(data.scheduled_for);
               setScheduleDate(scheduledDate.toISOString().split('T')[0]);
               setScheduleTime(scheduledDate.toTimeString().slice(0, 5));
             } else if (data.post_job_id) {
               const { data: postJobData, error: postJobError } = await supabase
                 .from('post_jobs')
                 .select('id, scheduled_at, scheduled_local, scheduled_tz, status, target_month')
                 .eq('id', data.post_job_id)
                 .single();

               if (!postJobError && postJobData?.scheduled_at) {
                 const scheduledDate = new Date(postJobData.scheduled_at);
                 setScheduleDate(scheduledDate.toISOString().split('T')[0]);
                 setScheduleTime(scheduledDate.toTimeString().slice(0, 5));
                 
                 // Update draft with post_jobs data
                 setDraft(prev => prev ? { 
                   ...prev, 
                   post_jobs: postJobData 
                 } : null);
               }
             }
        
      } catch (err) {
        console.error('Error loading draft:', err);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    if (draftId && brandId) {
      loadDraft();
    }
  }, [draftId, brandId]);

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

  const handleMediaSelect = async (asset: { id: string; title: string; storage_path: string; aspect_ratio: string; signed_url?: string }) => {
    try {
      // Add asset to draft
      const newAssetIds = [...(draft?.asset_ids || []), asset.id];
      const newAssets = [...(draft?.assets || []), asset];
      
      setDraft(prev => prev ? { 
        ...prev, 
        asset_ids: newAssetIds,
        assets: newAssets 
      } : null);
      
      setSelectedMedia(asset.signed_url || asset.storage_path);
      setIsMediaModalOpen(false);
    } catch (error) {
      console.error('Error adding asset to draft:', error);
    }
  };

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

      const assetsWithoutTags = ((assetsData || []) as AssetWithTags[]).filter((asset) => {
        const activeTags = (asset.asset_tags || []).filter(
          (at) => at.tags && at.tags.is_active
        )
        return activeTags.length === 0
      })

      if (assetsWithoutTags.length > 0) {
        const assetIdsWithoutTags = assetsWithoutTags.map((a) => a.id)
        alert(
          `Cannot save this post. The following assets do not have tags:\n\n` +
          `${assetIdsWithoutTags.join(', ')}\n\n` +
          `Please tag all assets in the Content Library before saving this post.`
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

    // Validate assets have tags before saving
    if (draft?.asset_ids && draft.asset_ids.length > 0) {
      const assetsValid = await validateAssetsHaveTags(draft.asset_ids)
      if (!assetsValid) {
        return // Validation failed, error message already shown
      }
    }

    setIsSaving(true);

    try {
      const { supabase } = await import('@/lib/supabase-browser');
      
      // Combine date and time into a single timestamp
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
      
      // Normalize hashtags before saving
      const normalizedHashtags = normalizeHashtags(hashtags);
      
      // Update the draft with new scheduling fields
      const { data, error } = await supabase
        .from('drafts')
        .update({
          copy: postCopy.trim(),
          hashtags: normalizedHashtags,
          asset_ids: draft?.asset_ids || [],
          channel: selectedChannels.join(','), // Store as comma-separated string
          scheduled_for: scheduledAt.toISOString(), // UTC timestamp
          scheduled_for_nzt: scheduledAt.toISOString(), // Use UTC timestamp - database will handle timezone conversion
          schedule_source: 'manual',
          scheduled_by: (await supabase.auth.getUser()).data.user?.id || null
        })
        .eq('id', draftId)
        .eq('brand_id', brandId)
        .select()
        .single();

      if (error) {
        console.error('Error updating draft:', error);
        alert(`Failed to update post: ${error.message}`);
        return;
      }

      // Update the post_job if it exists
      if (draft?.post_job_id) {
        const { error: postJobError } = await supabase
          .from('post_jobs')
          .update({
            scheduled_at: scheduledAt.toISOString(),
            channel: selectedChannels[0], // Use first channel for post_job constraint
            updated_at: new Date().toISOString()
          })
          .eq('id', draft.post_job_id);

        if (postJobError) {
          console.error('Error updating post_job:', postJobError);
          // Don't fail the whole operation for this
        }
      }

      console.log('Post updated successfully:', data);
      alert('Post updated successfully!');
      
      // Navigate back to schedule page
      router.push(`/brands/${brandId}/schedule`);
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
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

    // Validate assets have tags before approving
    if (draft?.asset_ids && draft.asset_ids.length > 0) {
      const assetsValid = await validateAssetsHaveTags(draft.asset_ids)
      if (!assetsValid) {
        return // Validation failed, error message already shown
      }
    }

    setIsApproving(true);

    try {
      const { supabase } = await import('@/lib/supabase-browser');
      
      // First save the draft with current changes
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
      
      // Normalize hashtags before saving
      const normalizedHashtags = normalizeHashtags(hashtags);
      
      const { data, error } = await supabase
        .from('drafts')
        .update({
          copy: postCopy.trim(),
          hashtags: normalizedHashtags,
          asset_ids: draft?.asset_ids || [],
          channel: selectedChannels.join(','),
          approved: true, // Mark as approved
          scheduled_for: scheduledAt.toISOString(), // UTC timestamp
          scheduled_for_nzt: scheduledAt.toISOString(), // Use UTC timestamp - database will handle timezone conversion
          schedule_source: 'manual',
          scheduled_by: (await supabase.auth.getUser()).data.user?.id || null
        })
        .eq('id', draftId)
        .eq('brand_id', brandId)
        .select()
        .single();

      if (error) {
        console.error('Error updating draft:', error);
        alert(`Failed to approve post: ${error.message}`);
        return;
      }

      // Update the post_job if it exists
      if (draft?.post_job_id) {
        const { error: postJobError } = await supabase
          .from('post_jobs')
          .update({
            scheduled_at: scheduledAt.toISOString(),
            channel: selectedChannels[0], // Use first channel for post_job constraint
            status: 'scheduled' // Update status to scheduled
          })
          .eq('id', draft.post_job_id);

        if (postJobError) {
          console.error('Error updating post_job:', postJobError);
          // Don't fail the whole operation for this
        }
      }

      console.log('Post approved successfully:', data);
      alert('Post approved and scheduled successfully!');
      
      // Navigate back to schedule page
      router.push(`/brands/${brandId}/schedule`);
    } catch (error) {
      console.error('Error approving post:', error);
      alert('Failed to approve post. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  if (loading) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
            </div>
          </div>
        </AppLayout>
      </RequireAuth>
    );
  }

  if (error || !draft) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error || 'Post not found'}</p>
                <button
                  onClick={() => router.push(`/brands/${brandId}/schedule`)}
                  className="px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors"
                >
                  Back to Schedule
                </button>
              </div>
            </div>
          </div>
        </AppLayout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
            <div>
              <div className="mb-4">
                <Breadcrumb />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Edit Post</h1>
              <p className="text-gray-600 mt-1 text-sm">Edit your social media post</p>
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
                      {/* Existing Images from Draft */}
                      {draft?.assets && draft.assets.length > 0 ? (
                        draft.assets.map((asset) => (
                          <div key={asset.id} className="relative">
                            <img
                              src={asset.signed_url || asset.storage_path}
                              alt={asset.title || 'Asset'}
                              className="w-full h-32 object-cover rounded-lg"
                              onError={(e) => {
                                console.error('Image failed to load:', asset.signed_url || asset.storage_path);
                                e.currentTarget.src = '/assets/placeholders/image1.png';
                              }}
                            />
                            <button 
                              onClick={() => {
                                // Remove this asset from the draft
                                const updatedAssets = draft.assets?.filter(a => a.id !== asset.id) || [];
                                const updatedAssetIds = draft.asset_ids.filter(id => id !== asset.id);
                                setDraft(prev => prev ? { 
                                  ...prev, 
                                  assets: updatedAssets,
                                  asset_ids: updatedAssetIds 
                                } : null);
                                if (selectedMedia === (asset.signed_url || asset.storage_path)) {
                                  setSelectedMedia('');
                                }
                              }}
                              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-8 text-gray-500">
                          <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm">No media attached to this post</p>
                        </div>
                      )}
                      
                      {/* Add Media Button */}
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Channels</h3>
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

        {/* Action Buttons */}
        <div className="bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-10 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/brands/${brandId}/schedule`)}
                  className="bg-white border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-white border border-gray-300 text-gray-700 text-sm font-medium px-6 py-2 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                {!draft?.approved && (
                  <button
                    onClick={handleApprove}
                    disabled={isSaving || isApproving || !canApprove}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      canApprove
                        ? 'bg-[#6366F1] text-white hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isApproving ? 'Approving...' : 'Approve & Schedule'}
                  </button>
                )}
                {draft?.approved && (
                  <div className="px-6 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
                    ✓ Approved
                  </div>
                )}
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
            <div className="grid grid-cols-2 gap-4">
              {assets.map((asset) => {
                // Generate public URL for the asset using correct bucket
                const { data } = supabase.storage
                  .from('ferdy-assets')
                  .getPublicUrl(asset.storage_path);
                const imageUrl = data.publicUrl;
                
                return (
                  <button
                    key={asset.id}
                    onClick={() => handleMediaSelect({ 
                      ...asset, 
                      signed_url: imageUrl 
                    })}
                    className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all"
                  >
                    <img 
                      src={imageUrl} 
                      alt={asset.title || 'Asset'} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        console.error('Image failed to load:', imageUrl);
                        // Show placeholder if image fails to load
                        e.currentTarget.src = '/assets/placeholders/image1.png';
                      }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </Modal>
      </AppLayout>
    </RequireAuth>
  );
}
