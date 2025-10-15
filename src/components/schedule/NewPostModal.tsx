'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/ui/Modal';
import { Form, FormField, FormActions } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { useAssets } from '@/hooks/useAssets';

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
  onSuccess: () => void;
}

export default function NewPostModal({ isOpen, onClose, brandId, onSuccess }: NewPostModalProps) {
  const [formData, setFormData] = useState({
    copy: '',
    hashtags: '',
    asset_ids: [] as string[],
    channels: [] as string[],
    scheduled_at: '',
    approve_now: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const { assets } = useAssets(brandId);

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

  const toggleAsset = (assetId: string) => {
    setFormData(prev => ({
      ...prev,
      asset_ids: prev.asset_ids.includes(assetId)
        ? prev.asset_ids.filter(id => id !== assetId)
        : [...prev.asset_ids, assetId]
    }));
  };

  const toggleChannel = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
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
          <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto">
            {assets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => toggleAsset(asset.id)}
                className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                  formData.asset_ids.includes(asset.id)
                    ? 'border-[#6366F1] ring-2 ring-[#6366F1] ring-opacity-20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={`/api/assets/${asset.storage_path}`}
                    alt={asset.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs text-gray-600 truncate">{asset.title}</p>
                  <span className="text-xs text-gray-400">{asset.aspect_ratio}</span>
                </div>
                {formData.asset_ids.includes(asset.id) && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-[#6366F1] rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
          {assets.length === 0 && (
            <p className="text-gray-500 text-sm">No assets available. Upload some assets first.</p>
          )}
        </FormField>

        <FormField label="Channels" required>
          <div className="space-y-2">
            {['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'].map((channel) => (
              <label key={channel} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.channels.includes(channel)}
                  onChange={() => toggleChannel(channel)}
                  className="rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
                />
                <span className="text-sm text-gray-700 capitalize">{channel}</span>
              </label>
            ))}
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
