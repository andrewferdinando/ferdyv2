'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { useUserRole } from '@/hooks/useUserRole'
import { useScheduleRules } from '@/hooks/useScheduleRules'
import { SubcategoryScheduleForm } from '@/components/forms/SubcategoryScheduleForm'
import { supabase } from '@/lib/supabase-browser'
import { useToast } from '@/components/ui/ToastProvider'
import { SubcategoryType } from '@/types/subcategories'
import CategoryCalendar from '@/components/categories/CategoryCalendar'

const SUBCATEGORY_TYPE_LABELS: Record<SubcategoryType, string> = {
  event_series: 'Events',
  service_or_programme: 'Products / Services',
  promo_or_offer: 'Promos',
  dynamic_schedule: 'Schedules',
  content_series: 'Content Pillar (legacy)',
  other: 'Other',
  unspecified: 'Other',
}

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

const DuplicateIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const CalendarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default function CategoriesPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.brandId as string
  const { showToast } = useToast()
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [editingSubcategory, setEditingSubcategory] = useState<{id: string, name: string, detail?: string, url?: string, subcategory_type?: SubcategoryType, settings?: Record<string, any>, hashtags: string[], channels?: string[]} | null>(null)
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
  
  // Categories no longer used - removed
  const { isAdmin, loading: roleLoading } = useUserRole(brandId)
  const { rules, loading: rulesLoading, deleteRule, refetch: refetchRules } = useScheduleRules(brandId)
  const [allSubcategories, setAllSubcategories] = useState<Array<{
    id: string
    name: string
    subcategory_type?: string
    detail?: string
    url?: string
    channels?: string[] | null
    default_hashtags?: string[]
    settings?: any
    setup_complete?: boolean
  }>>([])
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(true)

  // Fetch all subcategories to include those without schedule rules
  useEffect(() => {
    const fetchAllSubcategories = async () => {
      if (!brandId) return
      
      try {
        setSubcategoriesLoading(true)
        const { data, error } = await supabase
          .from('subcategories')
          .select('*')
          .eq('brand_id', brandId)
          .order('name', { ascending: true })

        if (error) {
          console.error('Error fetching subcategories:', error)
          return
        }

        setAllSubcategories(data || [])
      } catch (err) {
        console.error('Error fetching subcategories:', err)
      } finally {
        setSubcategoriesLoading(false)
      }
    }

    fetchAllSubcategories()
  }, [brandId])

  // Refetch subcategories when rules are refetched (after wizard creates new item)
  useEffect(() => {
    if (!rulesLoading) {
      // Re-fetch subcategories after rules load to ensure we have the latest
      const fetchAllSubcategories = async () => {
        if (!brandId) return
        
        try {
          const { data, error } = await supabase
            .from('subcategories')
            .select('*')
            .eq('brand_id', brandId)
            .order('name', { ascending: true })

          if (error) {
            console.error('Error fetching subcategories:', error)
            return
          }

          setAllSubcategories(data || [])
        } catch (err) {
          console.error('Error fetching subcategories:', err)
        }
      }

      fetchAllSubcategories()
    }
  }, [brandId, rulesLoading])

  const selectImageForSubcategory = async (brandId: string, subcategoryId: string, subcategoryName?: string): Promise<string | null> => {
    try {
      // Step 1: fetch tag for subcategory (tags are linked by brand_id + name + kind, not subcategory_id)
      let tagIds: string[] = []

      if (subcategoryName) {
        const { data: tag, error: tagsErr } = await supabase
          .from('tags')
          .select('id')
          .eq('brand_id', brandId)
          .eq('name', subcategoryName)
          .eq('kind', 'subcategory')
          .eq('is_active', true)
          .maybeSingle()
        if (tagsErr) {
          console.error(`Error fetching tag for subcategory ${subcategoryId}:`, tagsErr)
        }
        if (tag) tagIds = [tag.id]
      } else {
        // Fallback: fetch subcategory name first, then look up tag
        const { data: subcat } = await supabase
          .from('subcategories')
          .select('name')
          .eq('id', subcategoryId)
          .single()
        if (subcat) {
          const { data: tag, error: tagsErr } = await supabase
            .from('tags')
            .select('id')
            .eq('brand_id', brandId)
            .eq('name', subcat.name)
            .eq('kind', 'subcategory')
            .eq('is_active', true)
            .maybeSingle()
          if (tagsErr) {
            console.error(`Error fetching tag for subcategory ${subcategoryId}:`, tagsErr)
          }
          if (tag) tagIds = [tag.id]
        }
      }

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


  const handleDeleteSubcategory = async (subcategoryId: string, subcategoryName: string) => {
    try {
      // Delete the entire subcategory (this will cascade delete schedule_rules, post_jobs, and drafts)
      // Delete in order: drafts -> post_jobs -> schedule_rules -> subcategory
      // Get all schedule_rule_ids for this subcategory
      const { data: scheduleRules, error: fetchRulesError } = await supabase
        .from('schedule_rules')
        .select('id')
        .eq('subcategory_id', subcategoryId)

      if (fetchRulesError) {
        console.error('Failed to fetch schedule rules:', fetchRulesError)
        throw new Error(`Failed to fetch schedule rules: ${fetchRulesError.message}`)
      }

      if (scheduleRules && scheduleRules.length > 0) {
        const ruleIds = scheduleRules.map((r: any) => r.id)
        
        // Delete drafts first
        const { data: postJobs, error: fetchPostJobsError } = await supabase
          .from('post_jobs')
          .select('id')
          .in('schedule_rule_id', ruleIds)

        if (fetchPostJobsError) {
          console.error('Failed to fetch post jobs:', fetchPostJobsError)
          // Continue - some post jobs might not exist
        }

        if (postJobs && postJobs.length > 0) {
          const postJobIds = postJobs.map((j: any) => j.id)
          
          // Delete drafts
          const { error: draftsError } = await supabase
            .from('drafts')
            .delete()
            .in('post_job_id', postJobIds)

          if (draftsError) {
            console.error('Failed to delete drafts:', draftsError)
            // Continue - some drafts might not exist
          }

          // Delete post_jobs
          const { error: postJobsError } = await supabase
            .from('post_jobs')
            .delete()
            .in('schedule_rule_id', ruleIds)

          if (postJobsError) {
            console.error('Failed to delete post_jobs:', postJobsError)
            throw new Error(`Failed to delete post jobs: ${postJobsError.message}`)
          }
        }

        // Delete schedule_rules
        const { error: scheduleRuleError } = await supabase
          .from('schedule_rules')
          .delete()
          .eq('subcategory_id', subcategoryId)

        if (scheduleRuleError) {
          console.error('Failed to delete schedule rules:', scheduleRuleError)
          throw new Error(`Failed to delete schedule rules: ${scheduleRuleError.message}`)
        }
      }

      // Delete the subcategory
      // First verify it exists
      const { data: existingSubcat, error: checkError } = await supabase
        .from('subcategories')
        .select('id, name, category_id')
        .eq('id', subcategoryId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = not found, which is fine
        console.error('Failed to check subcategory existence:', checkError)
        throw new Error(`Failed to check subcategory: ${checkError.message}`)
      }

      if (existingSubcat) {
        const { error: deleteError } = await supabase
          .from('subcategories')
          .delete()
          .eq('id', subcategoryId)

        if (deleteError) {
          console.error('Failed to delete subcategory:', deleteError)
          throw new Error(`Failed to delete subcategory: ${deleteError.message}`)
        }
      } else {
        // Subcategory doesn't exist, which is fine
        console.warn(`Subcategory ${subcategoryId} does not exist`)
      }

      // Refresh the rules list
      await refetchRules()

      showToast({
        title: 'Deleted',
        message: `Deleted subcategory "${subcategoryName}" and all associated data`,
        type: 'success',
        duration: 3000
      })
    } catch (err) {
      console.error('Failed to delete subcategory:', err)
      const errorMessage = err instanceof Error ? err.message : 'Please try again.'
      showToast({
        title: 'Failed to delete subcategory',
        message: errorMessage,
        type: 'error',
        duration: 3000
      })
    }
  }

  const handleDuplicateSubcategory = async (subcategoryId: string, subcategoryName: string) => {
    try {
      // Fetch the subcategory details
      const { data: subcategory, error: subcatError } = await supabase
        .from('subcategories')
        .select('*')
        .eq('id', subcategoryId)
        .single()

      if (subcatError || !subcategory) {
        console.error('Failed to fetch subcategory:', subcatError)
        throw new Error(`Failed to fetch subcategory details: ${subcatError?.message || 'Unknown error'}`)
      }

      // Fetch all schedule rules for this subcategory
      const { data: scheduleRules, error: rulesError } = await supabase
        .from('schedule_rules')
        .select('*')
        .eq('subcategory_id', subcategoryId)

      if (rulesError) {
        console.error('Failed to fetch schedule rules:', rulesError)
        throw new Error(`Failed to fetch schedule rules: ${rulesError.message}`)
      }

      // Generate a unique name by checking for existing duplicates
      let newName = `${subcategory.name} (Copy)`
      let copyNumber = 1
      
      // Check if a framework item with this name already exists for this brand
      // If so, increment until we find a unique name
      while (true) {
        const testName = copyNumber === 1 
          ? `${subcategory.name} (Copy)`
          : `${subcategory.name} (Copy ${copyNumber})`
        
        const { data: exists } = await supabase
          .from('subcategories')
          .select('id')
          .eq('brand_id', subcategory.brand_id)
          .ilike('name', testName)
          .limit(1)
        
        if (!exists || exists.length === 0) {
          newName = testName
          break
        }
        copyNumber++
      }

      // Create a new framework item with a unique name
      // Don't set created_at or updated_at - let the database handle defaults
      const insertData: {
        brand_id: string
        category_id: string | null
        name: string
        detail?: string | null
        url?: string | null
        default_hashtags?: string[] | null
        channels?: string[] | null
        subcategory_type?: string
        settings?: any
      } = {
        brand_id: subcategory.brand_id,
        category_id: null, // No longer using categories
        name: newName,
        detail: subcategory.detail || null,
        url: subcategory.url || null,
        default_hashtags: subcategory.default_hashtags || null,
        channels: subcategory.channels || null,
        subcategory_type: (subcategory as any).subcategory_type || 'other',
        settings: (subcategory as any).settings || {}
      }

      const { data: newSubcategory, error: createError } = await supabase
        .from('subcategories')
        .insert(insertData)
        .select()
        .single()

      if (createError) {
        console.error('Failed to create duplicate subcategory:', createError)
        throw new Error(`Failed to create duplicate subcategory: ${createError.message}`)
      }

      if (!newSubcategory) {
        throw new Error('Failed to create duplicate subcategory: No data returned')
      }

      // Copy all schedule rules to the new subcategory
      if (scheduleRules && scheduleRules.length > 0) {
        const newRules = scheduleRules.map((rule: any) => {
          const ruleData: {
            brand_id: string
            category_id: string | null
            subcategory_id: string
            frequency: string
            time_of_day?: string | string[] | null
            days_of_week?: number[] | null
            day_of_month?: number[] | number | null
            nth_week?: number | null
            weekday?: number | null
            channels?: string[] | string | null
            is_active?: boolean
            start_date?: string | null
            end_date?: string | null
            days_before?: number[] | null
            days_during?: number[] | null
            timezone?: string | null
          } = {
            brand_id: rule.brand_id,
            category_id: rule.category_id || null,
            subcategory_id: newSubcategory.id,
            frequency: rule.frequency,
            time_of_day: rule.time_of_day || null,
            days_of_week: rule.days_of_week || null,
            day_of_month: rule.day_of_month || null,
            nth_week: rule.nth_week || null,
            weekday: rule.weekday || null,
            channels: rule.channels || null,
            is_active: rule.is_active !== undefined ? rule.is_active : true,
            start_date: rule.start_date || null,
            end_date: rule.end_date || null,
            days_before: rule.days_before || null,
            days_during: rule.days_during || null,
            timezone: rule.timezone || null
          }
          return ruleData
        })

        const { error: rulesInsertError } = await supabase
          .from('schedule_rules')
          .insert(newRules)

        if (rulesInsertError) {
          console.error('Failed to copy schedule rules:', rulesInsertError)
          // If schedule rules fail to copy, delete the new subcategory to maintain consistency
          await supabase
            .from('subcategories')
            .delete()
            .eq('id', newSubcategory.id)
          throw new Error(`Failed to copy schedule rules: ${rulesInsertError.message}`)
        }
      }

      // Refresh the rules list
      await refetchRules()

      showToast({
        title: 'Duplicated',
        message: `Created duplicate of "${subcategoryName}"`,
        type: 'success',
        duration: 3000
      })
    } catch (err) {
      console.error('Failed to duplicate subcategory:', err)
      const errorMessage = err instanceof Error ? err.message : 'Please try again.'
      showToast({
        title: 'Failed to duplicate subcategory',
        message: errorMessage,
        type: 'error',
        duration: 3000
      })
    }
  }

  if (rulesLoading || subcategoriesLoading || roleLoading) {
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
          {/* Categories Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Categories</h1>
                <div className="relative inline-block group/info mt-2">
                  <span className="text-sm text-[#6366F1] hover:text-[#4F46E5] cursor-default transition-colors">
                    How do categories work?
                  </span>
                  <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover/info:block">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-[360px]">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Categories automatically create draft posts. Ferdy continuously generates drafts for the next 30 days based on your active categories. Review and approve drafts in the Schedule when you're ready.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCalendar(v => !v)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <CalendarIcon className="w-4 h-4 shrink-0" />
                  {showCalendar ? 'Hide Calendar' : 'Category Calendar'}
                </button>
                <button
                  onClick={() => {
                    router.push(`/brands/${brandId}/engine-room/framework/new`)
                  }}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white text-sm font-medium rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200"
                >
                  Add Category
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 lg:px-10 py-6">
            <div className="space-y-6">
              {showCalendar && (
                <CategoryCalendar rules={(rules || []).filter(r => r.is_active)} />
              )}
              <div className="bg-white rounded-lg border border-gray-200">
                {(rulesLoading || subcategoriesLoading) ? (
                  <div className="p-6">
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
                    </div>
                  </div>
                ) : (() => {
                  const activeRules = (rules || []).filter(r => r.is_active)
                  const subcategoriesWithRulesSet = new Set(activeRules.map((r: any) => r.subcategory_id))
                  const subcategoriesWithoutRulesList = allSubcategories.filter(sub => !subcategoriesWithRulesSet.has(sub.id))
                  
                  if (activeRules.length > 0 || subcategoriesWithoutRulesList.length > 0) {
                    // Build all the data needed for rendering
                    const buildTableData = () => {
                            const activeRules = (rules || []).filter(r => r.is_active)
                            const dayNames: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }
                            const weekdayNames: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }
                            const nthMap: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' }

                            // Separate specific (event) rules from others
                            const eventRules = activeRules.filter(r => r.frequency === 'specific')
                            const getSubcategoryChannelsForRule = (rule: typeof eventRules[0]) => {
                              if (!rule) return [] as string[]
                              if (rule.subcategories?.channels && rule.subcategories.channels.length > 0) {
                                return rule.subcategories.channels
                              }
                              return Array.isArray(rule.channels) ? rule.channels : (rule.channels ? [rule.channels] : [])
                            }
                            const otherRules = activeRules.filter(r => r.frequency !== 'specific')

                            // Group event rules by subcategory_id
                            const eventGroups = new Map<string, typeof eventRules>()
                            eventRules.forEach(rule => {
                              const key = rule.subcategory_id || 'none'
                              if (!eventGroups.has(key)) {
                                eventGroups.set(key, [])
                              }
                              eventGroups.get(key)!.push(rule)
                            })

                            // Format date range helper with year detection
                            // Helper to normalize date strings to UTC format
                            const normalizeToUTC = (dateStr: string): string => {
                              // If it already has timezone info (Z or +XX:XX), return as is
                              if (dateStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
                                return dateStr
                              }
                              // Otherwise, append Z to treat as UTC
                              return dateStr.endsWith('Z') ? dateStr : dateStr + 'Z'
                            }
                            
                            const formatDateRange = (start: string | null | undefined, end: string | null | undefined, occurrences: typeof eventRules, showYear: boolean = false) => {
                              if (!start) return ''
                              // Normalize to UTC before parsing to avoid timezone issues
                              const normalizedStart = normalizeToUTC(start)
                              const normalizedEnd = end ? normalizeToUTC(end) : normalizedStart
                              const startDate = new Date(normalizedStart)
                              const endDate = new Date(normalizedEnd)
                              const sameDay = startDate.getUTCDate() === endDate.getUTCDate() && 
                                             startDate.getUTCMonth() === endDate.getUTCMonth() && 
                                             startDate.getUTCFullYear() === endDate.getUTCFullYear()
                              
                              // Check if there are duplicate dates (same day/month, different year) in this subcategory
                              const allDates = occurrences.map((occ: any) => {
                                if (!occ.start_date) return null
                                const normalized = normalizeToUTC(occ.start_date)
                                const date = new Date(normalized)
                                return {
                                  day: date.getUTCDate(),
                                  month: date.getUTCMonth(),
                                  year: date.getUTCFullYear()
                                }
                              }).filter(Boolean) as Array<{ day: number; month: number; year: number }>
                              
                              const hasDuplicateDates = allDates.length > 1 && 
                                allDates.some((d1, i) => 
                                  allDates.some((d2, j) => 
                                    i !== j && d1.day === d2.day && d1.month === d2.month && d1.year !== d2.year
                                  )
                                )
                              
                              // Use UTC methods to avoid timezone conversion issues
                              const startDay = startDate.getUTCDate()
                              const startMonth = startDate.getUTCMonth()
                              const startYear = startDate.getUTCFullYear()
                              const endDay = endDate.getUTCDate()
                              const endMonth = endDate.getUTCMonth()
                              const endYear = endDate.getUTCFullYear()
                              
                              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                              
                              if (sameDay) {
                                const dateStr = `${startDay} ${monthNames[startMonth]}`
                                return showYear || hasDuplicateDates ? `${dateStr} ${startYear}` : dateStr
                              } else {
                                const startFmt = `${startDay} ${monthNames[startMonth]}`
                                const endFmt = `${endDay} ${monthNames[endMonth]}`
                                const startStr = showYear || hasDuplicateDates ? `${startFmt} ${startYear}` : startFmt
                                const endStr = showYear || hasDuplicateDates ? `${endFmt} ${endYear}` : endFmt
                                return `${startStr}–${endStr}`
                              }
                            }

                            // Helper to format ordinal numbers (1st, 2nd, 3rd, etc.)
                            const formatOrdinal = (num: number): string => {
                              const suffix = ['th', 'st', 'nd', 'rd']
                              const v = num % 100
                              return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0])
                            }

                            // Create flat list of subcategories (no category grouping)
                            interface SubcategoryItem {
                              subcategoryId: string
                              subcategoryName: string
                              isEvent: boolean
                              setupComplete: boolean
                              eventRules?: typeof eventRules
                              regularRule?: typeof otherRules[0]
                              subcategoryWithoutRule?: typeof allSubcategories[0]
                            }

                            const subcategoryItems: SubcategoryItem[] = []

                            // Add event groups
                            eventGroups.forEach((groupRules, subcategoryId) => {
                              const firstRule = groupRules[0]
                              subcategoryItems.push({
                                subcategoryId,
                                subcategoryName: firstRule.subcategories?.name || '',
                                isEvent: true,
                                setupComplete: firstRule.subcategories?.setup_complete !== false,
                                eventRules: groupRules
                              })
                            })

                            // Add regular rules (one per subcategory)
                            otherRules.forEach((rule) => {
                              // Check if we already have this subcategory (from event rules)
                              const existing = subcategoryItems.find(item => item.subcategoryId === rule.subcategory_id)
                              if (!existing) {
                                subcategoryItems.push({
                                  subcategoryId: rule.subcategory_id,
                                  subcategoryName: rule.subcategories?.name || '',
                                  isEvent: false,
                                  setupComplete: rule.subcategories?.setup_complete !== false,
                                  regularRule: rule
                                })
                              }
                            })

                            // Add subcategories without rules to the items array
                            const subcategoriesWithRulesSet = new Set(activeRules.map((r: any) => r.subcategory_id))
                            allSubcategories.forEach((sub) => {
                              if (!subcategoriesWithRulesSet.has(sub.id)) {
                                subcategoryItems.push({
                                  subcategoryId: sub.id,
                                  subcategoryName: sub.name,
                                  isEvent: false,
                                  setupComplete: sub.setup_complete !== false,
                                  regularRule: undefined,
                                  subcategoryWithoutRule: sub
                                })
                              }
                            })

                            // Sort subcategories A-Z
                            subcategoryItems.sort((a, b) => 
                              a.subcategoryName.localeCompare(b.subcategoryName)
                            )

                            const rows: React.ReactElement[] = []

                            // Track archived event categories (all dates in the past)
                            const archivedEventCategories: Array<{
                              subcategoryId: string
                              subcategoryName: string
                              lastEventDate: string
                              eventRules: typeof eventRules
                            }> = []

                            // Render each subcategory (flat list, no category headers)
                            subcategoryItems.forEach((subcat) => {
                                if (subcat.isEvent && subcat.eventRules) {
                                  const groupRules = subcat.eventRules
                                  const firstRule = groupRules[0]

                                  // Sort occurrences by start_date (normalize to UTC for correct sorting)
                                  const sortedOccurrences = [...groupRules].sort((a, b) => {
                                    const aDate = a.start_date ? new Date(normalizeToUTC(a.start_date)).getTime() : 0
                                    const bDate = b.start_date ? new Date(normalizeToUTC(b.start_date)).getTime() : 0
                                    return aDate - bDate
                                  })

                                  // Separate upcoming and past (normalize to UTC for correct comparison)
                                  const now = new Date()
                                  const upcoming = sortedOccurrences.filter(r => {
                                    const end = r.end_date || r.start_date
                                    return end ? new Date(normalizeToUTC(end)) >= now : false
                                  })
                                  const past = sortedOccurrences.filter(r => {
                                    const end = r.end_date || r.start_date
                                    return end ? new Date(normalizeToUTC(end)) < now : false
                                  })

                                  // If all dates are in the past, add to archived list instead of main table
                                  if (upcoming.length === 0 && past.length > 0) {
                                    const lastOccurrence = sortedOccurrences[sortedOccurrences.length - 1]
                                    archivedEventCategories.push({
                                      subcategoryId: subcat.subcategoryId,
                                      subcategoryName: subcat.subcategoryName,
                                      lastEventDate: formatDateRange(lastOccurrence.start_date, lastOccurrence.end_date, groupRules, true),
                                      eventRules: groupRules
                                    })
                                    return // Skip adding to main rows
                                  }

                                  const channels = firstRule.channels || []
                                  const subcategoryChannels = firstRule.subcategories?.channels ?? channels

                                  rows.push(
                                    <tr key={`event-group-${subcat.subcategoryId}`}>
                                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{subcat.subcategoryName}</td>
                                      <td className="px-6 py-4 text-sm text-gray-900">{SUBCATEGORY_TYPE_LABELS[(firstRule.subcategories?.subcategory_type as SubcategoryType) || 'other']}</td>
                                      <td className="px-6 py-4 text-sm text-gray-900">Specific Date/Range</td>
                                      <td className="px-6 py-4 text-sm">
                                        <div className="flex flex-wrap gap-2 items-center">
                                          {upcoming.slice(0, 3).map((occ) => (
                                            <span key={occ.id} className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                                              {formatDateRange(occ.start_date, occ.end_date, groupRules)}
                                            </span>
                                          ))}
                                          {upcoming.length > 3 && (
                                            <span className="text-xs text-gray-500">
                                              +{upcoming.length - 3} more
                                            </span>
                                          )}
                                          {past.length > 0 && (
                                            <details className="mt-2">
                                              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                                                View all dates ({sortedOccurrences.length} total, {past.length} past)
                                              </summary>
                                              <div className="mt-2 space-y-1 pl-4">
                                                {sortedOccurrences.map((occ) => {
                                                  const isPast = (() => {
                                                    const end = occ.end_date || occ.start_date
                                                    return end ? new Date(normalizeToUTC(end)) < now : false
                                                  })()
                                                  return (
                                                    <div key={occ.id} className={`text-xs ${isPast ? 'text-gray-400' : 'text-gray-700'}`}>
                                                      {formatDateRange(occ.start_date, occ.end_date, groupRules)}
                                                    </div>
                                                  )
                                                })}
                                              </div>
                                            </details>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-sm">
                                        {subcat.setupComplete ? (
                                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span>
                                        ) : (
                                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">Draft</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => {
                                              router.push(`/brands/${brandId}/engine-room/categories/${firstRule.subcategory_id}/edit`)
                                            }}
                                            className="text-gray-400 hover:text-gray-600"
                                            title="Edit subcategory"
                                          >
                                            <EditIcon className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => handleDuplicateSubcategory(firstRule.subcategory_id, subcat.subcategoryName)}
                                            className="text-gray-400 hover:text-blue-600"
                                            title="Duplicate subcategory"
                                          >
                                            <DuplicateIcon className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (confirm(`Delete entire subcategory "${subcat.subcategoryName}"? This will permanently delete the subcategory and all ${groupRules.length} occurrence(s), along with any associated drafts and posts.`)) {
                                                handleDeleteSubcategory(firstRule.subcategory_id, subcat.subcategoryName)
                                              }
                                            }}
                                            className="text-gray-400 hover:text-red-600"
                                            title="Delete entire subcategory"
                                          >
                                            <TrashIcon className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                } else if (subcat.regularRule) {
                                  const rule = subcat.regularRule
                                  const freqLabel = rule.frequency === 'daily' ? 'Daily'
                                    : rule.frequency === 'weekly' ? 'Weekly'
                                    : rule.frequency === 'monthly' ? 'Monthly'
                                    : 'Specific Date/Range'

                                  // Build pills for days/dates
                                  let daysDatesPills: React.ReactElement[] = []
                                  
                                  if (rule.frequency === 'weekly' && rule.days_of_week && rule.days_of_week.length) {
                                    daysDatesPills = rule.days_of_week
                                      .map(d => dayNames[d])
                                      .filter(Boolean)
                                      .map((dayName, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                                          {dayName}
                                        </span>
                                      ))
                                  } else if (rule.frequency === 'monthly') {
                                    if (Array.isArray(rule.day_of_month) && rule.day_of_month.length) {
                                      daysDatesPills = rule.day_of_month.map((day, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                                          {formatOrdinal(day)}
                                        </span>
                                      ))
                                    } else if (!Array.isArray(rule.day_of_month) && rule.nth_week && rule.weekday) {
                                      daysDatesPills = [
                                        <span key="0" className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                                          {nthMap[rule.nth_week] || rule.nth_week} {weekdayNames[rule.weekday] || ''}
                                        </span>
                                      ]
                                    }
                                  } else if (rule.frequency === 'daily') {
                                    // For daily, show "Daily" or empty
                                    daysDatesPills = []
                                  }

                                  rows.push(
                                    <tr key={rule.id}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{subcat.subcategoryName}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{SUBCATEGORY_TYPE_LABELS[(rule.subcategories?.subcategory_type as SubcategoryType) || 'other']}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{freqLabel}</td>
                                      <td className="px-6 py-4 text-sm">
                                        <div className="flex flex-wrap gap-2">
                                          {daysDatesPills.length > 0 ? daysDatesPills : <span className="text-gray-400">-</span>}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {subcat.setupComplete ? (
                                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span>
                                        ) : (
                                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">Draft</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => {
                                              router.push(`/brands/${brandId}/engine-room/categories/${rule.subcategory_id}/edit`)
                                            }}
                                            className="text-gray-400 hover:text-gray-600"
                                          >
                                            <EditIcon className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => handleDuplicateSubcategory(rule.subcategory_id, rule.subcategories?.name || 'subcategory')}
                                            className="text-gray-400 hover:text-blue-600"
                                            title="Duplicate subcategory"
                                          >
                                            <DuplicateIcon className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (confirm(`Delete entire subcategory "${rule.subcategories?.name || 'subcategory'}"? This will permanently delete the subcategory and all associated schedule rules, drafts, and posts.`)) {
                                                handleDeleteSubcategory(rule.subcategory_id, rule.subcategories?.name || 'subcategory')
                                              }
                                            }}
                                            className="text-gray-400 hover:text-red-600"
                                            title="Delete entire subcategory"
                                          >
                                            <TrashIcon className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                } else if (subcat.subcategoryWithoutRule) {
                                  const sub = subcat.subcategoryWithoutRule
                                  rows.push(
                                    <tr key={`subcategory-no-rules-${sub.id}`}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{sub.name}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{SUBCATEGORY_TYPE_LABELS[(sub.subcategory_type as SubcategoryType) || 'other']}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">No schedule yet</td>
                                      <td className="px-6 py-4 text-sm text-gray-400">-</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => {
                                              router.push(`/brands/${brandId}/engine-room/categories/${sub.id}/edit`)
                                            }}
                                            className="text-gray-400 hover:text-gray-600"
                                            title="Edit category"
                                          >
                                            <EditIcon className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => handleDuplicateSubcategory(sub.id, sub.name)}
                                            className="text-gray-400 hover:text-blue-600"
                                            title="Duplicate category"
                                          >
                                            <DuplicateIcon className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (confirm(`Delete category "${sub.name}"? This will permanently delete the category and all associated data.`)) {
                                                handleDeleteSubcategory(sub.id, sub.name)
                                              }
                                            }}
                                            className="text-gray-400 hover:text-red-600"
                                            title="Delete category"
                                          >
                                            <TrashIcon className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                }
                              })

                            return { rows, archivedEventCategories }
                          }

                    const { rows, archivedEventCategories } = buildTableData()

                    return (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days / Dates</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {rows}
                            </tbody>
                          </table>
                        </div>

                        {/* Archived Event Categories */}
                        {archivedEventCategories.length > 0 && (
                          <details className="mt-6 px-6 pb-6">
                            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                              View {archivedEventCategories.length} Archived Event {archivedEventCategories.length === 1 ? 'Category' : 'Categories'}
                            </summary>
                            <ul className="mt-4 space-y-3">
                              {archivedEventCategories.map((archived) => (
                                <li key={archived.subcategoryId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                  <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium text-gray-700">{archived.subcategoryName}</span>
                                    <span className="text-xs text-gray-400">Last event: {archived.lastEventDate}</span>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => {
                                        router.push(`/brands/${brandId}/engine-room/categories/${archived.subcategoryId}/edit`)
                                      }}
                                      className="text-gray-400 hover:text-gray-600"
                                      title="Edit category"
                                    >
                                      <EditIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDuplicateSubcategory(archived.subcategoryId, archived.subcategoryName)}
                                      className="text-gray-400 hover:text-blue-600"
                                      title="Duplicate category"
                                    >
                                      <DuplicateIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Delete event category "${archived.subcategoryName}"? This will permanently delete the category and all ${archived.eventRules.length} occurrence(s), along with any associated drafts and posts.`)) {
                                          handleDeleteSubcategory(archived.subcategoryId, archived.subcategoryName)
                                        }
                                      }}
                                      className="text-gray-400 hover:text-red-600"
                                      title="Delete category"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </>
                    )
                  }
                  
                  return (
                    <div className="p-6">
                      <div className="text-center py-12">
                        <p className="text-gray-500">No categories yet. Create one to get started.</p>
                      </div>
                    </div>
                  )
                })()}
                </div>
              </div>
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
          editingSubcategory={editingSubcategory || undefined}
          editingScheduleRule={editingScheduleRule || undefined}
          onSuccess={() => {
            // Close modal and refresh
            setIsSubcategoryModalOpen(false)
            setEditingSubcategory(null)
            setEditingScheduleRule(null)
            // Refresh schedule rules so the Framework Items view updates immediately
            refetchRules()
          }}
        />

      </AppLayout>
    </RequireAuth>
  )
}