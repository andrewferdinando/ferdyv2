'use client';

import React, { useState } from 'react';
import { useDrafts } from '@/hooks/useDrafts';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import Modal from '@/components/ui/Modal';
import { Form, FormField, FormActions } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';

// Icons
const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

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
    post_jobs: {
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
}

export default function DraftCard({ draft, onUpdate }: DraftCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { updateDraft, approveDraft, deleteDraft } = useDrafts(draft.brand_id);
  const { accounts } = useSocialAccounts(draft.brand_id);

  // Check if channel has connected social account
  const hasConnectedAccount = accounts.some(account => 
    account.provider === draft.channel && account.status === 'connected'
  );

  const canApprove = hasConnectedAccount && draft.copy && draft.asset_ids.length > 0;

  const handleApprove = async () => {
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

  const handleDelete = async () => {
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

  const formatDateTime = (scheduledAt: string, timezone: string) => {
    const date = new Date(scheduledAt);
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'generated': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {draft.assets && draft.assets.length > 0 && (
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                <img 
                  src={`/api/assets/${draft.assets[0]?.storage_path || ''}`} 
                  alt={draft.assets[0]?.title || 'Asset'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(draft.post_jobs?.status || 'pending')}`}>
                  {draft.post_jobs?.status || 'pending'}
                </span>
                <span className="text-sm text-gray-500 capitalize">{draft.channel}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {draft.post_jobs?.scheduled_at ? 
                  formatDateTime(draft.post_jobs.scheduled_at, draft.post_jobs?.scheduled_tz || '') : 
                  'Not scheduled'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit draft"
            >
              <EditIcon />
            </button>
            
            <button
              onClick={handleApprove}
              disabled={!canApprove || isLoading}
              className={`p-2 rounded-lg transition-colors ${
                canApprove 
                  ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title={canApprove ? "Approve draft" : "Cannot approve - missing requirements"}
            >
              <CheckIcon />
            </button>
            
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete draft"
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <p className="text-gray-900 text-sm leading-relaxed">{draft.copy}</p>
          
          {draft.hashtags && draft.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {draft.hashtags.map((hashtag, index) => (
                <span key={index} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                  {hashtag}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Generated by: {draft.generated_by}</span>
            <span>{draft.asset_ids.length} asset(s)</span>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditDraftModal
        draft={draft}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={async (updates) => {
          try {
            await updateDraft(draft.id, updates);
            onUpdate();
            setIsEditModalOpen(false);
          } catch (error) {
            console.error('Failed to update draft:', error);
          }
        }}
      />
    </>
  );
}

// Edit Draft Modal Component
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Draft"
      subtitle="Update the draft content and scheduling"
      maxWidth="lg"
    >
      <Form onSubmit={handleSubmit}>
        <FormField label="Copy" required>
          <textarea
            value={formData.copy}
            onChange={(e) => setFormData({ ...formData, copy: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            rows={4}
            placeholder="Enter post copy..."
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

        <FormField label="Asset IDs">
          <Input
            type="text"
            value={formData.asset_ids}
            onChange={(e) => setFormData({ ...formData, asset_ids: e.target.value })}
            placeholder="Enter asset IDs separated by commas"
          />
        </FormField>

        <FormField label="Channel" required>
          <select
            value={formData.channel}
            onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
          >
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter/X</option>
            <option value="linkedin">LinkedIn</option>
            <option value="tiktok">TikTok</option>
          </select>
        </FormField>

        <FormField label="Scheduled Date & Time" required>
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
