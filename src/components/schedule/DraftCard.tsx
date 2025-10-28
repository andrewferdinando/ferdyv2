'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDrafts } from '@/hooks/useDrafts';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import Modal from '@/components/ui/Modal';
import { Form, FormField, FormActions } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase-browser';
import UserAvatar from '@/components/ui/UserAvatar';

// Helper component for draft images
function DraftImage({ asset }: { asset: { id: string; title: string; storage_path: string; aspect_ratio: string } }) {
  const [imageError, setImageError] = useState(false);
  
  if (imageError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-gray-400 text-xs">No image</span>
      </div>
    );
  }

  // Generate public URL using the same approach as Content Library
  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage
      .from('ferdy-assets')
      .getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <img 
      src={getPublicUrl(asset.storage_path)} 
      alt={asset.title || 'Asset'}
      className="w-full h-full object-cover"
      onError={() => setImageError(true)}
    />
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
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  x: XIcon,
};

interface DraftCardProps {
  draft: {
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
    }[];
  };
  onUpdate: () => void;
  status?: 'draft' | 'scheduled' | 'published';
}

export default function DraftCard({ draft, onUpdate, status = 'draft' }: DraftCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSeeMore, setShowSeeMore] = useState(false);
  const copyRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { updateDraft, approveDraft, deleteDraft } = useDrafts(draft.brand_id);
  const { accounts } = useSocialAccounts(draft.brand_id);

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

  // Parse channels (handle both single channel and comma-separated channels)
  const channels = draft.channel.includes(',') 
    ? draft.channel.split(',').map(c => c.trim())
    : [draft.channel];

  // Allow approval without connected social accounts (APIs will be integrated later)
  const canApprove = draft.copy && draft.asset_ids.length > 0;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'draft':
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
      case 'published':
        return (
          <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 border border-green-200 rounded-full">
            Published
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

  const handleCardClick = () => {
    router.push(`/brands/${draft.brand_id}/edit-post/${draft.id}`);
  };


  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                <DraftImage asset={draft.assets[0]} />
              </div>
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-xs">No image</span>
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
                {draft.copy}
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

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Date/Time */}
                <div className="flex items-center text-gray-500">
                  <ClockIcon className="w-4 h-4" />
                  <span className="text-sm ml-2">
                    {status === 'published' ? 'Published' : 
                     status === 'scheduled' ? 'Scheduled' : 
                     draft.scheduled_for ? 'Scheduled' : 'Created'} • {formatDateTime(draft.scheduled_for || draft.post_jobs?.scheduled_at || draft.created_at)}
                  </span>
                  {/* Platform Icons with proper spacing */}
                  <div className="flex items-center ml-4 space-x-1">
                    {channels.map((channel, index) => (
                      <div key={index}>
                        {getPlatformIcon(channel)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                {status === 'draft' && !draft.approved && (
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
                {status === 'draft' && draft.approved && (
                  <div className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 border border-green-200 rounded-md">
                    ✓ Approved
                  </div>
                )}
                {!draft.approved && getStatusBadge()}
                
                {/* Approved by indicator for scheduled posts */}
                {status === 'scheduled' && draft.scheduled_by && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <span>Approved by</span>
                    <UserAvatar userId={draft.scheduled_by} size="sm" />
                  </div>
                )}
                
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
              </div>
            </div>
          </div>
        </div>
      </div>

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