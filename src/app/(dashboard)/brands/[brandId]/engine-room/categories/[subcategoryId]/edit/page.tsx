'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'

export default function EditCategoryPage() {
  const params = useParams()
  const subcategoryId = params.subcategoryId as string

  return (
    <RequireAuth>
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">
              Edit Category (ID: {subcategoryId})
            </h1>
            <p className="text-gray-600">
              This page is a placeholder. The full edit wizard will be implemented in the next step.
            </p>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}

