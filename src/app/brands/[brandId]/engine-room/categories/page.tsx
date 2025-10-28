'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import Breadcrumb from '@/components/navigation/Breadcrumb'
import { useCategories } from '@/hooks/useCategories'
import { useSubcategories } from '@/hooks/useSubcategories'
import { useUserRole } from '@/hooks/useUserRole'
import { SubcategoryScheduleForm } from '@/components/forms/SubcategoryScheduleForm'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase-browser'

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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [editingSubcategory, setEditingSubcategory] = useState<{id: string, name: string, detail?: string, url?: string, hashtags: string[], channels?: string[]} | null>(null)
  const [editingScheduleRule, setEditingScheduleRule] = useState<{
    id: string
    frequency: string
    timeOfDay: string
    timesOfDay?: string[]
    daysOfWeek: string[]
    daysOfMonth: number[]
    nthWeek?: number
    weekday?: number
    channels: string[]
    isDateRange?: boolean
    startDate?: string
    endDate?: string
    daysBefore?: number[]
    daysDuring?: number[]
    timezone?: string
  } | null>(null)
  
  const { categories, loading, createCategory, refetch } = useCategories(brandId)
  const { subcategories, loading: subcategoriesLoading, deleteSubcategory } = useSubcategories(brandId, selectedCategory?.id || null)
  const { isAdmin, loading: roleLoading } = useUserRole(brandId)

  const tabs = [
    { id: 'categories', name: 'Categories' },
    { id: 'nextMonth', name: 'Post Framework' },
  ]

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      alert('Please enter a category name')
      return
    }

    if (!brandId) {
      alert('Brand ID is missing')
      return
    }

    setIsCreatingCategory(true)
    try {
      await createCategory(categoryName.trim(), brandId)
      setCategoryName('')
      setIsCategoryModalOpen(false)
      // Categories will be automatically updated via local state in createCategory
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Failed to create category. Please try again.')
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
              {isAdmin && !selectedCategory && (
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
                          setEditingScheduleRule(null)
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
                                        onClick={async () => {
                                          setEditingSubcategory({
                                            id: subcategory.id,
                                            name: subcategory.name,
                                            detail: subcategory.detail,
                                            url: subcategory.url,
                                            hashtags: subcategory.hashtags,
                                            channels: subcategory.channels
                                          })
                                          
                                          // Fetch associated schedule rule
                                          const { data: scheduleRule } = await supabase
                                            .from('schedule_rules')
                                            .select('*')
                                            .eq('brand_id', brandId)
                                            .eq('subcategory_id', subcategory.id)
                                            .eq('is_active', true)
                                            .single()
                                          
                                          if (scheduleRule) {
                                            // Map database fields to form format
                                            // Handle time_of_day (can be single value for daily/weekly/monthly or array for specific)
                                            let timeOfDayValue = ''
                                            let timesOfDayArray: string[] = []
                                            
                                            if (Array.isArray(scheduleRule.time_of_day)) {
                                              // time_of_day is an array (specific frequency)
                                              timesOfDayArray = scheduleRule.time_of_day
                                              timeOfDayValue = timesOfDayArray.length > 0 ? timesOfDayArray[0] : ''
                                            } else if (typeof scheduleRule.time_of_day === 'string') {
                                              // time_of_day is a single string (daily/weekly/monthly)
                                              timeOfDayValue = scheduleRule.time_of_day
                                              timesOfDayArray = timeOfDayValue ? [timeOfDayValue] : []
                                            }
                                            
                                            const mappedRule = {
                                              id: scheduleRule.id,
                                              frequency: scheduleRule.frequency,
                                              timeOfDay: timeOfDayValue || '',  // Ensure it's always a string, never undefined
                                              timesOfDay: timesOfDayArray,
                                              daysOfWeek: scheduleRule.days_of_week 
                                                ? scheduleRule.days_of_week.map((d: number) => {
                                                    const dayMap: Record<number, string> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 7: 'sun' }
                                                    return dayMap[d] || ''
                                                  }).filter(Boolean)
                                                : [],
                                              daysOfMonth: scheduleRule.day_of_month ? [scheduleRule.day_of_month] : [],
                                              nthWeek: scheduleRule.nth_week,
                                              weekday: scheduleRule.weekday,
                                              channels: scheduleRule.channels || [],
                                              // Specific date/range fields
                                              isDateRange: scheduleRule.end_date && scheduleRule.end_date !== scheduleRule.start_date,
                                              startDate: scheduleRule.start_date ? new Date(scheduleRule.start_date).toISOString().split('T')[0] : '',
                                              endDate: scheduleRule.end_date ? new Date(scheduleRule.end_date).toISOString().split('T')[0] : '',
                                              daysBefore: scheduleRule.days_before || [],
                                              daysDuring: scheduleRule.days_during || [],
                                              timezone: scheduleRule.timezone || 'Pacific/Auckland'
                                            }
                                            setEditingScheduleRule(mappedRule)
                                          } else {
                                            setEditingScheduleRule(null)
                                          }
                                          
                                          setIsSubcategoryModalOpen(true)
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                      >
                                        <EditIcon className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={async () => {
                                          if (confirm(`Are you sure you want to delete "${subcategory.name}"?`)) {
                                            try {
                                              await deleteSubcategory(subcategory.id)
                                              // Subcategories will refresh automatically via useEffect
                                            } catch (error) {
                                              console.error('Error deleting subcategory:', error)
                                              alert('Failed to delete subcategory. Please try again.')
                                            }
                                          }
                                        }}
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
            setEditingScheduleRule(null)
          }}
          brandId={brandId}
          categoryId={selectedCategory?.id}
          editingSubcategory={editingSubcategory || undefined}
          editingScheduleRule={editingScheduleRule || undefined}
          onSuccess={() => {
            // Close modal - subcategories will refresh automatically via useEffect
            setIsSubcategoryModalOpen(false)
            setEditingSubcategory(null)
            setEditingScheduleRule(null)
            // Force a refresh of subcategories by triggering a state change
            // The useSubcategories hook will automatically refetch when categoryId changes
            // So we can just close the modal and it will refresh
          }}
        />

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