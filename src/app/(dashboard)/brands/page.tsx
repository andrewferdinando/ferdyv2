'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { useBrands } from '@/hooks/useBrands'

export default function BrandsPage() {
  const router = useRouter()
  const { brands, loading, error } = useBrands()
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)

  useEffect(() => {
    if (brands.length === 1) {
      // If only one brand, redirect directly to it
      router.push(`/brands/${brands[0].id}/schedule`)
    }
  }, [brands, router])

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId)
    router.push(`/brands/${brandId}/schedule`)
  }

  if (loading) {
    return (
      <AppLayout>
        <RequireAuth>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading brands...</p>
            </div>
          </div>
        </RequireAuth>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <RequireAuth>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Brands</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </RequireAuth>
      </AppLayout>
    )
  }

  if (brands.length === 0) {
    return (
      <AppLayout>
        <RequireAuth>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Brands Found</h3>
              <p className="text-gray-600">You don&apos;t have access to any brands yet.</p>
            </div>
          </div>
        </RequireAuth>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <RequireAuth>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Select a Brand</h1>
              <p className="text-gray-600">Choose which brand you&apos;d like to manage.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => handleBrandSelect(brand.id)}
                  disabled={selectedBrandId === brand.id}
                  className={`p-6 bg-white border-2 rounded-xl text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                    selectedBrandId === brand.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{brand.name}</h3>
                      <p className="text-sm text-gray-500">{brand.timezone}</p>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>Created: {new Date(brand.created_at).toLocaleDateString()}</p>
                  </div>

                  {selectedBrandId === brand.id && (
                    <div className="mt-4 flex items-center text-indigo-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                      <span className="text-sm font-medium">Loading...</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </RequireAuth>
    </AppLayout>
  )
}
