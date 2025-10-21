'use client';

import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

export default function SettingsPage() {
  const router = useRouter();

  const handleContentLibraryClick = () => {
    router.push('/content-library');
  };

  const handleIntegrationsClick = () => {
    router.push('/integrations');
  };

  const handleCategoriesClick = () => {
    router.push('/categories');
  };

  const handleContentPreferencesClick = () => {
    router.push('/content-preferences');
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Post Settings</h1>
              <p className="text-gray-600 mt-1 text-sm">Configure your workspace and integrations</p>
            </div>

            {/* Settings Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {/* Content Preferences Card */}
          <div 
            onClick={handleContentPreferencesClick}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-[#EEF2FF] rounded-lg flex items-center justify-center text-[#6366F1] group-hover:bg-[#6366F1] group-hover:text-white transition-colors duration-200">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#6366F1] transition-colors duration-200">
                  Content Preferences
                </h3>
                <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                  Configure default image formats and content settings.
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

            </div>
          </div>
        </div>
      </AppLayout>
  );
}
