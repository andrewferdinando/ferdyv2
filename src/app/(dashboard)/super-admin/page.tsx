'use client';

import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

export default function SuperAdminPage() {
  const router = useRouter();

  const handleBrandDetailsClick = () => {
    router.push('/super-admin/brand-details');
  };


  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Super Admin</h1>
              <p className="text-gray-600 mt-1 text-sm">Manage brand details and configurations</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
            {/* Brand Details Card */}
            <div 
              onClick={handleBrandDetailsClick}
              className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-[#EEF2FF] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-7 h-7 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Brand Details</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Manage business information, products, services, and company history.
                  </p>
                  <div className="flex items-center text-[#6366F1] text-sm font-medium">
                    <span>Manage Details</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
