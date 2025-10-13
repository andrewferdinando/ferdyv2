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
  const [activeTab, setActiveTab] = useState('programmed');

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

  // Programmed Schedule data based on Categories
  const programmedSchedule = [
    {
      id: 'prog-1',
      subCategory: 'Happy Hour Special',
      frequency: 'Weekly, Friday, 3:00 PM',
      hashtags: ['#happyhour', '#drinks', '#friday'],
      platforms: ['Facebook', 'Instagram'],
      nextPost: 'Jan 19 • 3:00 PM'
    },
    {
      id: 'prog-2',
      subCategory: 'Go Karting',
      frequency: 'Weekly, Mon & Wed, 2:00 PM',
      hashtags: ['#gokarting', '#racing', '#fun'],
      platforms: ['Facebook', 'LinkedIn', 'Instagram'],
      nextPost: 'Jan 15 • 2:00 PM'
    },
    {
      id: 'prog-3',
      subCategory: 'Arcade Games',
      frequency: 'Daily, 6:00 PM',
      hashtags: ['#arcade', '#gaming', '#highscore'],
      platforms: ['Facebook', 'Instagram'],
      nextPost: 'Jan 15 • 6:00 PM'
    },
    {
      id: 'prog-4',
      subCategory: 'VR Experiences',
      frequency: 'Weekly, Sat & Sun, 1:00 PM',
      hashtags: ['#vr', '#virtualreality', '#experience'],
      platforms: ['Facebook', 'LinkedIn'],
      nextPost: 'Jan 13 • 1:00 PM'
    },
    {
      id: 'prog-5',
      subCategory: 'Tournament Updates',
      frequency: 'Monthly, 1st Monday, 10:00 AM',
      hashtags: ['#tournament', '#competition', '#gaming'],
      platforms: ['Facebook', 'LinkedIn', 'Instagram'],
      nextPost: 'Feb 5 • 10:00 AM'
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

  const handlePushPosts = () => {
    if (selectedPosts.length === 0) {
      alert('Please select posts to push');
      return;
    }
    // Logic to push posts immediately
    console.log('Pushing posts:', selectedPosts);
    setSelectedPosts([]);
    alert(`Pushing ${selectedPosts.length} post(s) immediately`);
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
              <p className="text-gray-600 mt-1 text-sm">View and manage your social media posting schedule</p>
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

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10">
          <div className="flex flex-wrap gap-4 sm:gap-8">
            <button
              onClick={() => setActiveTab('programmed')}
              className={`pb-3 border-b-2 font-medium transition-all duration-200 text-sm ${
                activeTab === 'programmed'
                  ? 'border-[#6366F1] text-[#6366F1]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Programmed Schedule (5)
            </button>
            <button
              onClick={() => setActiveTab('next-month')}
              className={`pb-3 border-b-2 font-medium transition-all duration-200 text-sm ${
                activeTab === 'next-month'
                  ? 'border-[#6366F1] text-[#6366F1]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Next Month (5)
            </button>
          </div>
        </div>


        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'programmed' && (
              <div className="space-y-4">
                {programmedSchedule.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* Sub-category and frequency */}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.subCategory}</h3>
                        <p className="text-sm text-gray-600 mb-2">{item.frequency}</p>
                        
                        {/* Hashtags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.hashtags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-semibold">
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Next post time */}
                        <div className="flex items-center text-xs text-gray-500">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Next: {item.nextPost}</span>
                        </div>
                      </div>

                      {/* Platform Icons */}
                      <div className="flex items-center space-x-2">
                        {item.platforms.map((platform, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'next-month' && (
              <div className="space-y-4">
                {scheduledPosts.map((post) => (
                  <div 
                    key={post.id}
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex-1">
                      <div className="mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{post.title}</h3>
                          <div className="flex items-center space-x-3 text-sm text-gray-500">
                            <span className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{formatDate(post.date)}</span>
                            </span>
                            <span className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{post.time}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-4">{post.content}</p>

                      <div className="flex items-start justify-between">
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Platforms:</span>
                            <div className="flex items-center space-x-2">
                              {post.platforms.map((platform, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {platform}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Hashtags:</span>
                            <div className="flex items-center space-x-2">
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

                        {/* Sub-category and frequency instead of action buttons */}
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(post.category)}`}>
                            {post.category}
                          </span>
                          <div className="text-right">
                            <p className="text-xs font-medium text-gray-700">Go Karting</p>
                            <p className="text-xs text-gray-500">weekly on Mon & Weds</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State for Next Month */}
            {activeTab === 'next-month' && scheduledPosts.length === 0 && (
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
