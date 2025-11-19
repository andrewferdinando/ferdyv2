'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { useBrands } from '@/hooks/useBrands';
import Link from 'next/link';
import Breadcrumb from '@/components/navigation/Breadcrumb';

export default function BrandDetailsListPage() {
  const router = useRouter();
  const { brands, loading } = useBrands();

  // Auto-redirect to first brand if only one brand exists
  useEffect(() => {
    if (!loading && brands.length === 1) {
      router.replace(`/super-admin/brands/${brands[0].id}/details`);
    }
  }, [brands, loading, router]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center space-y-3">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
              <p className="text-sm text-gray-600">Loading brands…</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <Breadcrumb className="mb-4" />
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">
              Brand Details
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              View and manage brand information and AI summaries
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="max-w-4xl mx-auto">
            {brands.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No brands found</h2>
                <p className="text-sm text-gray-600">
                  There are no brands available to view.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {brands.map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/super-admin/brands/${brand.id}/details`}
                    className="block bg-white rounded-xl border border-gray-200 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{brand.name}</h3>
                        {brand.website_url && (
                          <p className="text-sm text-gray-600 mb-2">
                            <a
                              href={brand.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#6366F1] hover:underline break-all"
                            >
                              {brand.website_url}
                            </a>
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {brand.ai_summary ? (
                            <span className="inline-flex items-center">
                              <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              AI Summary Available
                            </span>
                          ) : brand.website_url ? (
                            <span className="inline-flex items-center text-amber-600">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Summary Not Generated
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-gray-400">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              No Website URL
                            </span>
                          )}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
