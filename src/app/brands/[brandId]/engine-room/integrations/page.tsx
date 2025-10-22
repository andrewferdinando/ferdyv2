'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import Breadcrumb from '@/components/navigation/Breadcrumb';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';

// Icons
const LinkIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const UnlinkIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
  </svg>
);

// Social Media Platform Icons
const FacebookIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.418-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.928.875 1.418 2.026 1.418 3.323s-.49 2.448-1.418 3.244c-.875.807-2.026 1.297-3.323 1.297zm7.83-9.897h-1.598v1.598h1.598V7.091zm-3.197 8.449c0 1.297-.49 2.448-1.297 3.323-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323z"/>
  </svg>
);

const TwitterIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const LinkedInIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const TikTokIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

interface SocialProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const socialProviders: SocialProvider[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    description: 'Connect your Facebook page to publish posts'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    description: 'Connect your Instagram business account'
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: 'twitter',
    color: '#000000',
    description: 'Connect your Twitter/X account'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2',
    description: 'Connect your LinkedIn company page'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'tiktok',
    color: '#000000',
    description: 'Connect your TikTok business account'
  }
];

// Function to render the appropriate icon
const renderSocialIcon = (iconName: string, className: string = "w-6 h-6") => {
  switch (iconName) {
    case 'facebook':
      return <FacebookIcon className={className} />;
    case 'instagram':
      return <InstagramIcon className={className} />;
    case 'twitter':
      return <TwitterIcon className={className} />;
    case 'linkedin':
      return <LinkedInIcon className={className} />;
    case 'tiktok':
      return <TikTokIcon className={className} />;
    default:
      return null;
  }
};

export default function IntegrationsPage() {
  const params = useParams();
  const brandId = params.brandId as string;
  const { accounts, loading, disconnectAccount } = useSocialAccounts(brandId);

  const handleConnect = (providerId: string) => {
    // This would typically redirect to OAuth flow
    console.log(`Connecting to ${providerId}...`);
    alert(`Connecting to ${providerId} - OAuth flow would be implemented here`);
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      await disconnectAccount(accountId);
    } catch (error) {
      console.error('Failed to disconnect account:', error);
      alert('Failed to disconnect account. Please try again.');
    }
  };

  if (loading) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="p-4 sm:p-6 lg:p-10">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">Loading integrations...</div>
                </div>
              </div>
            </div>
          </div>
        </AppLayout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-10">
            <div className="max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="mb-4">
            <Breadcrumb />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600 mt-1">Connect your social media accounts to start publishing</p>
        </div>

        {/* Connected Accounts Summary */}
        {accounts.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Connected Accounts</h3>
            <div className="flex flex-wrap gap-2">
              {accounts.map((account) => (
                <span key={account.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {account.provider} - {account.handle}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Social Media Providers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {socialProviders.map((provider) => {
            const isConnected = accounts.some(account => account.provider.toLowerCase() === provider.id);
            
            return (
              <div key={provider.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: provider.color }}
                    >
                      {renderSocialIcon(provider.icon, "w-6 h-6")}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                      <p className="text-sm text-gray-500">{provider.description}</p>
                    </div>
                  </div>
                </div>

                {isConnected ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Connected
                      </span>
                      <button
                        onClick={() => {
                          const account = accounts.find(acc => acc.provider.toLowerCase() === provider.id);
                          if (account) handleDisconnect(account.id);
                        }}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6366F1] transition-colors"
                      >
                        <UnlinkIcon className="w-4 h-4 mr-1" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(provider.id)}
                    className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#4F46E5] hover:to-[#4338CA] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6366F1] transition-all"
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Requirements Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Facebook & Instagram</h4>
              <p><strong>Facebook:</strong> Requires a Facebook Page and appropriate permissions</p>
              <p><strong>Instagram:</strong> Requires Instagram Business Account connected to Facebook Page</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Other Platforms</h4>
              <p><strong>Twitter/X:</strong> Requires API access and developer account</p>
              <p><strong>LinkedIn:</strong> Requires LinkedIn Company Page admin access</p>
              <p><strong>TikTok:</strong> Requires TikTok Business Account</p>
            </div>
          </div>
        </div>
      </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
