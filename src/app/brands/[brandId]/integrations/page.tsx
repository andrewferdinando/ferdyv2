'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
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
    // TODO: Implement OAuth flow
    const state = encodeURIComponent(JSON.stringify({
      brand_id: brandId,
      user_id: 'current_user_id' // This should come from auth context
    }));

    const redirectUri = `${window.location.origin}/api/oauth/${providerId}`;
    const authUrl = `https://example.com/oauth/${providerId}?state=${state}&redirect_uri=${redirectUri}`;
    
    window.location.href = authUrl;
  };

  const handleDisconnect = async (accountId: string) => {
    if (confirm('Are you sure you want to disconnect this account?')) {
      try {
        await disconnectAccount(accountId);
      } catch (error) {
        console.error('Failed to disconnect account:', error);
        alert('Failed to disconnect account. Please try again.');
      }
    }
  };

  const getAccountForProvider = (providerId: string) => {
    return accounts.find(account => account.provider === providerId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      case 'revoked': return 'bg-red-100 text-red-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
          </div>
        </AppLayout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
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

        {/* Social Providers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {socialProviders.map((provider) => {
            const account = getAccountForProvider(provider.id);
            const isConnected = account && account.status === 'connected';

            return (
              <div key={provider.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${provider.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                      {provider.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                      <p className="text-sm text-gray-600">{provider.description}</p>
                    </div>
                  </div>
                  
                  {isConnected && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(account.status)}`}>
                      {account.status}
                    </span>
                  )}
                </div>

                {isConnected ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <p><strong>Handle:</strong> @{account.handle}</p>
                      <p><strong>Connected by:</strong> {account.connected_by.full_name}</p>
                      <p><strong>Last refreshed:</strong> {new Date(account.last_refreshed_at).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <UnlinkIcon className="w-4 h-4 mr-1" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-500">
                      <p>Not connected</p>
                    </div>
                    
                    <button
                      onClick={() => handleConnect(provider.id)}
                      className="flex items-center w-full justify-center px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all font-medium"
                    >
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Connect {provider.name}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-gray-600 text-sm mb-4">
            Connecting your social media accounts allows Ferdy to publish posts on your behalf. 
            Each platform has specific requirements and permissions.
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Facebook:</strong> Requires a Facebook Page and appropriate permissions</p>
            <p><strong>Instagram:</strong> Requires Instagram Business Account connected to Facebook Page</p>
            <p><strong>Twitter/X:</strong> Requires API access and developer account</p>
            <p><strong>LinkedIn:</strong> Requires LinkedIn Company Page admin access</p>
            <p><strong>TikTok:</strong> Requires TikTok Business Account</p>
          </div>
        </div>
      </div>
      </AppLayout>
    </RequireAuth>
  );
}
