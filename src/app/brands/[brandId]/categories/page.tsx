'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import Link from 'next/link'
import Breadcrumb from '@/components/navigation/Breadcrumb'
import { useCategories } from '@/hooks/useCategories'
import { useUserRole } from '@/hooks/useUserRole'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

// Icons
const ArrowLeftIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const PlusIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default function CategoriesPage() {
  const params = useParams()
  const brandId = params.brandId as string
  const [activeTab, setActiveTab] = useState('categories')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  const { categories, loading, createCategory } = useCategories(brandId)
  const { isAdmin, loading: roleLoading } = useUserRole(brandId)

  const tabs = [
    { id: 'categories', name: 'Categories' },
    { id: 'nextMonth', name: `Next Month (${categories?.length || 0})` },
  ]

  const deals = [
    {
      id: 1,
      name: 'Happy Hour Special',
      frequency: 'Weekly, Friday, 3:00 PM'
    }
  ]

  const offerings = [
    {
      id: 1,
      name: 'Go Karting',
      frequency: 'Weekly, Monday, Wednesday, 2:00 PM'
    },
    {
      id: 2,
      name: 'Arcade Games',
      frequency: 'Daily, 10:00 AM'
    }
  ]

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return
    setIsCreatingCategory(true)
    try {
      await createCategory(categoryName.trim(), brandId)
      setCategoryName('')
      setIsCategoryModalOpen(false)
    } finally {
      setIsCreatingCategory(false)
    }
  }

  if (loading || roleLoading) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
          </div>
        </AppLayout>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-4">
                  <Breadcrumb />
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Categories & Post Frequency</h1>
                <p className="text-gray-600 mt-1 text-sm">Organize your content with structured categories and post schedules</p>
              </div>
              {isAdmin && activeTab === 'categories' && (
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white text-sm font-medium rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Category
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10">
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#6366F1] text-[#6366F1]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 lg:px-10 py-6">
            {activeTab === 'categories' ? (
              <div className="space-y-8">
                {/* Deals Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Deals</h2>
                      <p className="text-gray-600 text-sm">Manage promotional deals and special offers</p>
                    </div>
                    <button className="inline-flex items-center px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors">
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Add Deal
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DEAL NAME</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POST FREQUENCY</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {deals.map((deal) => (
                          <tr key={deal.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{deal.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{deal.frequency}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button className="text-gray-400 hover:text-gray-600">
                                  <EditIcon className="w-4 h-4" />
                                </button>
                                <button className="text-gray-400 hover:text-red-600">
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Offerings Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Offerings</h2>
                      <p className="text-gray-600 text-sm">Manage your core services and activities</p>
                    </div>
                    <button className="inline-flex items-center px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors">
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Add Offering
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OFFERING NAME</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POST FREQUENCY</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {offerings.map((offering) => (
                          <tr key={offering.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{offering.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{offering.frequency}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button className="text-gray-400 hover:text-gray-600">
                                  <EditIcon className="w-4 h-4" />
                                </button>
                                <button className="text-gray-400 hover:text-red-600">
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Next Month Preview</h3>
                <p className="text-gray-600">Content scheduled for next month will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Category Modal */}
        <Modal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false)
            setCategoryName('')
          }}
          maxWidth="md"
          title="Create New Category"
        >
          <div className="p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCreateCategory()
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Seasonal Events"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">Example: Seasonal Events</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false)
                    setCategoryName('')
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCategory || !categoryName.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white text-sm font-medium rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingCategory ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </Modal>

      </AppLayout>
    </RequireAuth>
  )
}

// Render modal at root

