'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDrafts } from '@/hooks/useDrafts';
import { useSocialAccounts, type SocialAccountSummary } from '@/hooks/useSocialAccounts';
import { useBrand } from '@/hooks/useBrand';
import Modal from '@/components/ui/Modal';
import { Form, FormField, FormActions } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase-browser';
import UserAvatar from '@/components/ui/UserAvatar';
import { formatDateTimeLocal } from '@/lib/utils/timezone';
import OverdueApprovalModal from '@/components/schedule/OverdueApprovalModal';
import { usePublishNow } from '@/hooks/usePublishNow';
import PostContextBar, { type FrequencyInput } from '@/components/schedule/PostContextBar';
import type { PostJobSummary } from '@/types/postJobs';
import { canonicalizeChannel, getChannelLabel, SUPPORTED_CHANNELS } from '@/lib/channels';

const FORMAT_RATIOS: Record<string, number> = {
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

// Helper component for draft images
type DraftAsset = {
  id: string;
  title: string;
  storage_path: string;
  aspect_ratio: string;
  asset_type?: 'image' | 'video' | null;
  thumbnail_url?: string | null;
  signed_url?: string | null;
  thumbnail_signed_url?: string | null;
  duration_seconds?: number | null;
  width?: number | null;
  height?: number | null;
  image_crops?: Record<string, { scale?: number; x?: number; y?: number }> | null;
};

function DraftAssetPreview({ asset }: { asset: DraftAsset }) {
  const isVideo = (asset.asset_type ?? 'image') === 'video';
  const previewUrl = useMemo(() => {
    if (asset.thumbnail_signed_url) return asset.thumbnail_signed_url;
    if (!isVideo) return asset.thumbnail_signed_url || asset.signed_url || null;
    return null;
  }, [asset.thumbnail_signed_url, asset.signed_url, isVideo]);
  const fallbackUrl: string | null = null;

  const formatKey = (Object.keys(FORMAT_RATIOS) as Array<keyof typeof FORMAT_RATIOS>).includes(
    asset.aspect_ratio as keyof typeof FORMAT_RATIOS,
  )
    ? (asset.aspect_ratio as keyof typeof FORMAT_RATIOS)
    : '1:1';
  const frameWidth = FORMAT_RATIOS[formatKey];
  const frameHeight = 1;

  const imageWidth = asset.width ?? 1080;
  const imageHeight = asset.height ?? 1080;
  const imageRatio = imageWidth / Math.max(imageHeight, 1);

  const minScale = useMemo(() => {
    return Math.max(frameWidth / imageRatio, frameHeight / 1);
  }, [frameWidth, frameHeight, imageRatio]);

  const storedCrop = asset.image_crops?.[formatKey];
  const crop = useMemo(() => {
    const base = {
      scale: storedCrop?.scale ?? minScale,
      x: storedCrop?.x ?? 0,
      y: storedCrop?.y ?? 0,
    };
    return ensureCropWithinBounds(base, base.scale, minScale, imageRatio, 1, frameWidth, frameHeight);
  }, [frameHeight, frameWidth, imageRatio, minScale, storedCrop?.scale, storedCrop?.x, storedCrop?.y]);

  const overflowX = Math.max(0, (imageRatio * crop.scale - frameWidth) / 2);
  const overflowY = Math.max(0, (1 * crop.scale - frameHeight) / 2);

  const translateXPercent = overflowX === 0 ? 0 : (crop.x * overflowX * 100) / frameWidth;
  const translateYPercent = overflowY === 0 ? 0 : (crop.y * overflowY * 100) / frameHeight;

  const widthPercent = (imageRatio * crop.scale * 100) / frameWidth;
  const heightPercent = (crop.scale * 100) / frameHeight;

  if (!previewUrl && !fallbackUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-xs text-gray-400">No preview</span>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="relative h-full w-full">
        <img
          src={previewUrl ?? fallbackUrl ?? ''}
          alt={asset.title || 'Video'}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#6366F1] shadow">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {asset.duration_seconds ? (
          <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
            {Math.round(asset.duration_seconds)}s
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={previewUrl ?? fallbackUrl ?? ''}
        alt={asset.title || 'Asset'}
        className="h-full w-full object-cover"
        draggable={false}
      />
    </div>
  );
}

// Icons
const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);


const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ClockIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Platform Icons
const FacebookIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <div className={`rounded bg-[#1877F2] flex items-center justify-center ${className}`}>
    <span className="text-white text-xs font-bold">f</span>
  </div>
);

const LinkedInIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <div className={`rounded bg-[#0A66C2] flex items-center justify-center ${className}`}>
    <span className="text-white text-xs font-bold">in</span>
  </div>
);

const InstagramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <div className={`rounded bg-gradient-to-br from-[#833AB4] via-[#C13584] to-[#E1306C] flex items-center justify-center ${className}`}>
    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.07 1.645.07 4.85s-.012 3.584-.07 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.251-.149-4.771-1.699-4.919-4.919-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85c.149-3.227 1.664-4.771 4.919-4.919 1.266-.058 1.644-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072C3.58 0.238 2.31 1.684 2.163 4.947.105 6.227.092 6.635.092 9.897s.014 3.667.072 4.947c.147 3.264 1.693 4.534 4.947 4.682 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c3.264-.148 4.534-1.693 4.682-4.947.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947C23.762 2.316 22.316.846 19.053.698 17.773.64 17.365.626 14.103.626zM12 5.835a6.165 6.165 0 100 12.33 6.165 6.165 0 000-12.33zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" />
    </svg>
  </div>
);

const TikTokIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <div className={`rounded bg-black flex items-center justify-center ${className}`}>
    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  </div>
);

const XIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <div className={`rounded bg-black flex items-center justify-center ${className}`}>
    <span className="text-white text-xs font-bold">X</span>
  </div>
);

const platformIcons = {
  facebook: FacebookIcon,
  linkedin: LinkedInIcon,
  linkedin_profile: LinkedInIcon,
  instagram: InstagramIcon,
  instagram_feed: InstagramIcon,
  instagram_story: InstagramIcon,
  tiktok: TikTokIcon,
  x: XIcon,
};

type DraftStatus = 'draft' | 'scheduled' | 'partially_published' | 'published' | 'failed';

interface DraftCardProps {
  draft: {
    id: string;
    brand_id: string;
    post_job_id: string;
    channel: string;
    channels?: string[];
    copy: string;
    hashtags: string[];
    asset_ids: string[];
    tone: string;
    generated_by: 'ai' | 'human' | 'ai+human';
    created_by: string;
    created_at: string;
    approved: boolean;
    scheduled_for?: string | null; // UTC timestamp
    scheduled_for_nzt?: string | null; // NZT timestamp
    published_at?: string | null; // UTC timestamp - when draft was actually published
    schedule_source?: 'manual' | 'auto';
    scheduled_by?: string;
    publish_status?: string;
    category_id?: string;
    subcategory_id?: string;
    status?: DraftStatus;
    // From drafts_with_labels view
    category_name?: string;
    subcategory_name?: string;
    post_jobs?: {
      id: string;
      scheduled_at: string;
      scheduled_local: string;
      scheduled_tz: string;
      status: string;
      target_month: string;
      schedule_rule_id?: string;
    };
    publishes?: {
      id: string;
      published_at: string;
      external_post_id: string;
      external_url: string;
      status: string;
      error: string;
    } | null;
    assets?: DraftAsset[];
  };
  onUpdate: () => void;
  status?: DraftStatus;
  jobs?: PostJobSummary[];
  socialAccounts?: SocialAccountSummary[];
}

const CHANNEL_ORDER = SUPPORTED_CHANNELS;
const CHANNEL_ORDER_INDEX = new Map(CHANNEL_ORDER.map((channel, index) => [channel, index]));

export default function DraftCard({ draft, onUpdate, status, jobs, socialAccounts }: DraftCardProps) {
  const effectiveStatus: DraftStatus = status ?? draft.status ?? 'draft';
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSeeMore, setShowSeeMore] = useState(false);
  const [frequency, setFrequency] = useState<FrequencyInput | undefined>(undefined);
  const [eventWindow, setEventWindow] = useState<{ start: string; end: string } | undefined>(undefined);
  const copyRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
  const { updateDraft, approveDraft, deleteDraft } = useDrafts(draft.brand_id);
  const { accounts: hookAccounts } = useSocialAccounts(draft.brand_id);
  const accounts = socialAccounts ?? hookAccounts;
  const { brand } = useBrand(draft.brand_id); // Fetch brand for timezone
  const { publishNow } = usePublishNow();
  
  // Get category/subcategory names from draft (from drafts_with_labels view)
  const categoryName =
    draft.schedule_source === 'manual'
      ? 'Manually created'
      : draft.category_name || 'Uncategorized';
  const subcategoryName = draft.subcategory_name;

  // Check if content exceeds 2 lines
  useEffect(() => {
    if (copyRef.current) {
      const element = copyRef.current;
      // Temporarily remove line-clamp to measure full height
      const originalStyle = element.style.cssText;
      element.style.display = 'block';
      element.style.webkitLineClamp = 'unset';
      element.style.webkitBoxOrient = 'unset';
      element.style.overflow = 'visible';
      
      const fullHeight = element.scrollHeight;
      const lineHeight = parseFloat(window.getComputedStyle(element).lineHeight) || 24;
      const maxHeight = lineHeight * 2;
      
      // Restore original style
      element.style.cssText = originalStyle;
      
      // Show "see more" if content exceeds 2 lines
      setShowSeeMore(fullHeight > maxHeight + 4); // +4 for slight tolerance
    }
  }, [draft.copy]);

  const handleEditClick = () => {
    router.push(`/brands/${draft.brand_id}/edit-post/${draft.id}`);
  };

  // Build jobs from props - post_jobs is the ONLY source of truth
  // NEVER use draft.channel, draft.publish_status, draft.status, or any legacy fields
  const normalizedJobs = useMemo(() => {
    // SAFEGUARD: If both post_jobs and draft.channel exist, prefer post_jobs and log a warning
    if (jobs && Array.isArray(jobs) && jobs.length > 0) {
      if (draft.channel) {
        console.warn('[DraftCard] Both post_jobs and draft.channel present. Using post_jobs only (legacy draft.channel ignored).', {
          draftId: draft.id,
          postJobsCount: jobs.length,
          draftChannel: draft.channel,
        });
      }

      // Normalize channels first
      const normalized = jobs
        .map((job) => ({
          ...job,
          channel: canonicalizeChannel(job.channel) ?? job.channel,
        }))
        .filter((job) => Boolean(job.channel)); // Filter out invalid channels

      // Group by channel and select the best job per channel
      // Priority: success/published > pending > failed > queued/running
      // If a job has external_url, prefer that one for "View post"
      const statusPriority: Record<string, number> = {
        'success': 1,
        'published': 1,
        'pending': 2,
        'ready': 2,
        'generated': 2,
        'publishing': 2,
        'failed': 3,
        'queued': 4,
        'running': 4,
      };

      const getStatusPriority = (status: string): number => {
        const normalized = status.toLowerCase();
        return statusPriority[normalized] ?? 99;
      };

      const jobsByChannel = new Map<string, PostJobSummary>();
      
      for (const job of normalized) {
        const channel = job.channel;
        const existing = jobsByChannel.get(channel);
        
        if (!existing) {
          jobsByChannel.set(channel, job);
        } else {
          // Compare priorities
          const existingPriority = getStatusPriority(existing.status);
          const jobPriority = getStatusPriority(job.status);
          
          // Lower priority number = higher priority
          if (jobPriority < existingPriority) {
            jobsByChannel.set(channel, job);
          } else if (jobPriority === existingPriority) {
            // Same priority: prefer the one with external_url for "View post"
            if (job.external_url && !existing.external_url) {
              jobsByChannel.set(channel, job);
            }
            // Otherwise keep existing (first one wins)
          }
        }
      }

      // Convert back to array and sort
      const uniqueJobs = Array.from(jobsByChannel.values());
      uniqueJobs.sort((a, b) => {
        const aIndex = CHANNEL_ORDER_INDEX.get(a.channel) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = CHANNEL_ORDER_INDEX.get(b.channel) ?? Number.MAX_SAFE_INTEGER;
        if (aIndex === bIndex) {
          return a.channel.localeCompare(b.channel);
        }
        return aIndex - bIndex;
      });

      // Assertion: ensure no duplicate channels
      const channels = uniqueJobs.map(j => j.channel);
      const uniqueChannels = new Set(channels);
      if (channels.length !== uniqueChannels.size) {
        console.error('[DraftCard] Duplicate channels detected after grouping:', {
          channels,
          uniqueChannels: Array.from(uniqueChannels),
          draftId: draft.id,
        });
      }

      // LOG: Show what array is being used to render pills
      const pendingJobs = uniqueJobs.filter(j => {
        const status = j.status.toLowerCase();
        return status === 'pending' || status === 'ready' || status === 'generated' || status === 'publishing';
      });
      if (pendingJobs.length > 0) {
        console.log('[DraftCard] Rendering Pending pills from post_jobs:', {
          draftId: draft.id,
          pendingJobs: pendingJobs.map(j => ({ channel: j.channel, status: j.status, id: j.id })),
          source: 'post_jobs',
        });
      }

      const publishedJobs = uniqueJobs.filter(j => {
        const status = j.status.toLowerCase();
        return status === 'success' || status === 'published';
      });
      if (publishedJobs.length > 0) {
        console.log('[DraftCard] Rendering Published pills from post_jobs:', {
          draftId: draft.id,
          publishedJobs: publishedJobs.map(j => ({ channel: j.channel, status: j.status, id: j.id })),
          source: 'post_jobs',
        });
      }
      
      return uniqueJobs;
    }

    // NO FALLBACK: If no post_jobs exist, return empty array
    // Do NOT use draft.channel, draft.publish_status, draft.status, or any legacy fields
    if (draft.channel) {
      console.warn('[DraftCard] No post_jobs found, but draft.channel exists. Not rendering pills (post_jobs is required).', {
        draftId: draft.id,
        draftChannel: draft.channel,
      });
    }

    return [] as PostJobSummary[];
  }, [jobs, draft.id]);

  // Fetch schedule rule data for frequency (category/subcategory comes from view)
  useEffect(() => {
    const fetchContextData = async () => {
      try {
        let scheduleRuleId: string | null = null;

        // Fetch schedule rule via post_job -> schedule_rule_id
        if (draft.post_job_id) {
          const { data: postJobData } = await supabase
            .from('post_jobs')
            .select('schedule_rule_id')
            .eq('id', draft.post_job_id)
            .single();
          if (postJobData?.schedule_rule_id) {
            scheduleRuleId = postJobData.schedule_rule_id;
          }
        }

        // If we have a schedule rule, fetch it for frequency
        if (scheduleRuleId) {
          const { data: ruleData } = await supabase
            .from('schedule_rules')
            .select('frequency, days_of_week, day_of_month, nth_week, weekday, time_of_day, start_date, end_date, days_before, days_during')
            .eq('id', scheduleRuleId)
            .single();

          if (ruleData) {
            // Convert to FrequencyInput
            const freq: FrequencyInput | undefined = (() => {
              switch (ruleData.frequency) {
                case 'daily':
                  return { kind: 'daily' };
                
                case 'weekly': {
                  const daysOfWeek = (ruleData.days_of_week as number[]) || [];
                  const timeOfDay = Array.isArray(ruleData.time_of_day) 
                    ? ruleData.time_of_day[0] 
                    : (ruleData.time_of_day as string | undefined);
                  return {
                    kind: 'weekly',
                    daysOfWeek,
                    time: timeOfDay || undefined,
                  };
                }

                case 'monthly': {
                  const daysOfMonth = Array.isArray(ruleData.day_of_month)
                    ? ruleData.day_of_month
                    : (ruleData.day_of_month ? [ruleData.day_of_month] : []);
                  const timeOfDay = Array.isArray(ruleData.time_of_day)
                    ? ruleData.time_of_day[0]
                    : (ruleData.time_of_day as string | undefined);
                  return {
                    kind: 'monthly',
                    daysOfMonth,
                    nthWeek: ruleData.nth_week as number | null | undefined,
                    weekday: ruleData.weekday as number | null | undefined,
                    time: timeOfDay || undefined,
                  };
                }

                case 'specific': {
                  if (ruleData.start_date) {
                    const startDate = new Date(ruleData.start_date).toISOString();
                    const endDate = ruleData.end_date ? new Date(ruleData.end_date).toISOString() : startDate;
                    
                    // Check if it's a range or single date
                    if (ruleData.end_date && ruleData.end_date !== ruleData.start_date) {
                      // Range
                      const daysDuring = (ruleData.days_during as number[] | null) || [];
                      const offsetDays = daysDuring.length > 0 ? daysDuring[0] : undefined;
                      setEventWindow({ start: startDate, end: endDate });
                      return {
                        kind: 'rangeDuring',
                        start: startDate,
                        end: endDate,
                        offsetDays,
                      };
                    } else {
                      // Single date with days_before
                      const daysBefore = (ruleData.days_before as number[] | null) || [];
                      if (daysBefore.length > 0 && draft.scheduled_for && brand?.timezone) {
                        // Find which days_before value was used by matching the scheduled date
                        // Convert scheduled date to timezone-aware date string for comparison
                        const scheduledDate = new Date(draft.scheduled_for);
                        const scheduledDateStr = scheduledDate.toLocaleDateString('en-CA', { timeZone: brand.timezone });
                        
                        const anchorDate = new Date(ruleData.start_date);
                        const anchorDateStr = anchorDate.toLocaleDateString('en-CA', { timeZone: brand.timezone });
                        const [yearA, monthA, dayA] = anchorDateStr.split('-').map(Number);
                        const anchorDateInTz = new Date(yearA, monthA - 1, dayA);
                        
                        // Try each days_before value to find which one matches
                        // Calculate the scheduled date's day components in brand timezone for comparison
                        const [yearS, monthS, dayS] = scheduledDateStr.split('-').map(Number);
                        const scheduledDayInTz = new Date(yearS, monthS - 1, dayS);
                        
                        let matchedDaysBefore: number | null = null;
                        for (const db of daysBefore) {
                          if (db < 0) continue;
                          // Calculate what date this days_before would produce
                          const calculatedDate = new Date(anchorDateInTz);
                          calculatedDate.setDate(calculatedDate.getDate() - db);
                          
                          // Compare date components directly (year, month, day)
                          if (calculatedDate.getFullYear() === scheduledDayInTz.getFullYear() &&
                              calculatedDate.getMonth() === scheduledDayInTz.getMonth() &&
                              calculatedDate.getDate() === scheduledDayInTz.getDate()) {
                            matchedDaysBefore = db;
                            break;
                          }
                        }
                        
                        // If we found a match, use it (negative because it's "before")
                        if (matchedDaysBefore !== null) {
                          return {
                            kind: 'offsetDate',
                            anchorDate: anchorDate.toISOString(),
                            offsetDays: -matchedDaysBefore, // Negative for "days before"
                          };
                        }
                        
                        // Fallback: calculate offset if no match found
                        // Use the scheduledDayInTz we already calculated above
                        // Calculate days difference: scheduled - anchor
                        // If scheduled is before anchor, result is negative (correct for "days before")
                        // If scheduled is after anchor, result is positive (correct for "days after")
                        const diffTime = scheduledDayInTz.getTime() - anchorDateInTz.getTime();
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                        
                        return {
                          kind: 'offsetDate',
                          anchorDate: anchorDate.toISOString(),
                          offsetDays: diffDays, // Negative for "days before", positive for "days after"
                        };
                      }
                      return {
                        kind: 'oneOff',
                        date: startDate,
                      };
                    }
                  }
                  return undefined;
                }

                default:
                  return undefined;
              }
            })();
            setFrequency(freq);
          }
        }
      } catch (error) {
        console.error('Error fetching context data:', error);
      }
    };

    fetchContextData();
  }, [draft.post_job_id, draft.scheduled_for, brand?.timezone]);

  // Allow approval without connected social accounts (APIs will be integrated later)
  const canApprove = !!draft.copy && (draft.asset_ids ? draft.asset_ids.length > 0 : false);

  const isOverdue = effectiveStatus === 'draft'
    && !draft.approved
    && !!draft.scheduled_for
    && new Date(draft.scheduled_for) < new Date();

  const formatDateTime = (dateString: string) => {
    if (!brand?.timezone) {
      // Fallback to browser local time if brand timezone not loaded
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    // Use brand timezone for formatting
    return formatDateTimeLocal(dateString, brand.timezone);
  };

  const getStatusBadge = () => {
    switch (effectiveStatus) {
      case 'draft':
        if (isOverdue) {
          return (
            <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 border border-red-200 rounded-full">
              Overdue
            </span>
          );
        }
        return (
          <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full">
            Draft
          </span>
        );
      case 'scheduled':
        return (
          <span className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-full">
            Scheduled
          </span>
        );
      case 'partially_published':
        return (
          <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 rounded-full">
            Partially published
          </span>
        );
      case 'published':
        return (
          <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 border border-green-200 rounded-full">
            Published
          </span>
        );
      case 'failed':
        return (
          <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 border border-red-200 rounded-full">
            Failed
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 rounded-full">
            Draft
          </span>
        );
    }
  };

  const getPlatformIcon = (platform: string) => {
    const IconComponent = platformIcons[platform.toLowerCase() as keyof typeof platformIcons];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
  };

  const getChannelStatusVisual = (statusValue: string) => {
    const normalized = statusValue.toLowerCase();
    if (normalized === 'success' || normalized === 'published') {
      return {
        indicatorClass: 'bg-emerald-500',
        label: 'Published',
        icon: '✓',
        textClass: 'text-emerald-600',
        pillBgClass: 'bg-emerald-100',
      };
    }
    if (normalized === 'failed') {
      return {
        indicatorClass: 'bg-rose-500',
        label: 'Failed',
        icon: '!',
        textClass: 'text-rose-600',
        pillBgClass: 'bg-rose-100',
      };
    }
    // pending, ready, generated, publishing all show as "Pending" with yellow/amber
    return {
      indicatorClass: 'bg-amber-400',
      label: 'Pending',
      icon: '•',
      textClass: 'text-amber-600',
      pillBgClass: 'bg-amber-100',
    };
  };

  const channelStatusStrip =
    normalizedJobs.length > 0 ? (
      <div 
        className="mb-4 flex flex-wrap items-center gap-3 w-full overflow-visible" 
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 0, overflow: 'visible' }}
      >
        {normalizedJobs.map((job, index) => {
          const { indicatorClass, label, icon, textClass, pillBgClass } = getChannelStatusVisual(job.status);
          const tooltip =
            job.status.toLowerCase() === 'failed' && job.error
              ? `${getChannelLabel(job.channel)} • Failed: ${job.error}`
              : `${getChannelLabel(job.channel)} • ${label}`;

          return (
            <div
              key={job.id || `${draft.id}-${job.channel}-${job.status}-${index}`}
              className="flex items-center space-x-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm flex-shrink-0"
              title={tooltip}
              style={{ 
                position: 'relative', 
                zIndex: 1,
                minWidth: 'max-content',
                visibility: 'visible',
                opacity: 1
              }}
            >
              <div className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-50">
                  {getPlatformIcon(job.channel)}
                </div>
                <span
                  className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold text-white ${indicatorClass}`}
                >
                  {icon}
                </span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-medium text-gray-700">{getChannelLabel(job.channel)}</span>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${textClass} ${pillBgClass}`}>
                    {label}
                  </span>
                  {(job.status.toLowerCase() === 'success' || job.status.toLowerCase() === 'published') && job.external_url ? (
                    <a
                      href={job.external_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] font-medium text-[#6366F1] hover:text-[#4F46E5]"
                    >
                      View post
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : null;

  const handleCardClick = () => {
    router.push(`/brands/${draft.brand_id}/edit-post/${draft.id}`);
  };


  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // If draft is overdue, show modal instead of approving directly
    if (draft.scheduled_for && new Date(draft.scheduled_for) < new Date()) {
      setIsOverdueModalOpen(true);
      return;
    }
    try {
      setIsLoading(true);
      await approveDraft(draft.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to approve draft:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverduePublishNow = async () => {
    await approveDraft(draft.id);
    await publishNow(draft.id, {
      onSuccess: () => {
        setIsOverdueModalOpen(false);
        onUpdate();
      },
      onError: () => {
        setIsOverdueModalOpen(false);
        onUpdate();
      },
    });
  };

  const handleOverdueReschedule = async (newScheduledAtUtc: string) => {
    // Update drafts.scheduled_for directly (rpc_update_draft doesn't touch this column
    // and requires copy/hashtags/asset_ids/channel which we don't want to re-send)
    const { error: draftError } = await supabase
      .from('drafts')
      .update({ scheduled_for: newScheduledAtUtc })
      .eq('id', draft.id);
    if (draftError) throw draftError;

    // Update all post_jobs for this draft with the new scheduled_at
    // and reset failed jobs back to pending so the publishing engine picks them up
    const { error: jobsError } = await supabase
      .from('post_jobs')
      .update({ scheduled_at: newScheduledAtUtc, status: 'pending', error: null })
      .eq('draft_id', draft.id)
      .in('status', ['failed', 'canceled']);
    if (jobsError) throw jobsError;

    // Also update scheduled_at for non-failed jobs (pending/ready/generated)
    const { error: otherJobsError } = await supabase
      .from('post_jobs')
      .update({ scheduled_at: newScheduledAtUtc })
      .eq('draft_id', draft.id)
      .not('status', 'in', '("failed","canceled","success")');
    if (otherJobsError) throw otherJobsError;

    await approveDraft(draft.id);
    setIsOverdueModalOpen(false);
    onUpdate();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this draft?')) {
      try {
        setIsLoading(true);
        await deleteDraft(draft.id);
        onUpdate();
      } catch (error) {
        console.error('Failed to delete draft:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <div 
        className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex gap-4">
          {/* Image Section */}
          <div className="flex-shrink-0">
            {draft.assets && draft.assets.length > 0 ? (
              <div className="relative w-20 h-20 aspect-square overflow-hidden rounded-lg bg-gray-100">
                <DraftAssetPreview asset={draft.assets[0]} />
              </div>
            ) : (
              <div className="flex h-20 w-20 aspect-square items-center justify-center rounded-lg bg-gray-100">
                <span className="text-xs text-gray-400">No media</span>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-1 min-w-0">
            {/* Post Copy with 2-line limit and "see more" */}
            <div className="relative mb-4">
              <div 
                ref={copyRef}
                className="text-gray-900"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: '1.5',
                  paddingRight: showSeeMore ? '4rem' : '0',
                }}
              >
                {draft.copy || 'Post copy coming soon…'}
              </div>
              {/* "See more" link - only shown when content exceeds 2 lines */}
              {showSeeMore && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/brands/${draft.brand_id}/edit-post/${draft.id}`);
                  }}
                  className="absolute bottom-0 right-0 text-[#6366F1] text-sm font-medium hover:text-[#4F46E5] transition-colors ml-2 bg-white pl-1"
                  style={{
                    textShadow: '0 0 3px white, 0 0 3px white',
                  }}
                >
                  see more
                </button>
              )}
            </div>
            
            {/* Hashtags */}
            {draft.hashtags && draft.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4" style={{ marginTop: showSeeMore ? '0.5rem' : '0.75rem' }}>
                {draft.hashtags.map((hashtag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 bg-[#EEF2FF] text-[#6366F1] text-xs font-medium rounded-full"
                  >
                    {hashtag.startsWith('#') ? hashtag : `#${hashtag}`}
                  </span>
                ))}
              </div>
            )}

            {channelStatusStrip}

            {/* Footer */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                {/* Date/Time */}
                <div className={`flex items-center ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                  <ClockIcon className="w-4 h-4" />
                  <span className="text-sm ml-2">
                    {effectiveStatus === 'published' ? 'Published' :
                     isOverdue ? 'Overdue' :
                     draft.scheduled_for ? 'Scheduled' : 'Created'} • {formatDateTime(
                      effectiveStatus === 'published' 
                        ? (draft.publishes?.published_at || draft.published_at || draft.scheduled_for || draft.post_jobs?.scheduled_at || draft.created_at)
                        : (draft.scheduled_for || draft.post_jobs?.scheduled_at || draft.created_at)
                    )}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                {effectiveStatus === 'draft' && !draft.approved && (
                  <button
                    onClick={handleApprove}
                    disabled={!canApprove || isLoading}
                    className={`px-3 py-1 text-xs font-medium border rounded-md transition-colors ${
                      canApprove 
                        ? 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700' 
                        : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Approve
                  </button>
                )}
                {effectiveStatus === 'draft' && draft.approved && (
                  <div className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 border border-green-200 rounded-md">
                    ✓ Approved
                  </div>
                )}
                {getStatusBadge()}
                
                {/* Approved by indicator for scheduled posts */}
                {effectiveStatus === 'scheduled' && draft.scheduled_by && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <span>Approved by</span>
                    <UserAvatar userId={draft.scheduled_by} size="sm" />
                  </div>
                )}
                
                {/* Published posts are immutable from the UI - hide edit/delete actions */}
                {effectiveStatus !== 'published' && (
                  <>
                    <button
                      onClick={handleEditClick}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Post Context Bar */}
            {brand?.timezone && (
              <PostContextBar
                categoryName={categoryName}
                subcategoryName={subcategoryName}
                frequency={frequency}
                brandTimezone={brand.timezone}
                scheduledFor={draft.scheduled_for || draft.post_jobs?.scheduled_at}
                eventWindow={eventWindow}
              />
            )}

            {/* Connected Account Metadata */}
            {accounts.filter(a => a.status === 'connected').length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-2">
                <span className="text-[11px] text-gray-400">
                  {effectiveStatus === 'published' ? 'Published from' : 'Will be published from'}
                </span>
                {accounts.filter(a => a.status === 'connected').map(a => {
                  const meta = a.metadata as Record<string, unknown> | null;
                  const pic = meta?.profilePictureUrl as string | undefined;
                  return (
                    <div key={a.provider} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      {getPlatformIcon(a.provider)}
                      {pic && (
                        <img src={pic} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                      )}
                      <span>{a.handle}</span>
                      <span className="text-gray-300">·</span>
                      <span>{a.account_id}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Approval Modal */}
      {isOverdueModalOpen && brand?.timezone && draft.scheduled_for && (
        <OverdueApprovalModal
          isOpen={isOverdueModalOpen}
          onClose={() => setIsOverdueModalOpen(false)}
          draft={{ id: draft.id, scheduled_for: draft.scheduled_for }}
          brandTimezone={brand.timezone}
          onPublishNow={handleOverduePublishNow}
          onReschedule={handleOverdueReschedule}
        />
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditDraftModal
          draft={draft}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={async (updates) => {
            try {
              await updateDraft(draft.id, updates);
              setIsEditModalOpen(false);
              onUpdate();
            } catch (error) {
              console.error('Failed to update draft:', error);
            }
          }}
        />
      )}
    </>
  );
}

// Edit Modal Component
interface EditDraftModalProps {
  draft: DraftCardProps['draft'];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    copy?: string;
    hashtags?: string[];
    asset_ids?: string[];
    channel?: string;
    scheduled_at?: string;
  }) => Promise<void>;
}

function EditDraftModal({ draft, isOpen, onClose, onSave }: EditDraftModalProps) {
  const [formData, setFormData] = useState({
    copy: draft.copy,
    hashtags: draft.hashtags.join(', '),
    asset_ids: draft.asset_ids.join(', '),
    channel: draft.channel,
    scheduled_at: draft.post_jobs?.scheduled_at || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates = {
      copy: formData.copy,
      hashtags: formData.hashtags.split(',').map(tag => tag.trim()).filter(tag => tag),
      asset_ids: formData.asset_ids.split(',').map(id => id.trim()).filter(id => id),
      channel: formData.channel,
      scheduled_at: formData.scheduled_at
    };

    await onSave(updates);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Draft">
      <Form onSubmit={handleSubmit}>
        <FormField label="Post Copy" required>
          <textarea
            value={formData.copy}
            onChange={(e) => setFormData({ ...formData, copy: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={4}
            required
          />
        </FormField>

        <FormField label="Hashtags">
          <Input
            type="text"
            value={formData.hashtags}
            onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
            placeholder="Enter hashtags separated by commas"
          />
        </FormField>

        <FormField label="Channel" required>
          <select
            value={formData.channel}
            onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="tiktok">TikTok</option>
          </select>
        </FormField>

        <FormField label="Scheduled Date & Time">
          <Input
            type="datetime-local"
            value={formData.scheduled_at ? new Date(formData.scheduled_at).toISOString().slice(0, 16) : ''}
            onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : '' })}
          />
        </FormField>

        <FormActions onCancel={onClose} submitText="Save Changes" />
      </Form>
    </Modal>
  );
}