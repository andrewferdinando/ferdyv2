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
    icon: '📘',
    color: 'bg-blue-600',
    description: 'Connect your Facebook page to publish posts'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📷',
    color: 'bg-pink-600',
    description: 'Connect your Instagram business account'
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: '🐦',
    color: 'bg-black',
    description: 'Connect your Twitter/X account'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: 'bg-blue-700',
    description: 'Connect your LinkedIn company page'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-black',
    description: 'Connect your TikTok business account'
  }
];

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
              <div key={provider.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center text-white text-lg`}>
                      {provider.icon}
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
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <UnlinkIcon className="w-4 h-4 mr-1" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(provider.id)}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
