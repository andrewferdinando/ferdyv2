'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

export default function NewPostPage() {
  const router = useRouter();
  const [postCopy, setPostCopy] = useState("");
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

  const handleSaveToDrafts = () => {
    // Save to drafts logic
    alert('Post saved to drafts!');
    router.push('/schedule');
  };

  const handleApprove = () => {
    // Approve logic
    alert('Post approved!');
    router.push('/schedule');
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">New Post</h1>
              <p className="text-gray-600 mt-1 text-sm">Create a new social media post.</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Action Buttons */}
              <button
                onClick={() => router.back()}
                className="bg-white border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                Back to Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Section - Post Details */}
              <div className="space-y-6">
                {/* Post Copy */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Post Copy</h2>
                  <textarea
                    value={postCopy}
                    onChange={(e) => setPostCopy(e.target.value)}
                    placeholder="What's on your mind? Share your thoughts here..."
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-500">{postCopy.length}/2,200</span>
                  </div>
                </div>

                {/* Hashtags */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Hashtags</h2>
                  <div className="space-y-3">
                    {/* Display existing hashtags */}
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#EEF2FF] text-[#6366F1] border border-[#C7D2FE]"
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
                    
                    {/* Input for new hashtags */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newHashtag}
                        onChange={(e) => setNewHashtag(e.target.value)}
                        onKeyPress={handleHashtagKeyPress}
                        placeholder="Add hashtags (press Enter or comma to add)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Social Channels */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Social Channels</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'facebook', name: 'Facebook', icon: '📘' },
                      { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
                      { id: 'instagram', name: 'Instagram', icon: '📷' },
                      { id: 'tiktok', name: 'TikTok', icon: '🎵' }
                    ].map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => toggleChannel(channel.id)}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                          selectedChannels.includes(channel.id)
                            ? 'border-[#6366F1] bg-[#EEF2FF]'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{channel.icon}</span>
                          <span className="font-medium text-gray-900">{channel.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={handleSaveToDrafts}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Save to Drafts
                  </button>
                  <button
                    onClick={handleApprove}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all font-medium"
                  >
                    Approve
                  </button>
                </div>
              </div>

              {/* Right Section - Media Preview */}
              <div className="space-y-6">
                {/* Media Selection */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Media</h2>
                    <button
                      onClick={() => setIsMediaModalOpen(true)}
                      className="px-4 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:bg-[#4F46E5] transition-colors"
                    >
                      Choose Media
                    </button>
                  </div>
                  
                  {/* Media Preview */}
                  {selectedMedia ? (
                    <div className="relative rounded-lg overflow-hidden">
                      <img
                        src={selectedMedia}
                        alt="Selected media"
                        className="w-full h-64 object-cover"
                      />
                      <button
                        onClick={() => setSelectedMedia('')}
                        className="absolute top-2 right-2 bg-black bg-opacity-75 text-white p-2 rounded-full hover:bg-opacity-90 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No media selected</p>
                      <p className="text-xs text-gray-400">Click &quot;Choose Media&quot; to select an image or video</p>
                    </div>
                  )}
                </div>

                {/* Post Preview */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    {selectedChannels.length > 0 ? (
                      <div className="flex items-center space-x-2 mb-3">
                        {selectedChannels.map((channel) => (
                          <span key={channel} className="text-sm text-gray-600">
                            {channel === 'facebook' && '📘'}
                            {channel === 'linkedin' && '💼'}
                            {channel === 'instagram' && '📷'}
                            {channel === 'tiktok' && '🎵'}
                            {channel.charAt(0).toUpperCase() + channel.slice(1)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 mb-3">No channels selected</div>
                    )}
                    
                    {selectedMedia && (
                      <div className="mb-3">
                        <img
                          src={selectedMedia}
                          alt="Preview"
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-900 mb-2">
                      {postCopy || 'No content yet...'}
                    </div>
                    
                    {hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {hashtags.map((tag, index) => (
                          <span key={index} className="text-sm text-[#6366F1]">{tag}</span>
                        ))}
                      </div>
                    )}
                    
                    {(scheduleDate && scheduleTime) && (
                      <div className="text-xs text-gray-500 mt-2">
                        Scheduled for {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Media Selection Modal */}
        {isMediaModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Choose Media</h2>
                  <button
                    onClick={() => setIsMediaModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Media Item 1 - Gaming Setup */}
                    <div 
                      onClick={() => handleMediaSelect('/assets/placeholders/image1.png')}
                      className="relative group cursor-pointer rounded-lg overflow-hidden"
                    >
                      <img
                        src="/assets/placeholders/image1.png"
                        alt="Gaming setup"
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        IMG
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200"></div>
                    </div>

                    {/* Media Item 2 - Gym */}
                    <div 
                      onClick={() => handleMediaSelect('/assets/placeholders/image2.png')}
                      className="relative group cursor-pointer rounded-lg overflow-hidden"
                    >
                      <img
                        src="/assets/placeholders/image2.png"
                        alt="Gym interior"
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        IMG
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200"></div>
                    </div>

                    {/* Media Item 3 - Controller */}
                    <div 
                      onClick={() => handleMediaSelect('/assets/placeholders/image3.png')}
                      className="relative group cursor-pointer rounded-lg overflow-hidden"
                    >
                      <img
                        src="/assets/placeholders/image3.png"
                        alt="Gaming controller"
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        VIDEO
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200"></div>
                    </div>

                    {/* Media Item 4 - Soccer */}
                    <div 
                      onClick={() => handleMediaSelect('/assets/placeholders/image4.png')}
                      className="relative group cursor-pointer rounded-lg overflow-hidden"
                    >
                      <img
                        src="/assets/placeholders/image4.png"
                        alt="Soccer ball"
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        IMG
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200"></div>
                    </div>

                    {/* Media Item 5 - Retro Setup */}
                    <div 
                      onClick={() => handleMediaSelect('/assets/placeholders/image5.png')}
                      className="relative group cursor-pointer rounded-lg overflow-hidden"
                    >
                      <img
                        src="/assets/placeholders/image5.png"
                        alt="Retro computer setup"
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        VIDEO
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200"></div>
                    </div>

                    {/* Media Item 6 - Event */}
                    <div 
                      onClick={() => handleMediaSelect('/assets/placeholders/image6.png')}
                      className="relative group cursor-pointer rounded-lg overflow-hidden"
                    >
                      <img
                        src="/assets/placeholders/image6.png"
                        alt="Event crowd"
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        IMG
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end p-6 border-t border-gray-200">
                <button
                  onClick={() => setIsMediaModalOpen(false)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
