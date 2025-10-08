'use client';

import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

export default function SettingsPage() {
  const router = useRouter();

  const handleContentLibraryClick = () => {
    router.push('/content-library');
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Settings</h1>
          <p className="text-gray-600 mt-1 text-sm">Configure your workspace and integrations</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 lg:p-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Content Library Card */}
          <div 
            onClick={handleContentLibraryClick}
            className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-[#EEF2FF] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-3 text-base">Content Library</h3>
                <p className="text-gray-600 text-sm mb-4 leading-[1.5]">
                  Manage your media assets, templates, and reusable content pieces.
                </p>
                <span className="text-[#6366F1] font-medium text-sm flex items-center transition-colors duration-200">
                  Open →
                </span>
              </div>
            </div>
          </div>

          {/* Categories & Post Framework Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-[#EEF2FF] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-3 text-base">Categories & Post Framework</h3>
                <p className="text-gray-600 text-sm mb-4 leading-[1.5]">
                  Define content categories and post structure templates.
                </p>
                <button className="text-[#6366F1] hover:text-[#4F46E5] font-medium text-sm flex items-center transition-colors duration-200">
                  Open →
                </button>
              </div>
            </div>
          </div>

          {/* Integrations Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-[#EEF2FF] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-3 text-base">Integrations</h3>
                <p className="text-gray-600 text-sm mb-4 leading-[1.5]">
                  Connect social media accounts and third-party services.
                </p>
                <button className="text-[#6366F1] hover:text-[#4F46E5] font-medium text-sm flex items-center transition-colors duration-200">
                  Open →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
