'use client';

import { useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase-browser';

interface Brand {
  id: string;
  name: string;
  group_id: string;
  group_name: string;
  is_member: boolean;
}

export default function QuickJoinPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const searchBrands = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/super-admin/quick-join?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to search brands');

      const data = await res.json();
      setBrands(data.brands ?? []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const joinBrand = useCallback(async (brandId: string) => {
    setJoiningId(brandId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const res = await fetch('/api/super-admin/quick-join', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId }),
      });

      if (!res.ok) throw new Error('Failed to join brand');

      // Update local state to show "Joined"
      setBrands((prev) =>
        prev.map((b) => (b.id === brandId ? { ...b, is_member: true } : b)),
      );
    } catch (err) {
      console.error('Join failed:', err);
    } finally {
      setJoiningId(null);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') searchBrands();
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">
              Quick Join
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Search and join any brand to access their account
            </p>
          </div>

          {/* Search Box */}
          <div className="max-w-md flex gap-2">
            <div className="relative flex-1">
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
                onKeyDown={handleKeyDown}
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
            <button
              onClick={searchBrands}
              disabled={loading}
              className="px-4 py-2 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#5558E6] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center space-y-3">
                  <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
                  <p className="text-sm text-gray-600">Searching brands...</p>
                </div>
              </div>
            ) : !searched ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Search for brands</h2>
                <p className="text-sm text-gray-600">
                  Enter a brand name and click Search, or search with an empty query to see all brands.
                </p>
              </div>
            ) : brands.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No brands found</h2>
                <p className="text-sm text-gray-600">
                  {searchQuery
                    ? `No brands found matching "${searchQuery}"`
                    : 'There are no brands in the system.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900">{brand.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{brand.group_name}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {brand.is_member ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Joined
                        </span>
                      ) : (
                        <button
                          onClick={() => joinBrand(brand.id)}
                          disabled={joiningId === brand.id}
                          className="inline-flex items-center px-4 py-1.5 rounded-lg text-sm font-medium bg-[#6366F1] text-white hover:bg-[#5558E6] disabled:opacity-50 transition-colors"
                        >
                          {joiningId === brand.id ? (
                            <>
                              <div className="h-4 w-4 mr-1.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Joining...
                            </>
                          ) : (
                            'Join'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
