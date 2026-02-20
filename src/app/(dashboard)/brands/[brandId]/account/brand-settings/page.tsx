'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { supabase } from '@/lib/supabase-browser'

interface Brand {
  id: string
  name: string
  created_at: string
}

export default function BrandSettingsPage() {
  const params = useParams()
  const brandId = params.brandId as string

  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBrands = useCallback(async () => {
    try {
      // Resolve group from the current brand
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('group_id')
        .eq('id', brandId)
        .single()

      if (brandError || !brandData) {
        setError('Brand not found')
        setLoading(false)
        return
      }

      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('id, name, created_at')
        .eq('group_id', brandData.group_id)
        .eq('status', 'active')
        .order('name')

      if (brandsError) throw brandsError

      setBrands(brandsData || [])
      setLoading(false)
    } catch (err: any) {
      console.error('Error loading brands:', err)
      setError(err.message)
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    loadBrands()
  }, [loadBrands])

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-10">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Brand Settings</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage settings for all your brands.
                </p>
              </div>

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1]"></div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Brands</h2>

                    {brands.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500 mb-4">No brands found.</p>
                        <Link
                          href={`/brands/${brandId}/account/add-brand`}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#6366F1] hover:bg-[#4F46E5]"
                        >
                          Add Your First Brand
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {brands.map((brand) => (
                          <div
                            key={brand.id}
                            className="flex items-center justify-between py-4 px-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
                          >
                            <div className="flex-1">
                              <h3 className="text-sm font-medium text-gray-900">{brand.name}</h3>
                              <p className="text-xs text-gray-400 mt-1">
                                Created {new Date(brand.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Link
                              href={`/brands/${brand.id}/account/brand`}
                              className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Edit Settings
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        {brands.length} {brands.length === 1 ? 'brand' : 'brands'} in your account
                      </p>
                      <Link
                        href={`/brands/${brandId}/account/add-brand`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#6366F1] hover:bg-[#4F46E5]"
                      >
                        Add Brand
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}
