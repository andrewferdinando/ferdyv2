'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

export default function EngineRoomPage() {
  const router = useRouter();

  // No redirect needed - this page handles the case when no brand is selected

  const handleContentLibraryClick = () => {
    router.push('/content-library');
  };

  const handleIntegrationsClick = () => {
    router.push('/integrations');
  };

  const handleCategoriesClick = () => {
    router.push('/categories');
  };

  const handleAccountClick = () => {
    router.push('/account');
  };


  return (
    <AppLayout>
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Engine Room</h1>
              <p className="text-gray-600 mt-1 text-sm">Configure your workspace and integrations</p>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Note:</strong> Select a brand from the dropdown above to access brand-specific settings and features.
                </p>
              </div>
            </div>

            {/* Settings Cards - 4 Cards Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Content Library Card */}
              <div 
                onClick={handleContentLibraryClick}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-[#EEF2FF] rounded-lg flex items-center justify-center text-[#6366F1] group-hover:bg-[#6366F1] group-hover:text-white transition-colors duration-200">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#6366F1] transition-colors duration-200">
                      Content Library
                    </h3>
                    <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                      Manage your media assets, templates, and reusable content pieces.
                    </p>
                  </div>
                </div>
              </div>


              {/* Categories & Post Framework Card */}
              <div 
                onClick={handleCategoriesClick}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-[#EEF2FF] rounded-lg flex items-center justify-center text-[#6366F1] group-hover:bg-[#6366F1] group-hover:text-white transition-colors duration-200">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#6366F1] transition-colors duration-200">
                      Categories & Post Frequency
                    </h3>
                    <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                      Define content categories and post structure templates.
                    </p>
                  </div>
                </div>
              </div>

              {/* Integrations Card */}
              <div 
                onClick={handleIntegrationsClick}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-[#EEF2FF] rounded-lg flex items-center justify-center text-[#6366F1] group-hover:bg-[#6366F1] group-hover:text-white transition-colors duration-200">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#6366F1] transition-colors duration-200">
                      Integrations
                    </h3>
                    <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                      Connect social media accounts and third-party services.
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Card */}
              <div 
                onClick={handleAccountClick}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-[#EEF2FF] rounded-lg flex items-center justify-center text-[#6366F1] group-hover:bg-[#6366F1] group-hover:text-white transition-colors duration-200">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#6366F1] transition-colors duration-200">
                      Account
                    </h3>
                    <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                      Manage your profile, team, and billing settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}