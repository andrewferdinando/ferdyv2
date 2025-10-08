'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';

// Icons
const PlusIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const ClockIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

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

// Social media platform icons
const FacebookIcon = () => (
  <div className="w-6 h-6 bg-[#1877F2] rounded flex items-center justify-center">
    <span className="text-white text-xs font-bold">f</span>
  </div>
);

const LinkedInIcon = () => (
  <div className="w-6 h-6 bg-[#0A66C2] rounded flex items-center justify-center">
    <span className="text-white text-xs font-bold">in</span>
  </div>
);

const InstagramIcon = () => (
  <div className="w-6 h-6 bg-[#E4405F] rounded flex items-center justify-center">
    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  </div>
);

const platformIcons = {
  facebook: FacebookIcon,
  linkedin: LinkedInIcon,
  instagram: InstagramIcon,
};

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState('scheduled');

  const tabs = [
    { id: 'drafts', label: 'Drafts', count: 0 },
    { id: 'scheduled', label: 'Scheduled', count: 4 },
    { id: 'published', label: 'Published', count: 0 },
  ];

  const scheduledPosts = [
    {
      id: 1,
      copy: "BOOM! Another high score shattered at Game Over! 🎮 Who's ready to challenge the leaderboard? #HighScore #ArcadeChampion",
      hashtags: ['#HighScore', '#ArcadeChampion'],
      scheduledTime: 'Oct 8 • 5:02 PM',
      platforms: ['facebook', 'linkedin', 'instagram'],
      status: 'Scheduled'
    },
    {
      id: 2,
      copy: "Just had the most incredible team building session! Nothing brings people together like a little friendly competition. 🏆",
      hashtags: ['#TeamBuilding', '#CorporateEvents'],
      scheduledTime: 'Oct 9 • 2:30 PM',
      platforms: ['facebook', 'linkedin'],
      status: 'Scheduled'
    },
    {
      id: 3,
      copy: "The energy in here is absolutely electric! 🎯 From first-timers to pros, everyone's having a blast. Come join the fun!",
      hashtags: ['#Fun', '#Entertainment'],
      scheduledTime: 'Oct 10 • 7:15 PM',
      platforms: ['facebook', 'instagram'],
      status: 'Scheduled'
    },
    {
      id: 4,
      copy: "Birthday celebrations at Game Over are next level! 🎂🎉 Nothing beats the joy on everyone's faces when they hit that jackpot!",
      hashtags: ['#BirthdayParty', '#Celebration'],
      scheduledTime: 'Oct 11 • 6:45 PM',
      platforms: ['facebook', 'linkedin', 'instagram'],
      status: 'Scheduled'
    }
  ];

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-10 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[32px] font-bold text-gray-950 leading-[1.2]">Schedule</h1>
            <p className="text-gray-600 mt-1 text-sm">Manage your social media posts</p>
          </div>
          <button className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#4F46E5] hover:to-[#4338CA] text-white px-6 py-3 rounded-lg flex items-center space-x-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm">
            <PlusIcon className="w-4 h-4" />
            <span>New Post</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-8 mt-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 border-b-2 font-medium transition-all duration-200 text-sm ${
                activeTab === tab.id
                  ? 'border-[#6366F1] text-[#6366F1]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label} {tab.count}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-10">
        {activeTab === 'scheduled' && (
          <div className="space-y-4">
            {scheduledPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-start space-x-4">
                  {/* Post Image */}
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">IMG</span>
                  </div>

                  {/* Post Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 text-sm mb-3 line-clamp-2 leading-relaxed">{post.copy}</p>
                    
                    {/* Hashtags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.hashtags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-semibold">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Post Details */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-4 h-4" />
                          <span>{post.scheduledTime}</span>
                        </div>
                        
                        {/* Platform Icons */}
                        <div className="flex items-center space-x-1">
                          {post.platforms.map((platform) => {
                            const IconComponent = platformIcons[platform as keyof typeof platformIcons];
                            return <IconComponent key={platform} />;
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 bg-[#EEF2FF] text-[#6366F1] text-xs font-semibold rounded-md">
                          {post.status}
                        </span>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all duration-200 text-gray-400 hover:text-gray-600">
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all duration-200 text-gray-400 hover:text-red-600">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'drafts' && (
          <div className="text-center py-12">
            <p className="text-gray-500">No drafts yet</p>
          </div>
        )}

        {activeTab === 'published' && (
          <div className="text-center py-12">
            <p className="text-gray-500">No published posts yet</p>
          </div>
        )}
      </div>
    </div>
    </AppLayout>
  );
}
