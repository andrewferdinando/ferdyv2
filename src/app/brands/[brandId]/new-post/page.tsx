'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import Modal from '@/components/ui/Modal';

export default function NewPostPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  
  // Empty initial state for new post
  const [postCopy, setPostCopy] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState('');

  const handleHashtagKeyPress = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && newHashtag.trim()) {
      e.preventDefault();
      const tag = newHashtag.trim().startsWith('#') ? newHashtag.trim() : `#${newHashtag.trim()}`;
      if (!hashtags.includes(tag)) {
        setHashtags([...hashtags, tag]);
      }
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

  const handleMediaSelect = (mediaUrl: string) => {
    setSelectedMedia(mediaUrl);
    setIsMediaModalOpen(false);
  };

  const handleSave = () => {
    // TODO: Implement save logic for new post
    console.log('Saving new post:', {
      postCopy,
      hashtags,
      selectedChannels,
      scheduleDate,
      scheduleTime,
      selectedMedia
    });
    // Navigate back to schedule page
    router.push(`/brands/${brandId}/schedule`);
  };

  const handleCancel = () => {
    router.push(`/brands/${brandId}/schedule`);
  };

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Post</h1>
                <p className="text-gray-600 mt-1">Create a new post to schedule across your social channels</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all"
                >
                  Save Post
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Post Content */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Post Content</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Post Copy
                      </label>
                      <textarea
                        value={postCopy}
                        onChange={(e) => setPostCopy(e.target.value)}
                        placeholder="Write your post content here..."
                        className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      />
                    </div>

                    {/* Hashtags */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hashtags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {hashtags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                          >
                            {tag}
                            <button
                              onClick={() => removeHashtag(tag)}
                              className="ml-2 text-indigo-600 hover:text-indigo-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={newHashtag}
                        onChange={(e) => setNewHashtag(e.target.value)}
                        onKeyDown={handleHashtagKeyPress}
                        placeholder="Type hashtags and press Enter or comma to add"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Media */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Media</h3>
                  
                  <button
                    onClick={() => setIsMediaModalOpen(true)}
                    className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors"
                  >
                    {selectedMedia ? (
                      <img src={selectedMedia} alt="Selected media" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <div className="text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <p className="text-gray-600">Click to add media</p>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Channels */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Channels</h3>
                  
                  <div className="space-y-3">
                    {[
                      { id: 'facebook', name: 'Facebook', color: 'bg-blue-600' },
                      { id: 'instagram', name: 'Instagram', color: 'bg-pink-600' },
                      { id: 'linkedin', name: 'LinkedIn', color: 'bg-blue-700' },
                      { id: 'twitter', name: 'Twitter', color: 'bg-black' },
                    ].map((channel) => (
                      <label key={channel.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedChannels.includes(channel.id)}
                          onChange={() => toggleChannel(channel.id)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded ${channel.color} mr-3 flex items-center justify-center`}>
                          {selectedChannels.includes(channel.id) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{channel.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time
                      </label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
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
          <div className="grid grid-cols-2 gap-4">
            {[
              '/assets/placeholders/image1.png',
              '/assets/placeholders/image2.png',
              '/assets/placeholders/image3.png',
              '/assets/placeholders/image4.png',
            ].map((media, index) => (
              <button
                key={index}
                onClick={() => handleMediaSelect(media)}
                className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all"
              >
                <img src={media} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </Modal>
      </AppLayout>
    </RequireAuth>
  );
}
