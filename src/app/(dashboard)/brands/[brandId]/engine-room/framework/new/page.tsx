'use client'

import React, { useState, useEffect, useRef } from 'react'
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

type EventOccurrenceInput = {
  id?: string
  // Single date mode
  date?: string // 'YYYY-MM-DD'
  time?: string // 'HH:mm' or ''
  // Range mode
  start_date?: string // 'YYYY-MM-DD'
  end_date?: string // 'YYYY-MM-DD'
  // Common fields
  url?: string
  notes?: string
  summary?: any // URL summary data (from refreshUrlSummary)
}

type EventSchedulingState = {
  occurrences: EventOccurrenceInput[]
  daysBefore: number[] // e.g. [7, 3, 1]
}

interface WizardInitialData {
  subcategory?: {
    id: string
    name: string
    detail: string
    url: string
    default_hashtags: string[]
    channels: string[]
    subcategory_type: SubcategoryType
    settings?: any
  }
  scheduleRule?: {
    frequency: ScheduleFrequency
    time_of_day: string | string[] | null
    days_of_week: number[] | null
    day_of_month: number | number[] | null
    nth_week?: number | null
    weekday?: number | null
    timezone: string
    days_before: number[] | null
    days_during: number[] | null
    start_date?: string | null
    end_date?: string | null
  }
  eventOccurrences?: Array<{
    id: string
    starts_at: string
    end_at?: string | null
    url?: string | null
    notes?: string | null
    summary?: any
  }>
  assets?: string[] // Asset IDs
  eventOccurrenceType?: 'single' | 'range'
}

export interface WizardInitialData {
  subcategory?: {
    id: string
    name: string
    detail: string
    url: string
    default_hashtags: string[]
    channels: string[]
    subcategory_type: SubcategoryType
    settings?: any
  }
  scheduleRule?: {
    frequency: ScheduleFrequency
    time_of_day: string | string[] | null
    days_of_week: number[] | null
    day_of_month: number | number[] | null
    nth_week?: number | null
    weekday?: number | null
    timezone: string
    days_before: number[] | null
    days_during: number[] | null
    start_date?: string | null
    end_date?: string | null
  }
  eventOccurrences?: Array<{
    id: string
    starts_at: string
    end_at?: string | null
    url?: string | null
    notes?: string | null
    summary?: any
  }>
  assets?: string[] // Asset IDs
  eventOccurrenceType?: 'single' | 'range'
}

interface WizardProps {
  mode?: 'create' | 'edit'
  initialData?: WizardInitialData
}

export default function NewFrameworkItemWizard(props?: WizardProps) {
  const { mode = 'create', initialData } = props || {}
  const params = useParams()
  const router = useRouter()
  const brandId = params.brandId as string
  const { brand } = useBrand(brandId)
  
  const [currentStep, setCurrentStep] = useState<Step>(1)
  
  // Initialize subcategory type from initialData in edit mode
  const [subcategoryType, setSubcategoryType] = useState<SubcategoryType | null>(
    mode === 'edit' && initialData?.subcategory?.subcategory_type ? initialData.subcategory.subcategory_type : null
  )
  
  // Initialize details from initialData in edit mode
  const [details, setDetails] = useState<WizardDetails>(() => {
    if (mode === 'edit' && initialData?.subcategory) {
      return {
        name: initialData.subcategory.name || '',
        detail: initialData.subcategory.detail || '',
        url: initialData.subcategory.url || '',
        defaultHashtags: (initialData.subcategory.default_hashtags || []).join(', '),
        channels: initialData.subcategory.channels || [],
      }
    }
    return {
      name: '',
      detail: '',
      url: '',
      defaultHashtags: '',
      channels: [],
    }
  })
  
  const [detailsErrors, setDetailsErrors] = useState<{
    name?: string
    detail?: string
  }>({})
  
  // Initialize schedule from initialData in edit mode
  const [schedule, setSchedule] = useState<WizardSchedule>(() => {
    if (mode === 'edit' && initialData?.scheduleRule) {
      const rule = initialData.scheduleRule
      const timesArray = rule.time_of_day 
        ? (Array.isArray(rule.time_of_day) ? rule.time_of_day : [rule.time_of_day])
        : []
      const daysOfWeek = (rule.days_of_week || []).map(d => {
        const dayMap: Record<number, string> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 7: 'sun' }
        return dayMap[d] || ''
      }).filter(Boolean)
      
      return {
        frequency: rule.frequency || null,
        timeOfDay: timesArray[0] || '',
        timezone: rule.timezone || brand?.timezone || 'Pacific/Auckland',
        daysOfWeek: daysOfWeek,
        dayOfMonth: Array.isArray(rule.day_of_month) ? rule.day_of_month[0] : (rule.day_of_month || null),
      }
    }
    return {
      frequency: null,
      timeOfDay: '',
      timezone: brand?.timezone || 'Pacific/Auckland',
      daysOfWeek: [],
      dayOfMonth: null,
    }
  })
  
  const [scheduleErrors, setScheduleErrors] = useState<{
    frequency?: string
    timeOfDay?: string
    daysOfWeek?: string
    dayOfMonth?: string
  }>({})
  
  // Initialize event occurrence type from initialData in edit mode
  const [eventOccurrenceType, setEventOccurrenceType] = useState<'single' | 'range'>(
    mode === 'edit' && initialData?.eventOccurrenceType ? initialData.eventOccurrenceType : 'single'
  )
  
  // Initialize event scheduling from initialData in edit mode
  const [eventScheduling, setEventScheduling] = useState<EventSchedulingState>(() => {
    if (mode === 'edit' && initialData) {
      const occurrences: EventOccurrenceInput[] = []
      let daysBefore: number[] = []
      
      // Extract daysBefore from scheduleRule
      if (initialData.scheduleRule?.days_before) {
        daysBefore = initialData.scheduleRule.days_before
      }
      
      // Convert event_occurrences to EventOccurrenceInput format
      if (initialData.eventOccurrences && initialData.eventOccurrences.length > 0) {
        const occurrenceType = initialData.eventOccurrenceType || 'single'
        
        initialData.eventOccurrences.forEach(occ => {
          if (occurrenceType === 'single') {
            // Single mode: extract date and time from starts_at
            const startsAtDate = new Date(occ.starts_at)
            const dateStr = startsAtDate.toISOString().split('T')[0] // YYYY-MM-DD
            const timeStr = startsAtDate.toTimeString().split(' ')[0].slice(0, 5) // HH:mm
            
            occurrences.push({
              id: occ.id,
              date: dateStr,
              time: timeStr,
              url: occ.url || undefined,
              notes: occ.notes || undefined,
              summary: occ.summary || undefined
            })
          } else {
            // Range mode: extract start_date and end_date
            const startsAtDate = new Date(occ.starts_at)
            const startDateStr = startsAtDate.toISOString().split('T')[0] // YYYY-MM-DD
            
            let endDateStr: string | undefined
            if (occ.end_at) {
              const endAtDate = new Date(occ.end_at)
              endDateStr = endAtDate.toISOString().split('T')[0] // YYYY-MM-DD
            }
            
            occurrences.push({
              id: occ.id,
              start_date: startDateStr,
              end_date: endDateStr,
              url: occ.url || undefined,
              notes: occ.notes || undefined,
              summary: occ.summary || undefined
            })
          }
        })
      }
      
      return {
        occurrences,
        daysBefore
      }
    }
    return {
      occurrences: [],
      daysBefore: []
    }
  })
  const [eventErrors, setEventErrors] = useState<{
    occurrences?: string
    leadTimes?: string
  }>({})
  // Initialize leadTimesInput from initialData in edit mode
  const [leadTimesInput, setLeadTimesInput] = useState<string>(() => {
    if (mode === 'edit' && initialData?.scheduleRule?.days_before && initialData.scheduleRule.days_before.length > 0) {
      return initialData.scheduleRule.days_before.join(', ')
    }
    return '7, 3, 1'
  })
  
  // Reset occurrences when switching occurrence type (but not in edit mode on mount)
  useEffect(() => {
    if (subcategoryType === 'event_series' && mode === 'create') {
      setEventScheduling(prev => ({ ...prev, occurrences: [] }))
      setEventErrors({})
    }
  }, [eventOccurrenceType, subcategoryType, mode])
  const occurrenceRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Initialize daysBefore from leadTimesInput when component mounts or switching to Events type
  useEffect(() => {
    if (subcategoryType === 'event_series' && eventScheduling.daysBefore.length === 0) {
      const parsed = parseLeadTimes(leadTimesInput)
      if (parsed.length > 0) {
        setEventScheduling(prev => ({
          ...prev,
          daysBefore: parsed
        }))
      }
    }
  }, [subcategoryType, leadTimesInput])
  const [isSaving, setIsSaving] = useState(false)
  const [savedSubcategoryId, setSavedSubcategoryId] = useState<string | null>(
    mode === 'edit' && initialData?.subcategory?.id ? initialData.subcategory.id : null
  )
  // Initialize selectedAssetIds from initialData in edit mode
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(
    mode === 'edit' && initialData?.assets ? initialData.assets : []
  )
  const [imageMode, setImageMode] = useState<'upload' | 'existing'>(() => {
    // In edit mode, if we have existing assets, default to 'existing' mode
    if (mode === 'edit' && initialData?.assets && initialData.assets.length > 0) {
      return 'existing'
    }
    return 'upload'
  })
  
  const { showToast } = useToast()
  const { assets, loading: assetsLoading, refetch: refetchAssets } = useAssets(brandId)
  const { uploadAsset, uploading: isUploading } = useUploadAsset()

  // Update timezone when brand loads
  useEffect(() => {
    if (brand?.timezone && schedule.timezone === 'Pacific/Auckland') {
      setSchedule(prev => ({ ...prev, timezone: brand.timezone || 'Pacific/Auckland' }))
    }
  }, [brand?.timezone])

  // Note: Assets are automatically loaded by useAssets hook when brandId is available.
  // We intentionally reuse the same hook and pattern as Content Library to keep
  // behavior consistent and avoid duplication. Assets will load once on mount
  // and refetch automatically when brandId changes - no need to refetch on step changes.

  const isStep1Valid = !!subcategoryType
  const isStep2Valid =
    details.name.trim().length > 0 &&
    details.detail.trim().length > 0

  // Helper to parse lead times from input string
  const parseLeadTimes = (input: string): number[] => {
    if (!input.trim()) return []
    return input
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => parseInt(s, 10))
      .filter(n => !isNaN(n) && n > 0)
  }

  // Update daysBefore when leadTimesInput changes (only for Events)
  useEffect(() => {
    if (subcategoryType === 'event_series') {
      const parsed = parseLeadTimes(leadTimesInput)
      setEventScheduling(prev => {
        // Only update if different to avoid unnecessary re-renders
        if (JSON.stringify(prev.daysBefore.sort()) !== JSON.stringify(parsed.sort())) {
          return {
            ...prev,
            daysBefore: parsed
          }
        }
        return prev
      })
    }
  }, [leadTimesInput, subcategoryType])

  const isStep3Valid = (): boolean => {
    // Events use a different validation flow
    if (subcategoryType === 'event_series') {
      // Must have at least one occurrence
      if (eventScheduling.occurrences.length === 0) {
        return false
      }
      
      // Validate based on occurrence type
      if (eventOccurrenceType === 'single') {
        // Single mode: date + time required
        return eventScheduling.occurrences.every(
          occ => occ.date && occ.date.trim().length > 0 && occ.time && occ.time.trim().length > 0
        )
      } else {
        // Range mode: start_date + end_date required
        return eventScheduling.occurrences.every(
          occ => occ.start_date && occ.start_date.trim().length > 0 && occ.end_date && occ.end_date.trim().length > 0
        )
      }
    }
    
    // Other types use the standard schedule validation
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
    // In edit mode, just return the existing ID (no saving needed for now)
    if (mode === 'edit' && savedSubcategoryId) {
      return { subcategoryId: savedSubcategoryId }
    }
    
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
          message: 'You must choose what kind of category this is.',
          type: 'error'
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
        // Events validation
        if (subcategoryType === 'event_series') {
          const newErrors: typeof eventErrors = {}
          if (eventScheduling.occurrences.length === 0) {
            newErrors.occurrences = 'Please add at least one event occurrence.'
          } else {
            if (eventOccurrenceType === 'single') {
              const missingDates = eventScheduling.occurrences.filter(occ => !occ.date || !occ.date.trim())
              const missingTimes = eventScheduling.occurrences.filter(occ => !occ.time || !occ.time.trim())
              if (missingDates.length > 0) {
                newErrors.occurrences = 'All occurrences must have a date.'
              } else if (missingTimes.length > 0) {
                newErrors.occurrences = 'All occurrences must have a time.'
              }
            } else {
              // Range mode
              const missingStartDates = eventScheduling.occurrences.filter(occ => !occ.start_date || !occ.start_date.trim())
              const missingEndDates = eventScheduling.occurrences.filter(occ => !occ.end_date || !occ.end_date.trim())
              if (missingStartDates.length > 0) {
                newErrors.occurrences = 'All occurrences must have a start date.'
              } else if (missingEndDates.length > 0) {
                newErrors.occurrences = 'All occurrences must have an end date.'
              }
            }
          }
          setEventErrors(newErrors)
          return null
        }
        
        // Other types validation
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
          throw new Error(`A category with the name "${details.name}" already exists. Please use a different name.`)
        }
        throw new Error(`Failed to create category: ${subcategoryError.message}`)
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

      // Handle Events: Create schedule rule with frequency='specific' and days_before
      if (subcategoryType === 'event_series') {
        // Create schedule rule for Events
        const eventRuleData: Record<string, unknown> = {
          brand_id: brandId,
          subcategory_id: subcategoryId,
          category_id: null,
          name: `${details.name.trim()} – Specific Events`,
          frequency: 'specific',
          days_before: eventScheduling.daysBefore.length > 0 ? eventScheduling.daysBefore : null,
          days_during: eventOccurrenceType === 'range' ? null : null, // Can be set in future, but null for now
          channels: details.channels.length > 0 ? details.channels : null,
          is_active: true,
          tone: null,
          hashtag_rule: null,
          image_tag_rule: null
        }

        console.info('[Wizard] Creating schedule rule for Events:', eventRuleData)

        const { error: eventRuleError } = await supabase
          .from('schedule_rules')
          .insert(eventRuleData)

        if (eventRuleError) {
          console.error('[Wizard] Schedule rule insert error for Events:', eventRuleError)
          throw new Error(`Failed to create schedule rule: ${eventRuleError.message}`)
        }

        console.info('[Wizard] Successfully created schedule rule for Events')

        // Create event_occurrences for each occurrence
        const occurrencesToInsert = await Promise.all(
          eventScheduling.occurrences.map(async (occurrence) => {
            let startsAt: string
            let endAt: string | null = null
            
            if (eventOccurrenceType === 'single') {
              // Single mode: date + time into starts_at, end_at = null
              const dateStr = occurrence.date!.trim()
              const timeStr = occurrence.time!.trim() // Required, validated
              const dateTimeStr = `${dateStr}T${timeStr}:00`
              startsAt = new Date(dateTimeStr).toISOString()
              // end_at remains null for single dates
            } else {
              // Range mode: start_date at 00:00, end_date at 23:59
              const startDateStr = occurrence.start_date!.trim()
              const endDateStr = occurrence.end_date!.trim()
              
              // Start at 00:00 local time
              const startDateTimeStr = `${startDateStr}T00:00:00`
              startsAt = new Date(startDateTimeStr).toISOString()
              
              // End at 23:59:59 local time
              const endDateTimeStr = `${endDateStr}T23:59:59`
              endAt = new Date(endDateTimeStr).toISOString()
            }

            // Determine URL: use occurrence URL if provided, else fallback to category URL
            const finalUrl = occurrence.url?.trim() || details.url.trim() || null

            // Extract URL summary if URL exists
            // We'll fetch summaries in parallel but don't block on failures
            let summary: any = null
            if (finalUrl) {
              try {
                const summaryResponse = await fetch(`/api/extract-url-summary?url=${encodeURIComponent(finalUrl)}`)
                if (summaryResponse.ok) {
                  const summaryData = await summaryResponse.json()
                  summary = summaryData
                } else {
                  console.warn('[Wizard] URL summary extraction returned non-OK status:', summaryResponse.status)
                }
              } catch (err) {
                console.error('[Wizard] Error extracting URL summary for occurrence:', err)
                // Continue without summary if extraction fails
              }
            }

            return {
              subcategory_id: subcategoryId,
              starts_at: startsAt,
              end_at: endAt,
              url: finalUrl,
              notes: occurrence.notes?.trim() || null,
              summary: summary ? JSON.stringify(summary) : null
            }
          })
        )

        console.info('[Wizard] Creating event_occurrences:', occurrencesToInsert.length)

        const { error: occurrencesError } = await supabase
          .from('event_occurrences')
          .insert(occurrencesToInsert)

        if (occurrencesError) {
          console.error('[Wizard] Event occurrences insert error:', occurrencesError)
          throw new Error(`Failed to create event occurrences: ${occurrencesError.message}`)
        }

        console.info('[Wizard] Successfully created event_occurrences')
      }

      // Create schedule rule if needed (based on type + frequency rules) - for non-Events
      const shouldCreateRule = (() => {
        if (!schedule.frequency) return false
        
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
      console.error('[Wizard] Error saving category:', error)
      showToast({
        title: 'Failed to create category',
        message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        type: 'error'
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
    // In edit mode, save logic is not wired yet
    if (mode === 'edit') {
      console.log('Edit submit not wired yet')
      return
    }

    // Ensure subcategory is saved (defensive check)
    const saveResult = await ensureSubcategorySaved()
    if (!saveResult) {
      return // Error already shown by ensureSubcategorySaved
    }

    const subcategoryId = saveResult.subcategoryId

    // If no images selected, just redirect
    if (selectedAssetIds.length === 0) {
      showToast({
        title: 'Category created',
        message: 'You can now add dates and edit details in the Categories list.',
        type: 'success'
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
          throw new Error('Failed to link images to category. Images were uploaded but not assigned.')
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
          title: 'Category created and images assigned',
          message: 'You can now add dates and edit details in the Categories list.',
          type: 'success'
        })
      } else {
        throw new Error('Failed to find or create subcategory tag')
      }

      router.push(`/brands/${brandId}/engine-room/categories`)
    } catch (error) {
      console.error('[Wizard] Error linking images:', error)
      showToast({
        title: 'Category created',
        message: error instanceof Error ? `Images were uploaded but couldn't be linked: ${error.message}. You can manage images from the Content Library.` : 'Images were uploaded but couldn\'t be linked. You can manage images from the Content Library.',
        type: 'error'
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
                  {mode === 'edit' ? 'Edit Category' : 'Create Category'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {mode === 'edit' ? 'Update your category details' : 'Add a new item to your content framework'}
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
                      Choose the type that best matches your category. This tells Ferdy how to structure the posts.
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
                      {/* Occurrence Type Selector (Events only) */}
                      {subcategoryType === 'event_series' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            How should occurrences be structured?
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setEventOccurrenceType('single')}
                              className={`
                                relative p-4 rounded-lg border-2 text-left transition-all
                                ${
                                  eventOccurrenceType === 'single'
                                    ? 'border-[#6366F1] bg-white shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }
                              `}
                            >
                              {eventOccurrenceType === 'single' && (
                                <div className="absolute top-3 right-3">
                                  <div className="w-5 h-5 rounded-full bg-[#6366F1] flex items-center justify-center">
                                    <CheckIcon className="w-3 h-3 text-white" />
                                  </div>
                                </div>
                              )}
                              <div className="pr-8">
                                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                  Single dates
                                </h4>
                                <p className="text-xs text-gray-600">
                                  One specific day + time per occurrence
                                </p>
                              </div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => setEventOccurrenceType('range')}
                              className={`
                                relative p-4 rounded-lg border-2 text-left transition-all
                                ${
                                  eventOccurrenceType === 'range'
                                    ? 'border-[#6366F1] bg-white shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }
                              `}
                            >
                              {eventOccurrenceType === 'range' && (
                                <div className="absolute top-3 right-3">
                                  <div className="w-5 h-5 rounded-full bg-[#6366F1] flex items-center justify-center">
                                    <CheckIcon className="w-3 h-3 text-white" />
                                  </div>
                                </div>
                              )}
                              <div className="pr-8">
                                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                  Date ranges
                                </h4>
                                <p className="text-xs text-gray-600">
                                  Multi-day period (start + end date)
                                </p>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                      
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
                          Give this category a clear name your team will recognise.
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
                      Step 3: {subcategoryType === 'event_series' ? 'Event Occurrences' : 'Timing & Schedule'}
                    </h2>

                    {/* Context: Show selected type */}
                    {subcategoryType && (
                      <p className="text-sm text-gray-600 mb-6">
                        You're setting the schedule for your{' '}
                        <span className="font-semibold">{TYPE_LABEL_MAP[subcategoryType]}</span>.
                      </p>
                    )}

                    {/* Events: Show occurrences manager */}
                    {subcategoryType === 'event_series' ? (
                      <div className="space-y-6">
                        {/* Occurrences List */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-base font-semibold text-gray-900">
                                Event Dates
                                {(() => {
                                  const now = new Date()
                                  const upcomingCount = eventScheduling.occurrences.filter(occ => {
                                    if (eventOccurrenceType === 'single') {
                                      if (!occ.date || !occ.date.trim()) return false
                                      const occDate = new Date(occ.date + (occ.time ? `T${occ.time}` : 'T12:00'))
                                      return occDate >= now
                                    } else {
                                      // Range mode: check if end_date is in the future
                                      if (!occ.end_date || !occ.end_date.trim()) return false
                                      const endDate = new Date(occ.end_date + 'T23:59:59')
                                      return endDate >= now
                                    }
                                  }).length
                                  return upcomingCount > 0 ? ` (${upcomingCount} upcoming)` : ''
                                })()}
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newOccurrence: EventOccurrenceInput = eventOccurrenceType === 'single'
                                  ? {
                                      date: '',
                                      time: '',
                                      url: '',
                                      notes: ''
                                    }
                                  : {
                                      start_date: '',
                                      end_date: '',
                                      url: '',
                                      notes: ''
                                    }
                                const newIndex = eventScheduling.occurrences.length
                                setEventScheduling(prev => ({
                                  ...prev,
                                  occurrences: [...prev.occurrences, newOccurrence]
                                }))
                                // Clear errors when adding
                                if (eventErrors.occurrences) {
                                  setEventErrors(prev => ({ ...prev, occurrences: undefined }))
                                }
                                // Scroll into view and focus after state update
                                setTimeout(() => {
                                  const cardRef = occurrenceRefs.current.get(newIndex)
                                  if (cardRef) {
                                    cardRef.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                                    // Focus the first date input
                                    const dateInput = cardRef.querySelector<HTMLInputElement>('input[type="date"]')
                                    if (dateInput) {
                                      dateInput.focus()
                                    }
                                  }
                                }, 100)
                              }}
                              className="px-4 py-2 text-sm font-medium text-[#6366F1] bg-white border border-[#6366F1] rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              + Add occurrence
                            </button>
                          </div>
                          
                          {eventScheduling.occurrences.length === 0 ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                              <p className="text-sm text-gray-600 mb-2">
                                No occurrences added yet. Click "Add occurrence" to get started.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {eventScheduling.occurrences.map((occurrence, index) => (
                                <div
                                  key={occurrence.id || index}
                                  ref={(el) => {
                                    if (el) {
                                      occurrenceRefs.current.set(index, el)
                                    } else {
                                      occurrenceRefs.current.delete(index)
                                    }
                                  }}
                                  className="bg-white border-2 border-gray-200 rounded-lg p-4 space-y-4"
                                >
                                  <div className="flex items-start justify-between">
                                    <h4 className="text-sm font-semibold text-gray-900">
                                      Occurrence {index + 1}
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEventScheduling(prev => ({
                                          ...prev,
                                          occurrences: prev.occurrences.filter((_, i) => i !== index)
                                        }))
                                      }}
                                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  
                                  {eventOccurrenceType === 'single' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Date - Required */}
                                      <FormField label="Date" required>
                                        <Input
                                          type="date"
                                          value={occurrence.date || ''}
                                          onChange={(e) => {
                                            const updated = [...eventScheduling.occurrences]
                                            updated[index] = { ...updated[index], date: e.target.value }
                                            setEventScheduling(prev => ({ ...prev, occurrences: updated }))
                                            if (eventErrors.occurrences) {
                                              setEventErrors(prev => ({ ...prev, occurrences: undefined }))
                                            }
                                          }}
                                          error={eventErrors.occurrences && (!occurrence.date || !occurrence.date.trim()) ? 'Date is required' : undefined}
                                        />
                                      </FormField>
                                      
                                      {/* Time - Required */}
                                      <FormField label="Time" required>
                                        <Input
                                          type="time"
                                          value={occurrence.time || ''}
                                          onChange={(e) => {
                                            const updated = [...eventScheduling.occurrences]
                                            updated[index] = { ...updated[index], time: e.target.value }
                                            setEventScheduling(prev => ({ ...prev, occurrences: updated }))
                                            if (eventErrors.occurrences) {
                                              setEventErrors(prev => ({ ...prev, occurrences: undefined }))
                                            }
                                          }}
                                          error={eventErrors.occurrences && (!occurrence.time || !occurrence.time.trim()) ? 'Time is required' : undefined}
                                        />
                                      </FormField>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Start Date - Required */}
                                      <FormField label="Start Date" required>
                                        <Input
                                          type="date"
                                          value={occurrence.start_date || ''}
                                          onChange={(e) => {
                                            const updated = [...eventScheduling.occurrences]
                                            updated[index] = { ...updated[index], start_date: e.target.value }
                                            setEventScheduling(prev => ({ ...prev, occurrences: updated }))
                                            if (eventErrors.occurrences) {
                                              setEventErrors(prev => ({ ...prev, occurrences: undefined }))
                                            }
                                          }}
                                          error={eventErrors.occurrences && (!occurrence.start_date || !occurrence.start_date.trim()) ? 'Start date is required' : undefined}
                                        />
                                      </FormField>
                                      
                                      {/* End Date - Required */}
                                      <FormField label="End Date" required>
                                        <Input
                                          type="date"
                                          value={occurrence.end_date || ''}
                                          onChange={(e) => {
                                            const updated = [...eventScheduling.occurrences]
                                            updated[index] = { ...updated[index], end_date: e.target.value }
                                            setEventScheduling(prev => ({ ...prev, occurrences: updated }))
                                            if (eventErrors.occurrences) {
                                              setEventErrors(prev => ({ ...prev, occurrences: undefined }))
                                            }
                                          }}
                                          error={eventErrors.occurrences && (!occurrence.end_date || !occurrence.end_date.trim()) ? 'End date is required' : undefined}
                                        />
                                      </FormField>
                                    </div>
                                  )}
                                  
                                  {/* URL - Optional */}
                                  <FormField label="URL (optional)">
                                    <Input
                                      type="url"
                                      value={occurrence.url || ''}
                                      onChange={(e) => {
                                        const updated = [...eventScheduling.occurrences]
                                        updated[index] = { ...updated[index], url: e.target.value }
                                        setEventScheduling(prev => ({ ...prev, occurrences: updated }))
                                      }}
                                      placeholder="https://example.com/event"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      Event-specific URL. If empty, will use the category URL.
                                    </p>
                                  </FormField>
                                  
                                  {/* Notes - Optional */}
                                  <FormField label="Notes (optional)">
                                    <Textarea
                                      value={occurrence.notes || ''}
                                      onChange={(e) => {
                                        const updated = [...eventScheduling.occurrences]
                                        updated[index] = { ...updated[index], notes: e.target.value }
                                        setEventScheduling(prev => ({ ...prev, occurrences: updated }))
                                      }}
                                      placeholder="Additional notes about this occurrence..."
                                      rows={2}
                                    />
                                  </FormField>
                                  
                                  {/* URL Summary Preview */}
                                  {occurrence.summary && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                                      <p className="font-medium text-gray-900 mb-2">URL Summary:</p>
                                      {occurrence.summary.details && (
                                        <div className="space-y-1 text-gray-700">
                                          {occurrence.summary.details.venue && (
                                            <p><strong>Venue:</strong> {occurrence.summary.details.venue}</p>
                                          )}
                                          {occurrence.summary.details.date && (
                                            <p><strong>Date:</strong> {occurrence.summary.details.date}</p>
                                          )}
                                          {occurrence.summary.details.time && (
                                            <p><strong>Time:</strong> {occurrence.summary.details.time}</p>
                                          )}
                                          {occurrence.summary.details.price && (
                                            <p><strong>Price:</strong> {occurrence.summary.details.price}</p>
                                          )}
                                          {occurrence.summary.details.format && (
                                            <p><strong>Format:</strong> {occurrence.summary.details.format}</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {eventErrors.occurrences && (
                            <p className="text-red-500 text-sm mt-2">{eventErrors.occurrences}</p>
                          )}
                        </div>
                        
                        {/* Lead-time Input */}
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 mb-3">
                            Lead-time Reminders
                          </h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Specify how many days before each event Ferdy should post reminders.
                          </p>
                          <FormField label="Default lead times (days before event)">
                            <Input
                              type="text"
                              value={leadTimesInput}
                              onChange={(e) => {
                                const value = e.target.value
                                setLeadTimesInput(value)
                                // Validate inline
                                const parsed = parseLeadTimes(value)
                                const hasInvalidChars = value.split(',').some(s => {
                                  const trimmed = s.trim()
                                  return trimmed.length > 0 && isNaN(parseInt(trimmed, 10))
                                })
                                if (hasInvalidChars && value.trim() !== '') {
                                  setEventErrors(prev => ({ ...prev, leadTimes: 'Please enter only positive numbers separated by commas' }))
                                } else {
                                  setEventErrors(prev => ({ ...prev, leadTimes: undefined }))
                                }
                              }}
                              placeholder="14, 7, 3, 1"
                              error={eventErrors.leadTimes}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Enter a comma-separated list, e.g. 14, 7, 3, 1. Leave empty for no automatic reminders.
                            </p>
                            {eventScheduling.daysBefore.length > 0 && (
                              <p className="text-xs text-gray-600 mt-2">
                                Parsed as: {eventScheduling.daysBefore.sort((a, b) => b - a).join(', ')} days before
                              </p>
                            )}
                          </FormField>
                        </div>
                      </div>
                    ) : (
                      /* Non-Events: Show standard schedule UI */
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
                            You've chosen specific dates. After saving this category, you'll add each event date and its URL on the Event Dates section.
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
                    )}
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
                          Upload images to assign to this category. Images will be available in your Content Library.
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
                              message: error,
                              type: 'error'
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
                    {/* We intentionally reuse the same useAssets hook and pattern as Content Library
                        to keep behavior consistent and avoid duplication. Assets load once on mount
                        and persist across mode switches. No refetch needed - selection changes don't
                        trigger reloads, only uploads trigger refetches when complete. */}
                    {imageMode === 'existing' && (
                      <div className="space-y-4">
                        <h3 className="text-base font-semibold text-gray-900 mb-2">
                          Choose from existing images
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Select images from your Content Library to assign to this category.
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
                      disabled={isSaving || mode === 'edit'}
                      className={`
                        inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                        ${
                          mode === 'edit'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : !isSaving
                            ? 'bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white hover:from-[#4F46E5] hover:to-[#4338CA]'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      {mode === 'edit' ? (
                        <>
                          Save (Not wired yet)
                        </>
                      ) : isSaving ? (
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

