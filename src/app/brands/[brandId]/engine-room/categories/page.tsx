'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import Breadcrumb from '@/components/navigation/Breadcrumb'

export default function CategoriesPage() {
  const params = useParams()
  const brandId = params.brandId as string

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="mb-4">
                  <Breadcrumb />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
                <p className="text-gray-600 mt-1">Manage your content categories</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 lg:p-10">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Categories</h2>
                <p className="text-gray-600">This page is under construction.</p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}
