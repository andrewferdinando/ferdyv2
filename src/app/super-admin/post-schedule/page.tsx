'use client';

import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { useState } from 'react';

interface ScheduledPost {
  id: string;
  date: string;
  time: string;
  category: string;
  title: string;
  content: string;
  platforms: string[];
  status: 'scheduled' | 'draft' | 'published';
  hashtags: string[];
}

export default function PostSchedulePage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  // Sample data - in a real app, this would come from your categories and frequency settings
  const scheduledPosts: ScheduledPost[] = [
    {
      id: '1',
      date: '2024-01-15',
      time: '09:00',
      category: 'Deals',
      title: 'Monday Morning Special',
      content: 'Start your week with 20% off all arcade games! Valid until 2 PM.',
      platforms: ['Facebook', 'Instagram'],
      status: 'scheduled',
      hashtags: ['#MondayMotivation', '#ArcadeGames', '#SpecialOffer']
    },
    {
      id: '2',
      date: '2024-01-16',
      time: '14:00',
      category: 'Offerings',
      title: 'New VR Experience',
      content: 'Check out our latest VR racing game! Book your session now.',
      platforms: ['Instagram', 'TikTok'],
      status: 'scheduled',
      hashtags: ['#VRGaming', '#Racing', '#NewGame']
    },
    {
      id: '3',
      date: '2024-01-17',
      time: '18:00',
      category: 'Seasonal Events',
      title: 'Tournament Thursday',
      content: 'Join our weekly gaming tournament! Prizes for top players.',
      platforms: ['Facebook', 'Instagram', 'Twitter'],
      status: 'scheduled',
      hashtags: ['#Tournament', '#Gaming', '#Competition']
    },
    {
      id: '4',
      date: '2024-01-18',
      time: '12:00',
      category: 'Deals',
      title: 'Flash Friday Sale',
      content: 'Limited time: 50% off all merchandise! While supplies last.',
      platforms: ['Facebook', 'Instagram'],
      status: 'scheduled',
      hashtags: ['#FlashSale', '#Merchandise', '#LimitedTime']
    },
    {
      id: '5',
      date: '2024-01-19',
      time: '16:00',
      category: 'Offerings',
      title: 'Weekend Warriors',
      content: 'Perfect weather for arcade gaming! Bring the whole family.',
      platforms: ['Instagram', 'Facebook'],
      status: 'scheduled',
      hashtags: ['#Weekend', '#FamilyFun', '#ArcadeGames']
    }
  ];

  const handleSelectPost = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const handleSelectAll = () => {
    setSelectedPosts(scheduledPosts.map(post => post.id));
  };

  const handleDeselectAll = () => {
    setSelectedPosts([]);
  };

  const handlePushToDrafts = () => {
    if (selectedPosts.length === 0) return;
    
    // In a real implementation, this would push selected posts to drafts
    console.log('Pushing posts to drafts:', selectedPosts);
    
    // Show success message
    alert(`Successfully moved ${selectedPosts.length} post(s) to drafts!`);
    
    // Clear selection
    setSelectedPosts([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'published':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Deals':
        return 'bg-red-100 text-red-800';
      case 'Offerings':
        return 'bg-blue-100 text-blue-800';
      case 'Seasonal Events':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Post Schedule</h1>
              <p className="text-gray-600 mt-1 text-sm">Manage your upcoming posts and push them to drafts</p>
            </div>
            <button 
              onClick={() => router.back()}
              className="bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 px-4 py-2 w-full sm:w-auto flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Super Admin</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="max-w-6xl mx-auto">
            {/* Controls */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">January 2024 Schedule</h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-[#6366F1] hover:text-[#4F46E5] font-medium"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              {selectedPosts.length > 0 && (
                <div className="bg-[#EEF2FF] border border-[#6366F1] rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-[#6366F1] font-medium">
                        {selectedPosts.length} post{selectedPosts.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <button
                      onClick={handlePushToDrafts}
                      className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white text-sm font-medium px-4 py-2 rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200"
                    >
                      Push to Drafts
                    </button>
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-600">
                Posts are automatically scheduled based on your Categories & Post Frequency settings. 
                You can push posts to drafts to review and edit them before they go live.
              </div>
            </div>

            {/* Posts List */}
            <div className="space-y-4">
              {scheduledPosts.map((post) => (
                <div 
                  key={post.id}
                  className={`bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-all duration-200 ${
                    selectedPosts.includes(post.id) ? 'ring-2 ring-[#6366F1] ring-opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedPosts.includes(post.id)}
                      onChange={() => handleSelectPost(post.id)}
                      className="mt-1 w-4 h-4 text-[#6366F1] border-gray-300 rounded focus:ring-[#6366F1]"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{post.title}</h3>
                          <div className="flex items-center space-x-3 text-sm text-gray-500">
                            <span className="flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{formatDate(post.date)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{post.time}</span>
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(post.category)}`}>
                            {post.category}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(post.status)}`}>
                            {post.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-4">{post.content}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Platforms:</span>
                            <div className="flex items-center space-x-1">
                              {post.platforms.map((platform, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {platform}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Hashtags:</span>
                            <div className="flex items-center space-x-1">
                              {post.hashtags.slice(0, 3).map((hashtag, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                  {hashtag}
                                </span>
                              ))}
                              {post.hashtags.length > 3 && (
                                <span className="text-xs text-gray-500">+{post.hashtags.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button className="text-[#6366F1] hover:text-[#4F46E5] text-sm font-medium">
                            Preview
                          </button>
                          <button className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {scheduledPosts.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Posts</h3>
                <p className="text-gray-600 mb-4">
                  No posts are scheduled for this month. Configure your categories and posting frequency to generate scheduled posts.
                </p>
                <button className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white text-sm font-medium px-4 py-2 rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200">
                  Configure Categories
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
