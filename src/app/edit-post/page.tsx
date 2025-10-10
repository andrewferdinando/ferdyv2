'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Modal from '@/components/ui/Modal';

export default function EditPostPage() {
  const router = useRouter();
  const [postCopy, setPostCopy] = useState("BOOM! 💥 Another high score shattered at Game Over! Our arcade legends are absolutely crushing it today. Think you've got what it takes to join the leaderboard? 🎯");
  const [hashtags, setHashtags] = useState(['#HighScore', '#ArcadeChampion', '#Challenge']);
  const [newHashtag, setNewHashtag] = useState('');
  const [selectedChannels, setSelectedChannels] = useState(['instagram', 'tiktok']);
  const [scheduleDate, setScheduleDate] = useState('2025-08-10');
  const [scheduleTime, setScheduleTime] = useState('08:22');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState('/assets/placeholders/image1.png');

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const handleMediaSelect = (mediaUrl: string) => {
    setSelectedMedia(mediaUrl);
    setIsMediaModalOpen(false);
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Edit Post</h1>
              <p className="text-gray-600 mt-1 text-sm">Make changes to your post.</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Saved Status */}
              <div className="flex items-center space-x-2 text-green-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Saved</span>
              </div>
              
              {/* Action Buttons */}
              <button
                onClick={() => router.back()}
                className="bg-white border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                Back to Post
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
                {/* Media */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Media</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Existing Image */}
                    <div className="relative">
                      <img
                        src={selectedMedia}
                        alt="Selected media"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                        />
                        <svg className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                        />
                        <svg className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                    {/* TikTok */}
                    <div 
                      onClick={() => toggleChannel('tiktok')}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedChannels.includes('tiktok')
                          ? 'border-[#6366F1] bg-[#EEF2FF]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                          </svg>
                        </div>
                        <span className="font-medium text-gray-900">TikTok</span>
                      </div>
                      {selectedChannels.includes('tiktok') && (
                        <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    {/* YouTube */}
                    <div 
                      onClick={() => toggleChannel('youtube')}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedChannels.includes('youtube')
                          ? 'border-[#6366F1] bg-[#EEF2FF]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-[#FF0000] rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        </div>
                        <span className="font-medium text-gray-900">YouTube</span>
                      </div>
                      {selectedChannels.includes('youtube') && (
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

        {/* Action Buttons */}
        <div className="bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-end space-x-4">
              <button className="bg-white border border-gray-300 text-gray-700 text-sm font-medium px-6 py-2 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Save to Drafts</span>
              </button>
              <button className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white text-sm font-semibold px-6 py-2 rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200 flex items-center space-x-2 shadow-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Approve</span>
              </button>
            </div>
          </div>
        </div>

        {/* Select Media Modal */}
        <Modal
          isOpen={isMediaModalOpen}
          onClose={() => setIsMediaModalOpen(false)}
          title="Select Media"
          subtitle="Choose from your media library or upload new files"
          maxWidth="4xl"
        >

              {/* Modal Content */}
              <div className="p-6">
                {/* Your Media Section */}
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
        </Modal>
      </div>
    </AppLayout>
  );
}
