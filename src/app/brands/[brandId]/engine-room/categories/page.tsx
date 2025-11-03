'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import Breadcrumb from '@/components/navigation/Breadcrumb'
import { useCategories } from '@/hooks/useCategories'
import { useSubcategories } from '@/hooks/useSubcategories'
import { useUserRole } from '@/hooks/useUserRole'
import { useScheduleRules } from '@/hooks/useScheduleRules'
import { SubcategoryScheduleForm } from '@/components/forms/SubcategoryScheduleForm'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase-browser'
import { useToast } from '@/components/ui/ToastProvider'
import DraftsPushProgressModal from '@/components/schedule/DraftsPushProgressModal'

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

const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default function CategoriesPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.brandId as string
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('categories')
  const [selectedCategory, setSelectedCategory] = useState<{id: string, name: string} | null>(null)
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryForNewRule, setCategoryForNewRule] = useState<string>('')
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
  
  const { categories, loading, createCategory } = useCategories(brandId)
  const { subcategories, loading: subcategoriesLoading, deleteSubcategory, refetch: refetchSubcategories } = useSubcategories(brandId, selectedCategory?.id || null)
  const { isAdmin, loading: roleLoading } = useUserRole(brandId)
  const { rules, loading: rulesLoading, deleteRule, refetch: refetchRules } = useScheduleRules(brandId)

  const [pushing, setPushing] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [draftsAlreadyExist, setDraftsAlreadyExist] = useState<boolean | null>(null)
  const [frameworkWindow, setFrameworkWindow] = useState<{ start_date: string; end_date: string } | null>(null)

  // Check if drafts already exist for the current framework month
  const checkExistingDrafts = useCallback(async () => {
    if (!brandId) return

    try {
      // Get the framework window dates
      const { data: window, error: windowError } = await supabase
        .rpc('rpc_next_framework_window', { p_brand_id: brandId })

      if (windowError || !window || window.length === 0) {
        console.error('Error fetching framework window:', windowError)
        setDraftsAlreadyExist(false)
        return
      }

      const { start_date, end_date } = window[0]
      setFrameworkWindow({ start_date, end_date })

      // Check for existing framework drafts in that date range
      const { count, error: countError } = await supabase
        .from('drafts')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brandId)
        .eq('schedule_source', 'framework')
        .gte('scheduled_for', start_date)
        .lte('scheduled_for', end_date)

      if (countError) {
        console.error('Error checking existing drafts:', countError)
        setDraftsAlreadyExist(false)
        return
      }

      setDraftsAlreadyExist((count || 0) > 0)
    } catch (err) {
      console.error('Error in checkExistingDrafts:', err)
      setDraftsAlreadyExist(false)
    }
  }, [brandId])

  useEffect(() => {
    if (activeTab === 'nextMonth') {
      checkExistingDrafts()
    }
  }, [activeTab, checkExistingDrafts])

  const bannerCopyNZ = useMemo(() => {
    // If we know drafts exist, show "have been pushed" message
    if (draftsAlreadyExist === true && frameworkWindow) {
      try {
        const targetDate = new Date(frameworkWindow.start_date)
        const monthName = new Intl.DateTimeFormat('en-NZ', { month: 'long' }).format(targetDate)
        return `${monthName} posts have been pushed to Drafts.`
      } catch (e) {
        return 'Drafts have been pushed for this month.'
      }
    }

    // Otherwise show the standard "will be pushed" message
    try {
      const parts = new Intl.DateTimeFormat('en-NZ', {
        timeZone: 'Pacific/Auckland',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      }).formatToParts(new Date())

      const get = (type: string) => Number(parts.find(p => p.type === type)?.value || '0')
      const year = get('year')
      const month = get('month') - 1 // 0-based
      const day = get('day')

      // If after the 15th NZT, create next month for the month-after-next
      let createMonthIndex = day > 15 ? month + 1 : month
      let createYear = year
      if (createMonthIndex > 11) { createMonthIndex -= 1  // will add back below safely
      }

      let targetMonthIndex = day > 15 ? month + 2 : month + 1
      let targetYear = year
      while (targetMonthIndex > 11) { targetMonthIndex -= 12; targetYear += 1 }
      while (createMonthIndex > 11) { createMonthIndex -= 12; createYear += 1 }

      const monthName = new Intl.DateTimeFormat('en-NZ', { month: 'long' }).format(new Date(targetYear, targetMonthIndex, 1))
      const createMonthName = new Intl.DateTimeFormat('en-NZ', { month: 'long' }).format(new Date(createYear, createMonthIndex, 15))

      return `${monthName} posts will be pushed to Drafts on ${createMonthName} 15th.`
    } catch (e) {
      return ''
    }
  }, [draftsAlreadyExist, frameworkWindow])

  const selectImageForSubcategory = async (brandId: string, subcategoryId: string): Promise<string | null> => {
    try {
      // Step 1: fetch tags for subcategory
      const { data: tags, error: tagsErr } = await supabase
        .from('tags')
        .select('id')
        .eq('subcategory_id', subcategoryId)
      if (tagsErr) {
        console.error(`Error fetching tags for subcategory ${subcategoryId}:`, tagsErr)
        // Continue to fallback
      }
      const tagIds = (tags || []).map((t: { id: string }) => t.id)

      if (tagIds.length > 0) {
        // Step 2: fetch asset_ids via asset_tags
        const { data: assetTagRows, error: atErr } = await supabase
          .from('asset_tags')
          .select('asset_id')
          .in('tag_id', tagIds)
        if (atErr) {
          console.error(`Error fetching asset_tags for tagIds [${tagIds.join(',')}]:`, atErr)
          // Continue to fallback
        } else {
          const assetIds = (assetTagRows || []).map((r: { asset_id: string }) => r.asset_id)
          if (assetIds.length > 0) {
            // Step 3: fetch all matching assets for brand and pick one randomly
            const { data: matches, error: matchErr } = await supabase
              .from('assets')
              .select('id')
              .eq('brand_id', brandId)
              .in('id', assetIds)
            if (matchErr) {
              console.error(`Error fetching tagged asset for brand ${brandId}:`, matchErr, matchErr.message, matchErr.details)
            } else if (matches && matches.length > 0) {
              const randomIndex = Math.floor(Math.random() * matches.length)
              const selected = matches[randomIndex]
              console.log(`Found tagged image ${selected.id} for subcategory ${subcategoryId}`)
              return selected.id
            }
          }
        }
      }

      // Fallback: any random asset for brand
      const { data: fallbackAssets, error: fbErr } = await supabase
        .from('assets')
        .select('id')
        .eq('brand_id', brandId)
      
      if (fbErr) {
        console.error(`Error fetching fallback asset for brand ${brandId}:`, fbErr, fbErr.message, fbErr.details, fbErr.hint)
        return null
      }
      if (fallbackAssets && fallbackAssets.length > 0) {
        const randomIndex = Math.floor(Math.random() * fallbackAssets.length)
        const selected = fallbackAssets[randomIndex]
        console.log(`Using fallback image ${selected.id} for subcategory ${subcategoryId}`)
        return selected.id
      }
      console.warn(`No assets found for brand ${brandId}`)
      return null
    } catch (err) {
      console.error(`Unexpected error in selectImageForSubcategory:`, err)
      return null
    }
  }

  const handlePushToDrafts = async () => {
    if (pushing) return
    setPushing(true)
    setShowProgressModal(true)
    try {
      // Call API route that creates drafts and triggers copy generation
      const res = await fetch('/api/drafts/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to push drafts')
      }
      
      const result = await res.json()
      const data = result.draftCount || 0
      
      // Log copy generation result if available
      if (result.copyGenerationTriggered) {
        console.log('Copy generation triggered:', result.copyJobResult)
      }

      // If RPC returns a number (row count), fetch the newly created drafts and backfill
      if (typeof data === 'number' && data > 0) {
        // Fetch all framework targets to map scheduled_for -> subcategory_id
        const { data: targets, error: targetsError } = await supabase
          .rpc('rpc_framework_targets', { p_brand_id: brandId })

        // Fetch schedule rules to get subcategory defaults
        const { data: rules, error: rulesError } = await supabase
          .from('schedule_rules')
          .select('subcategory_id')
          .eq('brand_id', brandId)
          .eq('is_active', true)

        // Fetch subcategories for hashtags
        const { data: subcategories, error: subcatsError } = await supabase
          .from('subcategories')
          .select('id, default_hashtags')
          .in('id', (rules || []).map((r: { subcategory_id: string }) => r.subcategory_id))

        // Fetch framework drafts created in the last 2 minutes (for this brand) to backfill images and copy
        // We need to fetch ALL drafts (not filter by copy/images) so we can assign images even if copy already exists
        const { data: newDrafts, error: fetchError } = await supabase
          .from('drafts')
          .select('id, scheduled_for, copy, asset_ids')
          .eq('brand_id', brandId)
          .eq('schedule_source', 'framework')
          .gte('created_at', new Date(Date.now() - 120000).toISOString()) // Last 2 minutes
          .order('created_at', { ascending: false })
          .limit(data)

        if (!fetchError && !targetsError && !rulesError && !subcatsError && newDrafts && newDrafts.length > 0 && targets) {
          interface FrameworkTarget {
            subcategory_id: string
            scheduled_at: string
            frequency: string
          }
          interface Subcategory {
            id: string
            default_hashtags: string[] | null
          }
          const subcatsMap = new Map<string, Subcategory>()
          ;(subcategories as Subcategory[] || []).forEach(sc => subcatsMap.set(sc.id, sc))

          // Match drafts to subcategories via scheduled_for (with 5-second tolerance)
          for (const draft of newDrafts) {
            const draftTime = new Date(draft.scheduled_for).getTime()
            const target = (targets as FrameworkTarget[]).find((t) => {
              const targetTime = new Date(t.scheduled_at).getTime()
              return Math.abs(targetTime - draftTime) < 5000 // 5 second tolerance
            })

            if (target?.subcategory_id) {
              const subcat = subcatsMap.get(target.subcategory_id)
              const imageId = await selectImageForSubcategory(brandId, target.subcategory_id)
              const updates: Partial<{ copy: string; asset_ids: string[]; hashtags: string[] }> = {}
              
              // Only set placeholder copy if copy is missing or still placeholder
              // Don't overwrite AI-generated copy
              const needsCopy = !draft.copy || draft.copy.trim() === '' || draft.copy === 'Post copy coming soon…'
              if (needsCopy) {
                updates.copy = 'Post copy coming soon…'
              }
              
              // Assign image if missing
              if (imageId && (!draft.asset_ids || draft.asset_ids.length === 0)) {
                updates.asset_ids = [imageId]
                console.log(`Assigned image ${imageId} to draft ${draft.id} for subcategory ${target.subcategory_id}`)
              } else if (!imageId) {
                console.warn(`No image found for draft ${draft.id} (subcategory ${target.subcategory_id})`)
              }
              
              // Assign hashtags if missing
              if (subcat?.default_hashtags && subcat.default_hashtags.length > 0) {
                updates.hashtags = subcat.default_hashtags
              }
              
              // Update if there are updates to make
              if (Object.keys(updates).length > 0) {
                const { error: updateError, data: updateData } = await supabase
                  .from('drafts')
                  .update(updates)
                  .eq('id', draft.id)
                  .select('id, asset_ids, hashtags, copy')
                
                if (updateError) {
                  console.error(`Failed to update draft ${draft.id}:`, updateError)
                } else {
                  console.log(`Updated draft ${draft.id}:`, updateData?.[0])
                }
              }
            } else {
              // Fallback: just set placeholder copy if needed
              const needsCopy = !draft.copy || draft.copy.trim() === '' || draft.copy === 'Post copy coming soon…'
              if (needsCopy) {
                const { error: updateError } = await supabase
                  .from('drafts')
                  .update({ copy: 'Post copy coming soon…' })
                  .eq('id', draft.id)
                
                if (updateError) {
                  console.error(`Failed to update draft ${draft.id}:`, updateError)
                }
              }
            }
          }
        } else {
          console.error('Backfill skipped:', { fetchError, targetsError, rulesError, subcatsError, newDraftsCount: newDrafts?.length, targetsCount: targets?.length })
        }
      } else if (Array.isArray(data)) {
        // Legacy: RPC returned array of drafts
        const createdDrafts: Array<{ id: string, subcategory_id: string }> = data
        for (const draft of createdDrafts) {
          const imageId = await selectImageForSubcategory(brandId, draft.subcategory_id)
          if (imageId) {
            await supabase
              .from('drafts')
              .update({ asset_ids: [imageId], copy: 'Post copy coming soon…' })
              .eq('id', draft.id)
          } else {
            await supabase
              .from('drafts')
              .update({ copy: 'Post copy coming soon…' })
              .eq('id', draft.id)
          }
        }
      }

      // Refresh data
      await refetchRules()
      
      // Re-check if drafts exist to update banner and button
      await checkExistingDrafts()
      
      // Show success toast with navigation option
      const count = Array.isArray(data) ? data.length : (typeof data === 'number' ? data : undefined)
      showToast({
        title: 'Drafts created from framework',
        message: 'Your posts have been successfully pushed to Drafts.',
        type: 'success',
        duration: 4000,
        actionLabel: 'View Drafts',
        onAction: () => router.push(`/brands/${brandId}/schedule`)
      })
    } catch (err) {
      console.error('Push to drafts failed', err)
      showToast({
        title: 'Something went wrong',
        message: "We couldn't push drafts right now. Please try again.",
        type: 'error',
        duration: 4000
      })
    } finally {
      setPushing(false)
      setShowProgressModal(false)
    }
  }

  const tabs = [
    { id: 'categories', name: 'Categories' },
    { id: 'nextMonth', name: 'Post Framework' },
  ]

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      showToast({
        title: 'Category name required',
        message: 'Please enter a category name',
        type: 'error',
        duration: 3000
      })
      return
    }

    if (!brandId) {
      showToast({
        title: 'Something went wrong',
        message: 'Brand ID is missing',
        type: 'error',
        duration: 3000
      })
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
      showToast({
        title: 'Failed to create category',
        message: 'Please try again.',
        type: 'error',
        duration: 3000
      })
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
              {isAdmin && !selectedCategory && activeTab === 'categories' && (
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
                        Add Sub Category
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
                                                ? (Array.isArray(scheduleRule.days_of_week) 
                                                    ? scheduleRule.days_of_week 
                                                    : [scheduleRule.days_of_week] // Backward compatibility: wrap single value in array
                                                  ).map((d: number) => {
                                                    const dayMap: Record<number, string> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 7: 'sun' }
                                                    return dayMap[d] || ''
                                                  }).filter(Boolean)
                                                : [],
                                              daysOfMonth: scheduleRule.day_of_month 
                                                ? (Array.isArray(scheduleRule.day_of_month) 
                                                    ? scheduleRule.day_of_month 
                                                    : [scheduleRule.day_of_month] // Backward compatibility: wrap single value in array
                                                  )
                                                : [],
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
                                              showToast({
                                                title: 'Failed to delete subcategory',
                                                message: 'Please try again.',
                                                type: 'error',
                                                duration: 3000
                                              })
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
              <div className="space-y-6">
                {/* Title removed per request */}

                {/* Row 2: Banner + Push Button */}
                {isAdmin && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="w-full">
                      {bannerCopyNZ && (
                        <div className="px-3 py-2 bg-[#EEF2FF] text-[#6366F1] text-sm rounded-lg inline-block">
                          {bannerCopyNZ}
                        </div>
                      )}
                  </div>
                    <div className="flex-shrink-0 ml-4">
                      <button
                        onClick={handlePushToDrafts}
                        disabled={pushing || draftsAlreadyExist === true}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${(pushing || draftsAlreadyExist === true) ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-[#6366F1] hover:bg-[#4F46E5]'}`}
                      >
                        {pushing && (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                        )}
                        {pushing ? 'Pushing…' : 'Push to Drafts Now'}
                      </button>
                    </div>
                    </div>
                  )}

                <div className="bg-white rounded-lg border border-gray-200">
                  {rulesLoading ? (
                    <div className="p-6">
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
                      </div>
                    </div>
                  ) : (rules || []).filter(r => r.is_active).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategory</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days / Dates</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(rules || [])
                            .filter(r => r.is_active)
                            .map((rule) => {
                            const dayNames: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }
                            const weekdayNames: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }
                            const nthMap: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' }

                            const freqLabel = rule.frequency === 'daily' ? 'Daily'
                              : rule.frequency === 'weekly' ? 'Weekly'
                              : rule.frequency === 'monthly' ? 'Monthly'
                              : 'Specific Date/Range'

                            let daysDates = ''
                            if (rule.frequency === 'weekly' && rule.days_of_week && rule.days_of_week.length) {
                              daysDates = rule.days_of_week.map(d => dayNames[d] || '').filter(Boolean).join(', ')
                            } else if (rule.frequency === 'monthly') {
                              if (Array.isArray(rule.day_of_month) && rule.day_of_month.length) {
                                daysDates = rule.day_of_month.join(', ')
                              } else if (!Array.isArray(rule.day_of_month) && rule.nth_week && rule.weekday) {
                                daysDates = `${nthMap[rule.nth_week] || rule.nth_week} ${weekdayNames[rule.weekday] || ''}`
                              }
                            } else if (rule.frequency === 'specific') {
                              const start = rule.start_date ? new Date(rule.start_date) : null
                              const end = rule.end_date ? new Date(rule.end_date) : null
                              if (start && end) {
                                const sameDay = start.toDateString() === end.toDateString()
                                const fmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                                daysDates = sameDay ? fmt.format(start) : `${fmt.format(start)} → ${fmt.format(end)}`
                              }
                            }

                            return (
                              <tr key={rule.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rule.categories?.name || ''}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rule.subcategories?.name || ''}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{freqLabel}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{daysDates || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => {
                                        // Prefill edit data from rule
                                        setEditingSubcategory({
                                          id: rule.subcategory_id,
                                          name: rule.subcategories?.name || '',
                                          detail: rule.subcategories?.detail,
                                          url: rule.subcategories?.url,
                                          hashtags: rule.subcategories?.default_hashtags || [],
                                          channels: rule.channels || []
                                        })

                                        // Map schedule rule for form
                                        const timesArray = Array.isArray(rule.time_of_day) ? rule.time_of_day : (rule.time_of_day ? [rule.time_of_day] : [])
                                        const mappedRule = {
                                          id: rule.id,
                                          frequency: rule.frequency,
                                          timeOfDay: timesArray[0] || '',
                                          timesOfDay: timesArray,
                                          daysOfWeek: (rule.days_of_week || []).map((d: number) => {
                                            const dayMap: Record<number, string> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 7: 'sun' }
                                            return dayMap[d] || ''
                                          }).filter(Boolean),
                                          daysOfMonth: Array.isArray(rule.day_of_month) ? rule.day_of_month : (rule.day_of_month ? [rule.day_of_month] : []),
                                          nthWeek: rule.nth_week,
                                          weekday: rule.weekday,
                                          channels: rule.channels || [],
                                          isDateRange: !!(rule.end_date && rule.start_date && new Date(rule.end_date).toDateString() !== new Date(rule.start_date).toDateString()),
                                          startDate: rule.start_date ? new Date(rule.start_date).toISOString().split('T')[0] : '',
                                          endDate: rule.end_date ? new Date(rule.end_date).toISOString().split('T')[0] : '',
                                          daysBefore: rule.days_before || [],
                                          daysDuring: rule.days_during || [],
                                          timezone: rule.timezone || 'Pacific/Auckland'
                                        }
                                        setEditingScheduleRule(mappedRule)
                                        setSelectedCategory({ id: rule.category_id, name: rule.categories?.name || '' })
                                        setIsSubcategoryModalOpen(true)
                                      }}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      <EditIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (confirm(`Remove scheduling rule for "${rule.subcategories?.name || 'subcategory'}"?`)) {
                                          try {
                                            await deleteRule(rule.id)
                                          } catch (err) {
                                            showToast({
                                              title: 'Failed to delete rule',
                                              message: 'Please try again.',
                                              type: 'error',
                                              duration: 3000
                                            })
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
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="text-center py-12">
                        <p className="text-gray-500">No active schedule rules yet. Create one to get started.</p>
                      </div>
                    </div>
                  )}
                </div>
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
          categoryId={activeTab === 'categories' ? selectedCategory?.id : (categoryForNewRule || selectedCategory?.id)}
          editingSubcategory={editingSubcategory || undefined}
          editingScheduleRule={editingScheduleRule || undefined}
          onSuccess={() => {
            // Close modal and refresh subcategories
            setIsSubcategoryModalOpen(false)
            setEditingSubcategory(null)
            setEditingScheduleRule(null)
            setCategoryForNewRule('')
            // Refetch subcategories to show the newly created one
            refetchSubcategories()
            // Also refresh schedule rules so Post Framework updates immediately
            refetchRules()
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

        {/* Push to Drafts Progress Modal */}
        {showProgressModal && (
          <DraftsPushProgressModal 
            estimatedMs={60000} 
            onClose={() => setShowProgressModal(false)}
          />
        )}
      </AppLayout>
    </RequireAuth>
  )
}