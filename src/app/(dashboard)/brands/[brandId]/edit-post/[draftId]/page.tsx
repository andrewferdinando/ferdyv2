'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import Modal from '@/components/ui/Modal';
import { useAssets, Asset } from '@/hooks/assets/useAssets';
import { normalizeHashtags } from '@/lib/utils/hashtags';
import { useBrand } from '@/hooks/useBrand';
import { utcToLocalDate, utcToLocalTime, localToUtc } from '@/lib/utils/timezone';
import { channelSupportsMedia, describeChannelSupport } from '@/lib/channelSupport';
import type { PostJobSummary } from '@/types/postJobs';
import { canonicalizeChannel, getChannelLabel } from '@/lib/channels';

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
  status: 'draft' | 'scheduled' | 'partially_published' | 'published';
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
  assets?: Asset[];
}

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  const draftId = params.draftId as string;
  
  // Fetch brand with timezone
  const { brand } = useBrand(brandId);
  
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
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [activeAssetId, setActiveAssetId] = useState<string>('');
  const [assetTab, setAssetTab] = useState<'images' | 'videos'>('images');
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isPublishingNow, setIsPublishingNow] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [postJobs, setPostJobs] = useState<PostJobSummary[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
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
    );
    return grouped;
  }, [assets]);

  const assetsForActiveTab = assetTab === 'videos' ? videoAssets : imageAssets;

  const selectedMediaTypes = useMemo(() => {
    const types = new Set<'image' | 'video'>();
    selectedAssets.forEach((asset) => {
      types.add((asset.asset_type ?? 'image'));
    });
    return types;
  }, [selectedAssets]);

  const channelsSupportSelection = useMemo(() => {
    if (selectedMediaTypes.size === 0) return true;
    return selectedChannels.every((channel) =>
      Array.from(selectedMediaTypes).every((type) => channelSupportsMedia(channel, type)),
    );
  }, [selectedChannels, selectedMediaTypes]);

  const hasSelectedMedia = selectedAssets.length > 0;

  // Show all jobs for this draft, not filtered by selected channels
  const channelStatusItems = useMemo(() => {
    return postJobs;
  }, [postJobs]);

  const hasFailedJobs = useMemo(
    () => channelStatusItems.some((job) => job.status.toLowerCase() === 'failed'),
    [channelStatusItems],
  );

  const canRetry = useMemo(
    () =>
      hasFailedJobs &&
      draft &&
      (draft.status === 'scheduled' || draft.status === 'partially_published'),
    [hasFailedJobs, draft],
  );

  const getChannelStatusMeta = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === 'success' || normalized === 'published') {
      return {
        text: 'Published',
        textClass: 'text-emerald-600',
        pillBgClass: 'bg-emerald-100',
      };
    }
    if (normalized === 'failed') {
      return {
        text: 'Failed',
        textClass: 'text-rose-600',
        pillBgClass: 'bg-rose-100',
      };
    }
    if (normalized === 'publishing') {
      return {
        text: 'Publishing',
        textClass: 'text-blue-600',
        pillBgClass: 'bg-blue-100',
      };
    }
    if (normalized === 'ready' || normalized === 'generated') {
      return {
        text: normalized === 'ready' ? 'Ready' : 'Generated',
        textClass: 'text-blue-600',
        pillBgClass: 'bg-blue-100',
      };
    }
    return {
      text: 'Pending',
      textClass: 'text-amber-600',
      pillBgClass: 'bg-amber-100',
    };
  };

  const renderChannelIcon = (channel: string) => {
    switch (channel) {
      case 'facebook':
        return (
          <div className="w-8 h-8 bg-[#1877F2] rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
        );
      case 'instagram_feed':
        return (
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
        );
      case 'instagram_story':
        return (
          <div className="w-8 h-8 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.2c3.2 0 3.6.01 4.9.07 3.26.15 4.78 1.7 4.93 4.93.06 1.27.07 1.65.07 4.9s-.01 3.63-.07 4.9c-.15 3.22-1.67 4.78-4.93 4.93-1.27.06-1.65.07-4.9.07s-3.63-.01-4.9-.07c-3.22-.15-4.78-1.71-4.93-4.93-.06-1.27-.07-1.65-.07-4.9s.01-3.63.07-4.9C2.29 3.97 3.81 2.41 7.03 2.26 8.3 2.2 8.68 2.2 12 2.2zm0 1.8c-3.17 0-3.54.01-4.78.07-2.37.11-3.47 1.24-3.58 3.58-.06 1.24-.06 1.61-.06 4.78s0 3.54.06 4.78c.11 2.33 1.2 3.47 3.58 3.58 1.24.06 1.61.07 4.78.07 3.17 0 3.54-.01 4.78-.07 2.36-.11 3.47-1.23 3.58-3.58.06-1.24.06-1.61.06-4.78s0-3.54-.06-4.78c-.11-2.33-1.2-3.47-3.58-3.58-1.24-.06-1.61-.07-4.78-.07zm0 3.3a4.7 4.7 0 110 9.4 4.7 4.7 0 010-9.4zm0 7.6a2.9 2.9 0 100-5.8 2.9 2.9 0 000 5.8zm5.4-7.9a1.1 1.1 0 11-2.2 0 1.1 1.1 0 012.2 0z" />
            </svg>
          </div>
        );
      case 'linkedin_profile':
        return (
          <div className="w-8 h-8 bg-[#0A66C2] rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </div>
        );
      case 'tiktok':
        return (
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
          </div>
        );
      case 'x':
        return (
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-xs font-semibold uppercase text-gray-700">{channel.slice(0, 2)}</span>
          </div>
        );
    }
  };

  // Check if post can be approved (allow without connected social accounts for now)
  const canApprove =
    !!postCopy.trim() &&
    selectedChannels.length > 0 &&
    !!scheduleDate &&
    !!scheduleTime &&
    hasSelectedMedia &&
    channelsSupportSelection;

  const fetchPostJobs = useCallback(async () => {
    if (!draftId) return;
    try {
      const { supabase } = await import('@/lib/supabase-browser');
      const { data, error } = await supabase
        .from('post_jobs')
        .select('id, draft_id, channel, status, error, external_post_id, external_url, last_attempt_at')
        .eq('draft_id', draftId);

      if (error) {
        console.error('Error loading channel statuses:', error);
        return;
      }

      const normalized =
        (data || [])
          .map((job) => {
            const canonical = canonicalizeChannel(job.channel);
            if (!canonical) return null;
            return {
              id: job.id,
              draft_id: job.draft_id,
              channel: canonical,
              status: job.status,
              error: job.error ?? null,
              external_post_id: job.external_post_id ?? null,
              external_url: job.external_url ?? null,
              last_attempt_at: job.last_attempt_at ?? null,
            } as PostJobSummary;
          })
          .filter((job): job is PostJobSummary => Boolean(job));

      // Sort by channel order
      const CHANNEL_ORDER = ['facebook', 'instagram_feed', 'instagram_story', 'linkedin_profile', 'tiktok', 'x'];
      const CHANNEL_ORDER_INDEX = new Map(CHANNEL_ORDER.map((channel, index) => [channel, index]));
      normalized.sort((a, b) => {
        const aIndex = CHANNEL_ORDER_INDEX.get(a.channel) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = CHANNEL_ORDER_INDEX.get(b.channel) ?? Number.MAX_SAFE_INTEGER;
        if (aIndex === bIndex) {
          return a.channel.localeCompare(b.channel);
        }
        return aIndex - bIndex;
      });

      setPostJobs(normalized);
    } catch (err) {
      console.error('Error loading post jobs:', err);
    }
  }, [draftId]);

  const loadDraft = useCallback(async () => {
    if (!draftId || !brandId) return;
    try {
      setLoading(true);
      setError(null);
      console.log('Edit Post: Loading draft with ID:', draftId, 'Brand ID:', brandId);
      const { supabase } = await import('@/lib/supabase-browser');

      const { data, error } = await supabase
        .from('drafts')
        .select('id, brand_id, post_job_id, channel, copy, hashtags, asset_ids, tone, generated_by, created_by, created_at, approved, created_at_nzt, scheduled_for, scheduled_for_nzt, schedule_source, scheduled_by, publish_status, status')
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

      setDraft(data);
      setPostCopy(data.copy || '');
      setHashtags(normalizeHashtags(data.hashtags || []));

      if (data.channel) {
        const channels = data.channel
          .split(',')
          .map((c: string) => c.trim())
          .filter((c: string) => c);
        setSelectedChannels(channels);
      }

      await fetchPostJobs();
    } catch (err) {
      console.error('Error loading draft:', err);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [brandId, draftId, fetchPostJobs]);

  useEffect(() => {
    if (draftId && brandId) {
      void loadDraft();
    }
  }, [draftId, brandId, loadDraft]);

  // Convert UTC scheduled_for to brand local time when both draft and brand are loaded
  useEffect(() => {
    if (draft && brand?.timezone) {
      const scheduledFor = draft.scheduled_for || draft.post_jobs?.scheduled_at
      if (scheduledFor) {
        // Convert UTC to brand local time
        const localDate = utcToLocalDate(scheduledFor, brand.timezone)
        const localTime = utcToLocalTime(scheduledFor, brand.timezone)
        setScheduleDate(localDate)
        setScheduleTime(localTime)
      }
    }
  }, [draft, brand?.timezone]);

  // Sync selected assets with draft asset IDs and full asset data
  useEffect(() => {
    if (!draft) {
      setSelectedAssets([]);
      setActiveAssetId('');
      return;
    }

    const matchedAssets: Asset[] = (draft.asset_ids || [])
      .map((id) => assets.find((asset) => asset.id === id))
      .filter((asset): asset is Asset => Boolean(asset));

    setSelectedAssets(matchedAssets);

    if (matchedAssets.length === 0) {
      setActiveAssetId('');
      return;
    }

    setActiveAssetId((prev) => {
      if (prev && matchedAssets.some((asset) => asset.id === prev)) {
        return prev;
      }
      return matchedAssets[0].id;
    });
  }, [draft, assets]);

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

  const toggleChannel = useCallback(
    (channel: string) => {
      setSelectedChannels((prev) => {
        if (prev.includes(channel)) {
          return prev.filter((c) => c !== channel);
        }

        const incompatibleType = Array.from(selectedMediaTypes).find(
          (type) => !channelSupportsMedia(channel, type),
        );

        if (incompatibleType) {
          alert(
            `The ${channel} channel does not support ${
              incompatibleType === 'video' ? 'video' : 'image'
            } posts. Please remove incompatible media or choose a different channel.`,
          );
          return prev;
        }

        return [...prev, channel];
      });
    },
    [selectedMediaTypes],
  );

  const handleMediaSelect = useCallback(
    (asset: Asset) => {
      if (!draft) return;

      const mediaType = asset.asset_type ?? 'image';
      const incompatibleChannel = selectedChannels.find(
        (channel) => !channelSupportsMedia(channel, mediaType),
      );

      if (incompatibleChannel) {
        alert(
          `The ${incompatibleChannel} channel does not support ${
            mediaType === 'video' ? 'videos' : 'images'
          }. Remove the incompatible channel or choose different media.`,
        );
        return;
      }

      setDraft((prev) => {
        if (!prev) return prev;
        const existingIds = prev.asset_ids || [];
        if (existingIds.includes(asset.id)) {
          return prev;
        }
        return {
          ...prev,
          asset_ids: [...existingIds, asset.id],
        };
      });

      setActiveAssetId(asset.id);
      setIsMediaModalOpen(false);
    },
    [draft, selectedChannels],
  );

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
    if (selectedAssets.length > 0) {
      const assetsValid = await validateAssetsHaveTags(selectedAssets.map((asset) => asset.id));
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
      
      // Update the draft with new scheduling fields
      const { data, error } = await supabase
        .from('drafts')
        .update({
          copy: postCopy.trim(),
          hashtags: normalizedHashtags,
          asset_ids: selectedAssets.map((asset) => asset.id),
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

  const handleRetryFailedChannels = useCallback(async () => {
    if (!draftId) return;
    try {
      setIsRetrying(true);
      const response = await fetch('/api/publishing/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draftId: draftId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = typeof payload?.error === 'string' ? payload.error : 'Retry failed';
        throw new Error(message);
      }

      const result = await response.json();
      
      // Update post_jobs state with the returned jobs
      if (result.jobs && Array.isArray(result.jobs)) {
        const normalized = result.jobs
          .map((job: {
            id: string;
            draft_id: string | null;
            channel: string;
            status: string;
            error: string | null;
            external_post_id: string | null;
            external_url: string | null;
            last_attempt_at: string | null;
          }): PostJobSummary | null => {
            const canonical = canonicalizeChannel(job.channel);
            if (!canonical) return null;
            return {
              id: job.id,
              draft_id: job.draft_id,
              channel: canonical,
              status: job.status,
              error: job.error ?? null,
              external_post_id: job.external_post_id ?? null,
              external_url: job.external_url ?? null,
              last_attempt_at: job.last_attempt_at ?? null,
            } as PostJobSummary;
          })
          .filter((job: PostJobSummary | null): job is PostJobSummary => Boolean(job));

        // Sort by channel order
        const CHANNEL_ORDER = ['facebook', 'instagram_feed', 'instagram_story', 'linkedin_profile', 'tiktok', 'x'];
        const CHANNEL_ORDER_INDEX = new Map(CHANNEL_ORDER.map((channel, index) => [channel, index]));
        normalized.sort((a: PostJobSummary, b: PostJobSummary) => {
          const aIndex = CHANNEL_ORDER_INDEX.get(a.channel) ?? Number.MAX_SAFE_INTEGER;
          const bIndex = CHANNEL_ORDER_INDEX.get(b.channel) ?? Number.MAX_SAFE_INTEGER;
          if (aIndex === bIndex) {
            return a.channel.localeCompare(b.channel);
          }
          return aIndex - bIndex;
        });

        setPostJobs(normalized);
      }

      // Update draft status if provided
      if (result.draftStatus && draft) {
        setDraft((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: result.draftStatus as Draft['status'],
          };
        });
      }

      // Refetch to ensure we have the latest data
      await fetchPostJobs();
      await loadDraft();
    } catch (err) {
      console.error('Failed to retry channels:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to retry channels. Please try again.';
      alert(errorMessage);
    } finally {
      setIsRetrying(false);
    }
  }, [draftId, fetchPostJobs, loadDraft, draft]);

  const approveAndScheduleDraft = async (navigateAfterSuccess = true): Promise<{ success: boolean; data?: Draft | null; error?: Error | unknown }> => {
    if (!postCopy.trim()) {
      alert('Please enter post content');
      return { success: false };
    }

    if (selectedChannels.length === 0) {
      alert('Please select at least one channel');
      return { success: false };
    }

    if (!scheduleDate || !scheduleTime) {
      alert('Please select a date and time');
      return { success: false };
    }

    // Validate assets have tags before approving
    if (selectedAssets.length > 0) {
      const assetsValid = await validateAssetsHaveTags(selectedAssets.map((asset) => asset.id));
      if (!assetsValid) {
        return { success: false }; // Validation failed, error message already shown
      }
    }

    setIsApproving(true);

    try {
      const { supabase } = await import('@/lib/supabase-browser');
      
      // Convert local date/time (in brand timezone) to UTC
      if (!brand?.timezone) {
        alert('Brand timezone not configured. Please update brand settings.')
        return { success: false };
      }
      
      const scheduledAt = localToUtc(scheduleDate, scheduleTime, brand.timezone)
      
      // Normalize hashtags before saving
      const normalizedHashtags = normalizeHashtags(hashtags);
      
      const { data, error } = await supabase
        .from('drafts')
        .update({
          copy: postCopy.trim(),
          hashtags: normalizedHashtags,
          asset_ids: selectedAssets.map((asset) => asset.id),
          channel: selectedChannels.join(','),
          approved: true, // Mark as approved
          status: 'scheduled',
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
        return { success: false, error };
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
      
      // Update local state
      if (data) {
        setDraft((prev) => (prev ? { ...prev, ...data } : null));
      }
      
      // Navigate back to schedule page if this was called directly
      if (navigateAfterSuccess) {
        alert('Post approved and scheduled successfully!');
        router.push(`/brands/${brandId}/schedule`);
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Error approving post:', error);
      alert('Failed to approve post. Please try again.');
      return { success: false, error };
    } finally {
      setIsApproving(false);
    }
  };

  const approveAndPublishNow = async () => {
    setIsPublishingNow(true);
    setIsDropdownOpen(false);

    try {
      // First, ensure the draft is approved and scheduled (don't navigate)
      const approveResult = await approveAndScheduleDraft(false);
      
      if (!approveResult || !approveResult.success) {
        const errorMessage = approveResult?.error instanceof Error 
          ? approveResult.error.message 
          : 'Failed to approve and schedule draft';
        alert(errorMessage);
        return;
      }

      // Now call the publish-now endpoint
      const response = await fetch('/api/publishing/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draftId }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        const errorMessage = data.error || 'Failed to publish now';
        alert(errorMessage);
        return;
      }

      // Update local state with the response
      if (data.draftStatus) {
        setDraft((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: data.draftStatus as Draft['status'],
            approved: true,
          };
        });
      }

      // Update post jobs if provided
      if (data.jobs && Array.isArray(data.jobs)) {
        const normalized = data.jobs
          .map((job: {
            id: string; draft_id: string | null; channel: string; status: string;
            error: string | null; external_post_id: string | null;
            external_url: string | null; last_attempt_at: string | null;
          }): PostJobSummary | null => {
            const canonical = canonicalizeChannel(job.channel);
            if (!canonical) return null;
            return {
              id: job.id, draft_id: job.draft_id, channel: canonical, status: job.status,
              error: job.error ?? null, external_post_id: job.external_post_id ?? null,
              external_url: job.external_url ?? null, last_attempt_at: job.last_attempt_at ?? null,
            } as PostJobSummary;
          })
          .filter((job: PostJobSummary | null): job is PostJobSummary => Boolean(job));

        // Sort by channel order
        const CHANNEL_ORDER = ['facebook', 'instagram_feed', 'instagram_story', 'linkedin_profile', 'tiktok', 'x'];
        const CHANNEL_ORDER_INDEX = new Map(CHANNEL_ORDER.map((channel, index) => [channel, index]));
        normalized.sort((a: PostJobSummary, b: PostJobSummary) => {
          const aIndex = CHANNEL_ORDER_INDEX.get(a.channel) ?? Number.MAX_SAFE_INTEGER;
          const bIndex = CHANNEL_ORDER_INDEX.get(b.channel) ?? Number.MAX_SAFE_INTEGER;
          if (aIndex === bIndex) {
            return a.channel.localeCompare(b.channel);
          }
          return aIndex - bIndex;
        });

        setPostJobs(normalized);
      }

      // Refetch to ensure we have the latest data
      await fetchPostJobs();
      await loadDraft();

      alert('Post approved and published successfully!');
    } catch (error) {
      console.error('Error publishing now:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish now. Please try again.';
      alert(errorMessage);
    } finally {
      setIsPublishingNow(false);
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
                      {/* Existing media from Draft */}
                      {selectedAssets.length > 0 ? (
                        selectedAssets.map((asset) => {
                          const isVideo = (asset.asset_type ?? 'image') === 'video';
                          const previewUrl = isVideo
                            ? asset.thumbnail_signed_url || asset.signed_url
                            : asset.signed_url || asset.thumbnail_signed_url;

                          return (
                            <div key={asset.id} className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveAssetId(asset.id)}
                                className={`group relative flex h-32 w-full items-center justify-center overflow-hidden rounded-lg ${
                                  activeAssetId === asset.id ? 'ring-2 ring-[#6366F1]' : ''
                                }`}
                              >
                                {isVideo ? (
                                  <>
                                    {previewUrl ? (
                                      <img
                                        src={previewUrl}
                                        alt={asset.title || 'Video preview'}
                                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center bg-black text-sm text-white/70">
                                        Video preview unavailable
                                      </div>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#6366F1] shadow">
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                      </div>
                                    </div>
                                  </>
                                ) : previewUrl ? (
                                  <img
                                    src={previewUrl}
                                    alt={asset.title || 'Asset'}
                                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
                                    Preview unavailable
                                  </div>
                                )}
                              </button>
                              <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                                {isVideo ? 'Video' : 'Image'}
                              </div>
                              <button
                                onClick={() => {
                                  setDraft((prev) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      asset_ids: (prev.asset_ids || []).filter((id) => id !== asset.id),
                                    };
                                  });
                                  setActiveAssetId((prev) => (prev === asset.id ? '' : prev));
                                }}
                                className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                              >
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            </div>
                          );
                        })
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

                  {/* Channel Status */}
                  {channelStatusItems.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Channel status</h3>
                        {canRetry && (
                          <button
                            onClick={handleRetryFailedChannels}
                            disabled={isRetrying}
                            className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                              isRetrying
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'
                            }`}
                          >
                            {isRetrying ? 'Retrying…' : 'Retry failed channels'}
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {channelStatusItems.map((job) => {
                          const meta = getChannelStatusMeta(job.status);
                          // Get the provider channel for describeChannelSupport (e.g., 'instagram_feed' -> 'instagram')
                          const providerChannel = job.channel === 'instagram_feed' || job.channel === 'instagram_story' 
                            ? 'instagram' 
                            : job.channel === 'linkedin_profile' 
                            ? 'linkedin' 
                            : job.channel;
                          return (
                            <div
                              key={job.id}
                              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                            >
                              <div className="flex items-center space-x-3">
                                {renderChannelIcon(job.channel)}
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {getChannelLabel(job.channel)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {describeChannelSupport(providerChannel)}
                                  </p>
                                  {job.status.toLowerCase() === 'failed' && job.error ? (
                                    <p className="mt-1 text-xs text-rose-600">{job.error}</p>
                                  ) : null}
                                  {job.status.toLowerCase() === 'success' && job.external_url ? (
                                    <a
                                      href={job.external_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1 inline-flex text-xs font-medium text-[#6366F1] hover:text-[#4F46E5]"
                                    >
                                      View post
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.textClass} ${meta.pillBgClass}`}
                              >
                                {meta.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                  <div className="relative inline-flex rounded-lg">
                    <button
                      onClick={approveAndScheduleDraft}
                      disabled={isSaving || isApproving || isPublishingNow || !canApprove}
                      className={`px-6 py-2 rounded-l-lg font-medium transition-colors ${
                        canApprove && !isPublishingNow
                          ? 'bg-[#6366F1] text-white hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isPublishingNow ? 'Publishing...' : isApproving ? 'Approving...' : 'Approve & Schedule'}
                    </button>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      disabled={isSaving || isApproving || isPublishingNow || !canApprove}
                      className={`px-2 py-2 rounded-r-lg border-l border-white/20 font-medium transition-colors ${
                        canApprove && !isPublishingNow
                          ? 'bg-[#6366F1] text-white hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsDropdownOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-lg bg-white border border-gray-200 shadow-lg">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              approveAndScheduleDraft();
                              setIsDropdownOpen(false);
                            }}
                            disabled={isSaving || isApproving || isPublishingNow || !canApprove}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed first:rounded-t-lg"
                          >
                            Approve & Schedule
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              approveAndPublishNow();
                            }}
                            disabled={isSaving || isApproving || isPublishingNow || !canApprove}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed last:rounded-b-lg"
                          >
                            Approve & Publish now
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#6366F1]" />
            </div>
          ) : assets.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-4 text-gray-500">No assets available for this brand.</p>
              <p className="text-sm text-gray-400">Upload assets in the Content Library first.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAssetTab('images')}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    assetTab === 'images' ? 'bg-[#6366F1] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Images ({imageAssets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAssetTab('videos')}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    assetTab === 'videos' ? 'bg-[#6366F1] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Videos ({videoAssets.length})
                </button>
              </div>
              {assetsForActiveTab.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  {assetTab === 'videos'
                    ? 'No videos available. Upload a video in the Content Library.'
                    : 'No images available. Upload an image in the Content Library.'}
                </div>
              ) : (
                <div className="grid max-h-[420px] grid-cols-2 gap-4 overflow-y-auto sm:grid-cols-3">
                  {assetsForActiveTab.map((asset) => {
                    const isSelected = selectedAssets.some((selected) => selected.id === asset.id);
                    const isVideo = (asset.asset_type ?? 'image') === 'video';
                    const previewUrl = isVideo
                      ? asset.thumbnail_signed_url || asset.signed_url
                      : asset.thumbnail_signed_url || asset.signed_url;

                    return (
                      <button
                        type="button"
                        key={asset.id}
                        onClick={() => handleMediaSelect(asset)}
                        className={`group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-[#6366F1] ring-2 ring-[#6366F1] ring-opacity-20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={asset.title || 'Asset preview'}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-500">
                            Preview unavailable
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
                        <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                          {isVideo ? 'Video' : 'Image'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </Modal>
      </AppLayout>
    </RequireAuth>
  );
}
