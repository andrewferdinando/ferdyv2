'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { useBrands } from '@/hooks/useBrands';
import Link from 'next/link';
export default function BrandDetailsListPage() {
  const router = useRouter();
  const { brands, loading } = useBrands();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter brands based on search query
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) {
      return brands;
    }
    const query = searchQuery.toLowerCase().trim();
    return brands.filter((brand) =>
      brand.name.toLowerCase().includes(query)
    );
  }, [brands, searchQuery]);

  // Auto-redirect to first brand if only one brand exists (only when not searching)
  useEffect(() => {
    if (!loading && brands.length === 1 && !searchQuery.trim()) {
      router.replace(`/super-admin/brands/${brands[0].id}/details`);
    }
  }, [brands, loading, router, searchQuery]);

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
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">
              Brand Details
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              View and manage brand information and AI summaries
            </p>
          </div>

          {/* Search Box */}
          <div className="max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search brands by name..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] sm:text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
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
            ) : filteredBrands.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No brands match your search</h2>
                <p className="text-sm text-gray-600 mb-4">
                  No brands found matching &quot;{searchQuery}&quot;
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm text-[#6366F1] hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBrands.map((brand) => (
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
