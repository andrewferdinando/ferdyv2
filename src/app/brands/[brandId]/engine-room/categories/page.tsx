'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import Link from 'next/link'
import Breadcrumb from '@/components/navigation/Breadcrumb'
import { useCategories } from '@/hooks/useCategories'
import { useSubcategories } from '@/hooks/useSubcategories'
import { SubcategoryScheduleForm } from '@/components/forms/SubcategoryScheduleForm'

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
  const [selectedCategory, setSelectedCategory] = useState<{id: string, name: string} | null>(null)
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false)
  const [editingSubcategory, setEditingSubcategory] = useState<{id: string, name: string} | null>(null)
  
  const { categories, loading } = useCategories()
  const { subcategories, loading: subcategoriesLoading, deleteSubcategory } = useSubcategories(brandId, selectedCategory?.id || null)

  const tabs = [
    { id: 'categories', name: 'Categories' },
    { id: 'nextMonth', name: 'Post Framework' },
  ]

  if (loading) {
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
              <div className="space-y-6">
                {!selectedCategory ? (
                  /* Categories List */
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {categories?.map((category) => (
                      <div
                        key={category.id}
                        onClick={() => setSelectedCategory(category)}
                        className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
                        <p className="text-gray-600 text-sm">Click to manage sub-categories</p>
                      </div>
                    ))}
                    {(!categories || categories.length === 0) && (
                      <div className="col-span-full text-center py-12">
                        <p className="text-gray-500">No categories available. Contact your administrator.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Subcategories for Selected Category */
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">{selectedCategory.name}</h2>
                          <p className="text-gray-600 text-sm">Manage sub-categories for this category</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setEditingSubcategory(null)
                          setIsSubcategoryModalOpen(true)
                        }}
                        className="inline-flex items-center px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add Sub-category
                      </button>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200">
                      {subcategoriesLoading ? (
                        <div className="p-6">
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
                          </div>
                        </div>
                      ) : subcategories.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SUBCATEGORY NAME</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {subcategories.map((subcategory) => (
                                <tr key={subcategory.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subcategory.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex space-x-2">
                                      <button 
                                        onClick={() => {
                                          setEditingSubcategory(subcategory)
                                          setIsSubcategoryModalOpen(true)
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                      >
                                        <EditIcon className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => deleteSubcategory(subcategory.id)}
                                        className="text-gray-400 hover:text-red-600"
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-6">
                          <div className="text-center py-12">
                            <p className="text-gray-500">No sub-categories yet. Create one to get started.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Next Month Preview</h3>
                <p className="text-gray-600">Content scheduled for next month will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Subcategory Schedule Form */}
        <SubcategoryScheduleForm
          isOpen={isSubcategoryModalOpen}
          onClose={() => {
            setIsSubcategoryModalOpen(false)
            setEditingSubcategory(null)
          }}
          brandId={brandId}
          categoryId={selectedCategory?.id}
          editingSubcategory={editingSubcategory || undefined}
          onSuccess={() => {
            // Refresh subcategories after successful save
            window.location.reload()
          }}
        />
      </AppLayout>
    </RequireAuth>
  )
}