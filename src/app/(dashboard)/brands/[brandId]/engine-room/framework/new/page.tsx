'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { SubcategoryType } from '@/types/subcategories'
import { FormField } from '@/components/ui/Form'
import { Input, Textarea } from '@/components/ui/Input'
import { useBrand } from '@/hooks/useBrand'
import { supabase } from '@/lib/supabase-browser'
import { useToast } from '@/components/ui/ToastProvider'
import { normalizeHashtags, parseHashtags } from '@/lib/utils/hashtags'
import { useAssets, Asset } from '@/hooks/assets/useAssets'
import { useUploadAsset } from '@/hooks/assets/useUploadAsset'
import UploadAsset from '@/components/assets/UploadAsset'

// Icons
const ArrowLeftIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ChevronRightIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const CheckIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

type Step = 1 | 2 | 3 | 4

interface StepInfo {
  number: Step
  name: string
}

const STEPS: StepInfo[] = [
  { number: 1, name: 'Type' },
  { number: 2, name: 'Details' },
  { number: 3, name: 'Schedule' },
  { number: 4, name: 'Images' },
]

// Type options for Step 1 (only the 4 main types, excluding 'other' and 'content_series')
const TYPE_OPTIONS: Array<{ value: SubcategoryType; label: string; subtitle: string; examples: string }> = [
  {
    value: 'event_series',
    label: 'Events',
    subtitle: 'Specific dates and occasions',
    examples: 'Fixtures, launches, webinars'
  },
  {
    value: 'service_or_programme',
    label: 'Products / Services',
    subtitle: 'Ongoing offers and programmes',
    examples: 'Memberships, programmes, services'
  },
  {
    value: 'promo_or_offer',
    label: 'Promos',
    subtitle: 'Time-bound sales and offers',
    examples: 'Sales, discounts, special offers'
  },
  {
    value: 'dynamic_schedule',
    label: 'Schedules',
    subtitle: 'Rotating timetables and lineups',
    examples: 'Class timetables, rotating lineups'
  },
]

// Map for quick lookup of type labels
const TYPE_LABEL_MAP: Record<SubcategoryType, string> = {
  event_series: 'Events',
  service_or_programme: 'Products / Services',
  promo_or_offer: 'Promos',
  dynamic_schedule: 'Schedules',
  content_series: 'Content Pillar (legacy)',
  other: 'Other',
  unspecified: 'Other',
}

// Help text for type explainer panel
const TYPE_HELP_TEXT: Record<SubcategoryType, { title: string; body: string }> = {
  event_series: {
    title: "Events",
    body: "Use this for anything with specific dates: fixtures, launches, webinars, workshops or in-person events. You'll add one or more event dates or a recurring pattern below."
  },
  service_or_programme: {
    title: "Products / Services",
    body: "Use this for ongoing offers like memberships, programmes, retainers or recurring services. Ferdy will treat this as something you can talk about at any time."
  },
  promo_or_offer: {
    title: "Promos",
    body: "Use this for time-bound sales, discounts, launches or special offers. You can combine this with dates if the promo has a clear start or end."
  },
  dynamic_schedule: {
    title: "Schedules",
    body: "Use this for classes, timetables, rotating schedules or availability that lives on a URL. Ferdy can pull fresh information from that page when generating posts."
  },
  content_series: {
    title: "Content Pillar (legacy)",
    body: "This was used for recurring content themes like 'Meet the team' or 'Player spotlight'. It's still supported for older setups but not used for new ones."
  },
  other: {
    title: "Other",
    body: "Use this if nothing else fits. Ferdy will use your description and URL to decide the best way to talk about it."
  },
  unspecified: {
    title: "Other",
    body: "Use this if nothing else fits. Ferdy will use your description and URL to decide the best way to talk about it."
  }
}

const CHANNELS = [
  { value: 'instagram', label: 'Instagram Feed' },
  { value: 'instagram_story', label: 'Instagram Story' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn Profile' },
]

type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'specific'

const ALLOWED_FREQUENCIES_BY_TYPE: Record<SubcategoryType, ScheduleFrequency[]> = {
  event_series: ['weekly', 'monthly', 'specific'],
  service_or_programme: ['weekly', 'monthly'],
  promo_or_offer: ['weekly', 'monthly', 'specific'],
  dynamic_schedule: ['daily', 'weekly', 'monthly'],
  content_series: ['weekly', 'monthly'],
  other: ['daily', 'weekly', 'monthly', 'specific'],
  unspecified: ['daily', 'weekly', 'monthly', 'specific'],
}

const getScheduleSectionTitle = (subcategoryType: SubcategoryType | null | undefined): string => {
  const type = subcategoryType || 'other'
  switch (type) {
    case 'event_series':
      return "Event dates & reminders"
    case 'service_or_programme':
      return "When should Ferdy talk about this?"
    case 'promo_or_offer':
      return "When is this promo active?"
    case 'dynamic_schedule':
      return "How often should Ferdy check this schedule?"
    case 'content_series':
      return "How often should this series run?"
    case 'other':
    case 'unspecified':
    default:
      return "Timing & schedule"
  }
}

const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' }
]

const FREQUENCY_LABELS: Record<ScheduleFrequency, { label: string; helper: string }> = {
  daily: {
    label: 'Daily',
    helper: 'Once per day at the time you choose.'
  },
  weekly: {
    label: 'Weekly',
    helper: 'On specific days of the week.'
  },
  monthly: {
    label: 'Monthly',
    helper: 'On a specific day each month.'
  },
  specific: {
    label: 'Specific dates',
    helper: "You'll add each event date separately."
  }
}

type WizardDetails = {
  name: string
  detail: string
  url: string
  defaultHashtags: string
  channels: string[]
}

type WizardSchedule = {
  frequency: ScheduleFrequency | null
  timeOfDay: string
  timezone: string
  daysOfWeek: string[]
  dayOfMonth: number | null
}

export default function NewFrameworkItemWizard() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.brandId as string
  const { brand } = useBrand(brandId)
  
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [subcategoryType, setSubcategoryType] = useState<SubcategoryType | null>(null)
  const [details, setDetails] = useState<WizardDetails>({
    name: '',
    detail: '',
    url: '',
    defaultHashtags: '',
    channels: [],
  })
  const [detailsErrors, setDetailsErrors] = useState<{
    name?: string
    detail?: string
  }>({})
  const [schedule, setSchedule] = useState<WizardSchedule>({
    frequency: null,
    timeOfDay: '',
    timezone: brand?.timezone || 'Pacific/Auckland',
    daysOfWeek: [],
    dayOfMonth: null,
  })
  const [scheduleErrors, setScheduleErrors] = useState<{
    frequency?: string
    timeOfDay?: string
    daysOfWeek?: string
    dayOfMonth?: string
  }>({})
  const [isSaving, setIsSaving] = useState(false)
  const [savedSubcategoryId, setSavedSubcategoryId] = useState<string | null>(null)
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [imageMode, setImageMode] = useState<'upload' | 'existing'>('upload')
  
  const { showToast } = useToast()
  const { assets, loading: assetsLoading, refetch: refetchAssets } = useAssets(brandId)
  const { uploadAsset, uploading: isUploading } = useUploadAsset()

  // Update timezone when brand loads
  useEffect(() => {
    if (brand?.timezone && schedule.timezone === 'Pacific/Auckland') {
      setSchedule(prev => ({ ...prev, timezone: brand.timezone || 'Pacific/Auckland' }))
    }
  }, [brand?.timezone])

  // Refetch assets when entering Step 4
  useEffect(() => {
    if (currentStep === 4) {
      refetchAssets()
    }
  }, [currentStep, refetchAssets])

  const isStep1Valid = !!subcategoryType
  const isStep2Valid =
    details.name.trim().length > 0 &&
    details.detail.trim().length > 0

  const isStep3Valid = (): boolean => {
    if (!schedule.frequency) return false
    
    if (schedule.frequency === 'specific') {
      return true // No extra validation needed for specific
    }
    
    if (schedule.frequency === 'daily') {
      return schedule.timeOfDay.trim().length > 0
    }
    
    if (schedule.frequency === 'weekly') {
      return schedule.timeOfDay.trim().length > 0 && schedule.daysOfWeek.length > 0
    }
    
    if (schedule.frequency === 'monthly') {
      return schedule.timeOfDay.trim().length > 0 && schedule.dayOfMonth !== null && schedule.dayOfMonth >= 1 && schedule.dayOfMonth <= 31
    }
    
    return false
  }

  const canGoNext =
    currentStep === 1 ? isStep1Valid :
    currentStep === 2 ? isStep2Valid :
    currentStep === 3 ? isStep3Valid() :
    currentStep === 4 ? true : // Step 4 has no required fields
    true

  // Helper function to ensure subcategory is saved (used before Step 4)
  const ensureSubcategorySaved = async (): Promise<{ subcategoryId: string } | null> => {
    // If already saved, return the ID
    if (savedSubcategoryId) {
      return { subcategoryId: savedSubcategoryId }
    }

    // Validate all steps 1-3
    if (!isStep1Valid || !isStep2Valid || !isStep3Valid()) {
      // Set errors for invalid steps
      if (!isStep1Valid) {
        showToast({
          title: 'Please select a type',
          description: 'You must choose what kind of framework item this is.',
          variant: 'error'
        })
        return null
      }
      
      if (!isStep2Valid) {
        const newErrors: typeof detailsErrors = {}
        if (!details.name.trim()) newErrors.name = 'Please give this a name.'
        if (!details.detail.trim()) newErrors.detail = 'Please describe this item.'
        setDetailsErrors(newErrors)
        setCurrentStep(2)
        return null
      }
      
      if (!isStep3Valid()) {
        const newErrors: typeof scheduleErrors = {}
        if (!schedule.frequency) {
          newErrors.frequency = 'Please select a frequency.'
        } else if (schedule.frequency === 'daily') {
          if (!schedule.timeOfDay.trim()) {
            newErrors.timeOfDay = 'Please select a time of day.'
          }
        } else if (schedule.frequency === 'weekly') {
          if (!schedule.timeOfDay.trim()) {
            newErrors.timeOfDay = 'Please select a time of day.'
          }
          if (schedule.daysOfWeek.length === 0) {
            newErrors.daysOfWeek = 'Please select at least one day of the week.'
          }
        } else if (schedule.frequency === 'monthly') {
          if (!schedule.timeOfDay.trim()) {
            newErrors.timeOfDay = 'Please select a time of day.'
          }
          if (schedule.dayOfMonth === null || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) {
            newErrors.dayOfMonth = 'Please select a day of the month (1-31).'
          }
        }
        setScheduleErrors(newErrors)
        return null
      }
      return null
    }

    setIsSaving(true)

    try {
      // Parse and normalize hashtags
      const parsedHashtags = parseHashtags(details.defaultHashtags)
      const normalizedHashtags = normalizeHashtags(parsedHashtags)

      // Create subcategory
      console.info('[Wizard] Creating subcategory:', {
        name: details.name,
        hasDetail: !!details.detail,
        hasUrl: !!details.url,
        subcategoryType
      })

      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategories')
        .insert({
          brand_id: brandId,
          category_id: null,
          name: details.name.trim(),
          detail: details.detail.trim(),
          url: details.url.trim() || null,
          default_hashtags: normalizedHashtags,
          channels: details.channels.length > 0 ? details.channels : null,
          subcategory_type: subcategoryType || 'other',
          settings: {}
        })
        .select()
        .single()

      console.info('[Wizard] Subcategory insert response:', { data: subcategoryData, error: subcategoryError })

      if (subcategoryError) {
        console.error('[Wizard] Subcategory insert error:', subcategoryError)
        if (subcategoryError.code === '23505') {
          throw new Error(`A framework item with the name "${details.name}" already exists. Please use a different name.`)
        }
        throw new Error(`Failed to create framework item: ${subcategoryError.message}`)
      }

      const subcategoryId = subcategoryData.id
      setSavedSubcategoryId(subcategoryId)
      console.info('[Wizard] Successfully created subcategory:', subcategoryId)

      // Refresh URL summary if URL is present (fire-and-forget)
      if (details.url && details.url.trim()) {
        fetch(`/api/subcategories/${subcategoryId}/refresh-url-summary`, {
          method: 'POST',
        }).catch(err => {
          console.error('Error initiating URL summary refresh:', err)
        })
      }

      // Create schedule rule if needed (based on type + frequency rules)
      const shouldCreateRule = (() => {
        if (!schedule.frequency) return false
        
        // Event Series: only create rule if NOT specific
        if (subcategoryType === 'event_series') {
          return schedule.frequency !== 'specific'
        }
        
        // Promos: only create rule if NOT specific
        if (subcategoryType === 'promo_or_offer') {
          return schedule.frequency !== 'specific'
        }
        
        // Products/Services, Schedules, Other: always create rule if frequency is set
        return true
      })()

      if (shouldCreateRule && schedule.frequency) {
        // Build schedule rule payload
        const baseRuleData: Record<string, unknown> = {
          brand_id: brandId,
          subcategory_id: subcategoryId,
          category_id: null,
          name: `${details.name.trim()} – ${schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)}`,
          frequency: schedule.frequency,
          channels: details.channels.length > 0 ? details.channels : null,
          is_active: true,
          tone: null,
          hashtag_rule: null,
          image_tag_rule: null
        }

        // Add fields based on frequency type
        if (schedule.frequency === 'daily') {
          baseRuleData.time_of_day = schedule.timeOfDay ? [schedule.timeOfDay] : null
          baseRuleData.timezone = schedule.timezone || brand?.timezone || 'Pacific/Auckland'
        } else if (schedule.frequency === 'weekly') {
          // Map string days to integers (mon -> 1, tue -> 2, etc.)
          const dayMap: Record<string, number> = { 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 7 }
          const mappedDays = schedule.daysOfWeek
            .map(d => dayMap[d] || 0)
            .filter(d => d > 0 && d <= 7)
          baseRuleData.days_of_week = mappedDays.length > 0 ? Array.from(new Set(mappedDays)).sort((a, b) => a - b) : null
          baseRuleData.time_of_day = schedule.timeOfDay ? [schedule.timeOfDay] : null
          baseRuleData.timezone = schedule.timezone || brand?.timezone || 'Pacific/Auckland'
        } else if (schedule.frequency === 'monthly') {
          if (schedule.dayOfMonth !== null && schedule.dayOfMonth >= 1 && schedule.dayOfMonth <= 31) {
            baseRuleData.day_of_month = [schedule.dayOfMonth]
          }
          baseRuleData.time_of_day = schedule.timeOfDay ? [schedule.timeOfDay] : null
          baseRuleData.timezone = schedule.timezone || brand?.timezone || 'Pacific/Auckland'
        }

        // Clean up undefined fields
        const cleanRuleData: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(baseRuleData)) {
          if (value !== undefined) {
            cleanRuleData[key] = value
          }
        }

        console.info('[Wizard] Creating schedule rule:', cleanRuleData)

        const { error: ruleError } = await supabase
          .from('schedule_rules')
          .insert(cleanRuleData)

        if (ruleError) {
          console.error('[Wizard] Schedule rule insert error:', ruleError)
          throw new Error(`Failed to create schedule rule: ${ruleError.message}`)
        }

        console.info('[Wizard] Successfully created schedule rule')
      }

      return { subcategoryId }
    } catch (error) {
      console.error('[Wizard] Error saving framework item:', error)
      showToast({
        title: 'Failed to create framework item',
        description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        variant: 'error'
      })
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const handleNext = async () => {
    // Validate Step 2 before advancing
    if (currentStep === 2) {
      const newErrors: typeof detailsErrors = {}
      if (!details.name.trim()) newErrors.name = 'Please give this a name.'
      if (!details.detail.trim()) newErrors.detail = 'Please describe this item.'
      setDetailsErrors(newErrors)
      if (Object.keys(newErrors).length > 0) return // don't advance
    }

    // On Step 3, save subcategory before advancing to Step 4
    if (currentStep === 3) {
      const result = await ensureSubcategorySaved()
      if (!result) {
        return // Don't advance if save failed
      }
    }

    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step)
    }
  }

  // Handle Step 4 finish - link images to subcategory
  const handleFinish = async () => {
    // Ensure subcategory is saved (defensive check)
    const saveResult = await ensureSubcategorySaved()
    if (!saveResult) {
      return // Error already shown by ensureSubcategorySaved
    }

    const subcategoryId = saveResult.subcategoryId

    // If no images selected, just redirect
    if (selectedAssetIds.length === 0) {
      showToast({
        title: 'Framework item created',
        description: 'You can now add dates and edit details in the Framework Items list.',
        variant: 'success'
      })
      router.push(`/brands/${brandId}/engine-room/categories`)
      return
    }

    setIsSaving(true)

    try {
      // Find the subcategory's tag (should exist due to triggers, but handle gracefully if not)
      let tagId: string | null = null
      
      // First, try to find the tag (it should have been created by the trigger)
      const { data: subcategoryTag, error: tagError } = await supabase
        .from('tags')
        .select('id')
        .eq('brand_id', brandId)
        .eq('name', details.name.trim())
        .eq('kind', 'subcategory')
        .eq('is_active', true)
        .maybeSingle() // Use maybeSingle instead of single to handle not found gracefully

      if (subcategoryTag) {
        tagId = subcategoryTag.id
      } else {
        // Tag doesn't exist yet (trigger might have failed or there's a delay) - create it
        console.warn('[Wizard] Subcategory tag not found, creating it:', tagError)
        const { data: newTag, error: createTagError } = await supabase
          .from('tags')
          .insert({
            brand_id: brandId,
            name: details.name.trim(),
            kind: 'subcategory',
            is_active: true
          })
          .select()
          .single()

        if (createTagError || !newTag) {
          console.error('[Wizard] Failed to create/find subcategory tag:', createTagError)
          throw new Error('Failed to link images to framework item. Images were uploaded but not assigned.')
        }

        tagId = newTag.id
      }

      if (tagId) {
        // Check which assets are already linked
        const { data: existingLinks } = await supabase
          .from('asset_tags')
          .select('asset_id')
          .eq('tag_id', tagId)
          .in('asset_id', selectedAssetIds)

        const existingAssetIds = new Set(existingLinks?.map(link => link.asset_id) || [])
        const newAssetIds = selectedAssetIds.filter(id => !existingAssetIds.has(id))

        if (newAssetIds.length > 0) {
          const assetTagInserts = newAssetIds.map(assetId => ({
            asset_id: assetId,
            tag_id: tagId
          }))

          const { error: linkError } = await supabase
            .from('asset_tags')
            .insert(assetTagInserts)

          if (linkError) {
            console.error('[Wizard] Error linking assets to tag:', linkError)
            throw new Error(`Failed to link images: ${linkError.message}`)
          }
        }

        showToast({
          title: 'Framework item created and images assigned',
          description: 'You can now add dates and edit details in the Framework Items list.',
          variant: 'success'
        })
      } else {
        throw new Error('Failed to find or create subcategory tag')
      }

      router.push(`/brands/${brandId}/engine-room/categories`)
    } catch (error) {
      console.error('[Wizard] Error linking images:', error)
      showToast({
        title: 'Framework item created',
        description: error instanceof Error ? `Images were uploaded but couldn't be linked: ${error.message}. You can manage images from the Content Library.` : 'Images were uploaded but couldn\'t be linked. You can manage images from the Content Library.',
        variant: 'warning'
      })
      router.push(`/brands/${brandId}/engine-room/categories`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
    }
  }

  const handleCancel = () => {
    router.push(`/brands/${brandId}/engine-room/categories`)
  }

  const isStepComplete = (step: Step): boolean => {
    return step < currentStep
  }

  const isCurrentStep = (step: Step): boolean => {
    return step === currentStep
  }

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">
                  Create Framework Item
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Add a new item to your content framework
                </p>
              </div>
            </div>
          </div>

          {/* Progress Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
            <div className="flex items-center justify-between max-w-3xl">
              {STEPS.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                          ${
                            isCurrentStep(step.number)
                              ? 'bg-[#6366F1] text-white'
                              : isStepComplete(step.number)
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }
                        `}
                      >
                        {isStepComplete(step.number) ? (
                          <CheckIcon className="w-5 h-5" />
                        ) : (
                          step.number
                        )}
                      </div>
                      <span
                        className={`
                          mt-2 text-xs font-medium
                          ${
                            isCurrentStep(step.number)
                              ? 'text-[#6366F1]'
                              : isStepComplete(step.number)
                              ? 'text-green-600'
                              : 'text-gray-500'
                          }
                        `}
                      >
                        {step.name}
                      </span>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`
                        flex-1 h-0.5 mx-4
                        ${
                          isStepComplete((index + 2) as Step)
                            ? 'bg-green-500'
                            : 'bg-gray-200'
                        }
                      `}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 lg:px-10 py-6">
            <div className="max-w-4xl">
              {/* Step Container */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                {currentStep === 1 && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-6">
                      Step 1: Select Type
                    </h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Choose the type that best matches your framework item. This tells Ferdy how to structure the posts.
                    </p>

                    {/* Type Selection Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {TYPE_OPTIONS.map((option) => {
                        const isSelected = subcategoryType === option.value
                        return (
                          <button
                            key={option.value}
                            onClick={() => setSubcategoryType(option.value)}
                            className={`
                              relative p-4 rounded-lg border-2 text-left transition-all
                              ${
                                isSelected
                                  ? 'border-[#6366F1] bg-blue-50 shadow-sm'
                                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                              }
                            `}
                          >
                            {isSelected && (
                              <div className="absolute top-3 right-3">
                                <div className="w-6 h-6 rounded-full bg-[#6366F1] flex items-center justify-center">
                                  <CheckIcon className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            )}
                            <div className="pr-8">
                              <h3 className="text-base font-semibold text-gray-900 mb-1">
                                {option.label}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                {option.subtitle}
                              </p>
                              <p className="text-xs text-gray-500">
                                {option.examples}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* Type Explainer Panel */}
                    {subcategoryType && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        {(() => {
                          const helpText = TYPE_HELP_TEXT[subcategoryType]
                          return (
                            <>
                              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                {helpText.title}
                              </h4>
                              <p className="text-sm text-gray-700">
                                {helpText.body}
                              </p>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 2 && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Step 2: Describe the Item
                    </h2>

                    {/* Context: Show selected type */}
                    {subcategoryType && (
                      <p className="text-sm text-gray-600 mb-6">
                        You're setting up a <span className="font-semibold">{TYPE_LABEL_MAP[subcategoryType]}</span>.
                      </p>
                    )}

                    <div className="space-y-6">
                      {/* Name */}
                      <FormField label="Name" required>
                        <Input
                          value={details.name}
                          onChange={(e) => {
                            setDetails(prev => ({ ...prev, name: e.target.value }))
                            // Clear error when user types
                            if (detailsErrors.name) {
                              setDetailsErrors(prev => ({ ...prev, name: undefined }))
                            }
                          }}
                          placeholder="e.g., Weekly Networking Event"
                          error={detailsErrors.name}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Give this framework item a clear name your team will recognise.
                        </p>
                      </FormField>

                      {/* Description */}
                      <FormField label="Description" required>
                        <Textarea
                          value={details.detail}
                          onChange={(e) => {
                            setDetails(prev => ({ ...prev, detail: e.target.value }))
                            // Clear error when user types
                            if (detailsErrors.detail) {
                              setDetailsErrors(prev => ({ ...prev, detail: undefined }))
                            }
                          }}
                          placeholder="Describe what this is and what should be mentioned in posts..."
                          rows={4}
                          error={detailsErrors.detail}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Describe what this is and what should be mentioned in posts.
                        </p>
                      </FormField>

                      {/* URL */}
                      <FormField label="URL (optional)">
                        <Input
                          type="url"
                          value={details.url}
                          onChange={(e) => setDetails(prev => ({ ...prev, url: e.target.value }))}
                          placeholder="https://example.com/event"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          If this has a relevant page (detail, tickets, timetable, etc.), add it here so Ferdy can pull extra context.
                        </p>
                      </FormField>

                      {/* Default Hashtags */}
                      <FormField label="Default hashtags (optional)">
                        <Input
                          value={details.defaultHashtags}
                          onChange={(e) => setDetails(prev => ({ ...prev, defaultHashtags: e.target.value }))}
                          placeholder="brandname, event, networking"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Separate with commas. Ferdy can use these as a base when generating posts.
                        </p>
                      </FormField>

                      {/* Channels */}
                      <FormField label="Channels (optional)">
                        <div className="flex flex-wrap gap-4">
                          {CHANNELS.map((channel) => (
                            <label key={channel.value} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={details.channels.includes(channel.value)}
                                onChange={(e) => {
                                  const newChannels = e.target.checked
                                    ? [...details.channels, channel.value]
                                    : details.channels.filter(c => c !== channel.value)
                                  setDetails(prev => ({ ...prev, channels: newChannels }))
                                }}
                                className="mr-2 w-4 h-4 text-[#6366F1] border-gray-300 rounded focus:ring-[#6366F1]"
                              />
                              <span className="text-sm text-gray-700">{channel.label}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Select which social media channels posts from this item should be published to.
                        </p>
                      </FormField>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Step 3: Timing & Schedule
                    </h2>

                    {/* Context: Show selected type */}
                    {subcategoryType && (
                      <p className="text-sm text-gray-600 mb-6">
                        You're setting the schedule for your{' '}
                        <span className="font-semibold">{TYPE_LABEL_MAP[subcategoryType]}</span>.
                      </p>
                    )}

                    <div className="space-y-6">
                      {/* Schedule Section Title */}
                      <h3 className="text-base font-semibold text-gray-900 mb-4">
                        {getScheduleSectionTitle(subcategoryType)}
                      </h3>

                      {/* Frequency Selector */}
                      <FormField label="Frequency" required>
                        {(() => {
                          const allowedFrequencies = subcategoryType
                            ? ALLOWED_FREQUENCIES_BY_TYPE[subcategoryType]
                            : []
                          
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {allowedFrequencies.map((freq) => {
                                const freqInfo = FREQUENCY_LABELS[freq]
                                const isSelected = schedule.frequency === freq
                                
                                return (
                                  <button
                                    key={freq}
                                    type="button"
                                    onClick={() => {
                                      setSchedule(prev => ({
                                        ...prev,
                                        frequency: freq,
                                        // Reset fields when switching frequencies
                                        daysOfWeek: freq !== 'weekly' ? [] : prev.daysOfWeek,
                                        dayOfMonth: freq !== 'monthly' ? null : prev.dayOfMonth,
                                      }))
                                      // Clear frequency error when selecting
                                      if (scheduleErrors.frequency) {
                                        setScheduleErrors(prev => ({ ...prev, frequency: undefined }))
                                      }
                                    }}
                                    className={`
                                      relative p-4 rounded-lg border-2 text-left transition-all
                                      ${
                                        isSelected
                                          ? 'border-[#6366F1] bg-blue-50 shadow-sm'
                                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                      }
                                    `}
                                  >
                                    {isSelected && (
                                      <div className="absolute top-3 right-3">
                                        <div className="w-5 h-5 rounded-full bg-[#6366F1] flex items-center justify-center">
                                          <CheckIcon className="w-3 h-3 text-white" />
                                        </div>
                                      </div>
                                    )}
                                    <div className="pr-8">
                                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                        {freqInfo.label}
                                      </h4>
                                      <p className="text-xs text-gray-600">
                                        {freqInfo.helper}
                                      </p>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })()}
                        {scheduleErrors.frequency && (
                          <p className="text-red-500 text-sm mt-2">{scheduleErrors.frequency}</p>
                        )}
                      </FormField>

                      {/* Specific dates info panel */}
                      {schedule.frequency === 'specific' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                          <p className="text-sm text-gray-700">
                            You've chosen specific dates. After saving this framework item, you'll add each event date and its URL on the Event Dates section.
                          </p>
                        </div>
                      )}

                      {/* Daily fields */}
                      {schedule.frequency === 'daily' && (
                        <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                          <FormField label="What time should Ferdy post?" required>
                            <Input
                              type="time"
                              value={schedule.timeOfDay}
                              onChange={(e) => {
                                setSchedule(prev => ({ ...prev, timeOfDay: e.target.value }))
                                if (scheduleErrors.timeOfDay) {
                                  setScheduleErrors(prev => ({ ...prev, timeOfDay: undefined }))
                                }
                              }}
                              error={scheduleErrors.timeOfDay}
                            />
                          </FormField>
                          <FormField label="Timezone">
                            <Input
                              type="text"
                              value={schedule.timezone}
                              onChange={(e) => setSchedule(prev => ({ ...prev, timezone: e.target.value }))}
                              placeholder="Pacific/Auckland"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              IANA timezone (e.g., Pacific/Auckland, America/New_York)
                            </p>
                          </FormField>
                        </div>
                      )}

                      {/* Weekly fields */}
                      {schedule.frequency === 'weekly' && (
                        <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                          <FormField label="Days of week" required>
                            <div className="flex flex-wrap gap-2">
                              {DAYS_OF_WEEK.map((day) => (
                                <button
                                  key={day.value}
                                  type="button"
                                  onClick={() => {
                                    const newDays = schedule.daysOfWeek.includes(day.value)
                                      ? schedule.daysOfWeek.filter(d => d !== day.value)
                                      : [...schedule.daysOfWeek, day.value]
                                    // Sort by day order
                                    const dayOrder: Record<string, number> = { 'mon': 0, 'tue': 1, 'wed': 2, 'thu': 3, 'fri': 4, 'sat': 5, 'sun': 6 }
                                    const sortedDays = newDays.sort((a, b) => (dayOrder[a] || 99) - (dayOrder[b] || 99))
                                    setSchedule(prev => ({ ...prev, daysOfWeek: sortedDays }))
                                    if (scheduleErrors.daysOfWeek) {
                                      setScheduleErrors(prev => ({ ...prev, daysOfWeek: undefined }))
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    schedule.daysOfWeek.includes(day.value)
                                      ? 'bg-[#6366F1] text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  {day.label}
                                </button>
                              ))}
                            </div>
                            {scheduleErrors.daysOfWeek && (
                              <p className="text-red-500 text-sm mt-2">{scheduleErrors.daysOfWeek}</p>
                            )}
                          </FormField>
                          <FormField label="What time should Ferdy post?" required>
                            <Input
                              type="time"
                              value={schedule.timeOfDay}
                              onChange={(e) => {
                                setSchedule(prev => ({ ...prev, timeOfDay: e.target.value }))
                                if (scheduleErrors.timeOfDay) {
                                  setScheduleErrors(prev => ({ ...prev, timeOfDay: undefined }))
                                }
                              }}
                              error={scheduleErrors.timeOfDay}
                            />
                          </FormField>
                          <FormField label="Timezone">
                            <Input
                              type="text"
                              value={schedule.timezone}
                              onChange={(e) => setSchedule(prev => ({ ...prev, timezone: e.target.value }))}
                              placeholder="Pacific/Auckland"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              IANA timezone (e.g., Pacific/Auckland, America/New_York)
                            </p>
                          </FormField>
                        </div>
                      )}

                      {/* Monthly fields */}
                      {schedule.frequency === 'monthly' && (
                        <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                          <FormField label="Day of month" required>
                            <select
                              value={schedule.dayOfMonth || ''}
                              onChange={(e) => {
                                const value = e.target.value ? parseInt(e.target.value, 10) : null
                                setSchedule(prev => ({ ...prev, dayOfMonth: value }))
                                if (scheduleErrors.dayOfMonth) {
                                  setScheduleErrors(prev => ({ ...prev, dayOfMonth: undefined }))
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all ${
                                scheduleErrors.dayOfMonth ? 'border-red-300' : 'border-gray-300'
                              }`}
                            >
                              <option value="">Select day</option>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                <option key={day} value={day}>
                                  {day}
                                </option>
                              ))}
                            </select>
                            {scheduleErrors.dayOfMonth && (
                              <p className="text-red-500 text-sm mt-1">{scheduleErrors.dayOfMonth}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Which day of the month should posts go out? (1-31)
                            </p>
                          </FormField>
                          <FormField label="What time should Ferdy post?" required>
                            <Input
                              type="time"
                              value={schedule.timeOfDay}
                              onChange={(e) => {
                                setSchedule(prev => ({ ...prev, timeOfDay: e.target.value }))
                                if (scheduleErrors.timeOfDay) {
                                  setScheduleErrors(prev => ({ ...prev, timeOfDay: undefined }))
                                }
                              }}
                              error={scheduleErrors.timeOfDay}
                            />
                          </FormField>
                          <FormField label="Timezone">
                            <Input
                              type="text"
                              value={schedule.timezone}
                              onChange={(e) => setSchedule(prev => ({ ...prev, timezone: e.target.value }))}
                              placeholder="Pacific/Auckland"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              IANA timezone (e.g., Pacific/Auckland, America/New_York)
                            </p>
                          </FormField>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Step 4: Images
                    </h2>

                    {/* Context */}
                    {subcategoryType && details.name && (
                      <p className="text-sm text-gray-600 mb-6">
                        You're setting up images for: <span className="font-semibold">{details.name}</span>
                      </p>
                    )}

                    {/* Mode Toggle */}
                    <div className="mb-6">
                      <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                        <button
                          type="button"
                          onClick={() => setImageMode('upload')}
                          className={`
                            flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all
                            ${
                              imageMode === 'upload'
                                ? 'bg-white text-[#6366F1] shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }
                          `}
                        >
                          Upload new images
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageMode('existing')}
                          className={`
                            flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all
                            ${
                              imageMode === 'existing'
                                ? 'bg-white text-[#6366F1] shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }
                          `}
                        >
                          Use existing images
                        </button>
                      </div>
                    </div>

                    {/* Upload Mode */}
                    {imageMode === 'upload' && (
                      <div className="space-y-4">
                        <h3 className="text-base font-semibold text-gray-900 mb-2">
                          Upload new images
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Upload images to assign to this framework item. Images will be available in your Content Library.
                        </p>

                        <UploadAsset
                          brandId={brandId}
                          onUploadSuccess={(assetIds) => {
                            setSelectedAssetIds(prev => [...prev, ...assetIds])
                            refetchAssets()
                          }}
                          onUploadError={(error) => {
                            showToast({
                              title: 'Upload failed',
                              description: error,
                              variant: 'error'
                            })
                          }}
                        />

                        {/* Show uploaded assets in this session */}
                        {selectedAssetIds.length > 0 && (
                          <div className="mt-6">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">
                              Currently assigned images: {selectedAssetIds.length}
                            </h4>
                            <div className="grid grid-cols-4 gap-4">
                              {assets
                                .filter(asset => selectedAssetIds.includes(asset.id))
                                .map(asset => (
                                  <div
                                    key={asset.id}
                                    className="relative group border-2 border-[#6366F1] rounded-lg overflow-hidden"
                                  >
                                    {asset.signed_url ? (
                                      <img
                                        src={asset.signed_url}
                                        alt={asset.title}
                                        className="w-full h-32 object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                        Loading...
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAssetIds(prev => prev.filter(id => id !== asset.id))}
                                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Existing Images Mode */}
                    {imageMode === 'existing' && (
                      <div className="space-y-4">
                        <h3 className="text-base font-semibold text-gray-900 mb-2">
                          Choose from existing images
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Select images from your Content Library to assign to this framework item.
                        </p>

                        {assetsLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
                          </div>
                        ) : assets.length === 0 ? (
                          <p className="text-sm text-gray-500 py-8 text-center">
                            No images available yet. Upload some images to get started.
                          </p>
                        ) : (
                          <div className="grid grid-cols-4 gap-4">
                            {assets.map(asset => {
                              const isSelected = selectedAssetIds.includes(asset.id)
                              return (
                                <button
                                  key={asset.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedAssetIds(prev => prev.filter(id => id !== asset.id))
                                    } else {
                                      setSelectedAssetIds(prev => [...prev, asset.id])
                                    }
                                  }}
                                  className={`
                                    relative group border-2 rounded-lg overflow-hidden transition-all
                                    ${
                                      isSelected
                                        ? 'border-[#6366F1] ring-2 ring-[#6366F1] ring-opacity-20'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }
                                  `}
                                >
                                  {asset.signed_url ? (
                                    <img
                                      src={asset.signed_url}
                                      alt={asset.title}
                                      className="w-full h-32 object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                      Loading...
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute top-2 right-2 w-6 h-6 bg-[#6366F1] text-white rounded-full flex items-center justify-center">
                                      <CheckIcon className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
                                    {asset.title}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {selectedAssetIds.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Currently assigned images: <span className="font-semibold">{selectedAssetIds.length}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-3">
                  {currentStep > 1 && (
                    <button
                      onClick={handleBack}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ArrowLeftIcon className="w-4 h-4 mr-2" />
                      Back
                    </button>
                  )}
                  {currentStep < 3 ? (
                    <button
                      onClick={handleNext}
                      disabled={!canGoNext}
                      className={`
                        inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                        ${
                          canGoNext
                            ? 'bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white hover:from-[#4F46E5] hover:to-[#4338CA]'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      Next
                      <ChevronRightIcon className="w-4 h-4 ml-2" />
                    </button>
                  ) : currentStep === 3 ? (
                    <button
                      onClick={handleNext}
                      disabled={!canGoNext || isSaving}
                      className={`
                        inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                        ${
                          canGoNext && !isSaving
                            ? 'bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white hover:from-[#4F46E5] hover:to-[#4338CA]'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      {isSaving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Next: Images
                          <ChevronRightIcon className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleFinish}
                      disabled={isSaving}
                      className={`
                        inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                        ${
                          !isSaving
                            ? 'bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white hover:from-[#4F46E5] hover:to-[#4338CA]'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      {isSaving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Finish
                          <ChevronRightIcon className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}

