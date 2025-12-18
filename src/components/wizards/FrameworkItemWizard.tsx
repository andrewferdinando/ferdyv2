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
import { normalizeHashtags } from '@/lib/utils/hashtags'
import { useAssets, Asset } from '@/hooks/assets/useAssets'
import { useUploadAsset } from '@/hooks/assets/useUploadAsset'
import UploadAsset from '@/components/assets/UploadAsset'
import TimezoneSelect from '@/components/forms/TimezoneSelect'
import { useBrandPostSettings } from '@/hooks/useBrandPostSettings'
import { HashtagInput } from '@/components/ui/HashtagInput'
import Modal from '@/components/ui/Modal'

// Helper function to get default timezone (saved > brand > browser)
function getDefaultTimezone(savedTimezone?: string | null, brandTimezone?: string | null): string {
  if (savedTimezone) return savedTimezone
  if (brandTimezone) return brandTimezone
  // Fallback to browser timezone
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'Pacific/Auckland' // Ultimate fallback
  }
}

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

const XMarkIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

// Type options for Step 1 (Schedules temporarily removed from v1)
const TYPE_OPTIONS: Array<{ value: SubcategoryType; label: string; subtitle: string; examples: string }> = [
  {
    value: 'event_series',
    label: 'Events',
    subtitle: 'Dates you want to promote',
    examples: 'Fixtures, launches, shows'
  },
  {
    value: 'service_or_programme',
    label: 'Products / Services',
    subtitle: 'Ongoing things you offer',
    examples: 'Classes, memberships, programmes'
  },
  {
    value: 'promo_or_offer',
    label: 'Promos',
    subtitle: 'Short-term offers',
    examples: 'Sales, discounts, limited-time deals'
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
  // LinkedIn Profile removed - not currently supported
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
  defaultHashtags: string[] // Changed from string to array
  channels: string[]
  default_copy_length: 'short' | 'medium' | 'long'
  post_time: string | null // Post time (HH:MM format, or null)
}

type WizardSchedule = {
  frequency: ScheduleFrequency | null
  timeOfDay: string
  timezone: string
  daysOfWeek: string[]
  dayOfMonth: number | null // Legacy single day
  daysOfMonth: number[] // Multi-select days (1-28)
  nthWeek: number | null // 1, 2, 3, 4, or 5 (last)
  weekday: number | null // 1-7 (Monday-Sunday)
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
  daysDuring: number[] // e.g. [0, 1, 2] for multi-day events
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
    default_copy_length?: 'short' | 'medium' | 'long'
    post_time?: string | null
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

export default function FrameworkItemWizard(props: WizardProps = {}) {
  const { mode = 'create', initialData } = props
  const params = useParams()
  const router = useRouter()
  const brandId = params.brandId as string
  const { brand } = useBrand(brandId)
  const { showToast } = useToast()
  
  // Check if trying to edit a Schedules category (temporarily disabled)
  React.useEffect(() => {
    if (mode === 'edit' && initialData?.subcategory?.subcategory_type === 'dynamic_schedule') {
      showToast({
        title: 'Editing temporarily disabled',
        message: 'Editing Schedules categories is temporarily disabled.',
        type: 'error'
      })
      router.push(`/brands/${brandId}/engine-room/categories`)
    }
  }, [mode, initialData, brandId, router, showToast])
  
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const { defaultPostTime, defaultCopyLength } = useBrandPostSettings(brandId)
  
  // Initialize subcategory type from initialData in edit mode (but not for Schedules)
  const [subcategoryType, setSubcategoryType] = useState<SubcategoryType | null>(() => {
    if (mode === 'edit' && initialData?.subcategory?.subcategory_type) {
      // Don't allow Schedules type in edit mode
      if (initialData.subcategory.subcategory_type === 'dynamic_schedule') {
        return null
      }
      return initialData.subcategory.subcategory_type
    }
    return null
  })
  
  // Initialize details from initialData in edit mode, or use brand defaults for new subcategories
  const [details, setDetails] = useState<WizardDetails>(() => {
    if (mode === 'edit' && initialData?.subcategory) {
      // When editing, use existing value (never override with brand default)
      // Convert post_time from database format (HH:MM:SS) to form format (HH:MM)
      const postTime = initialData.subcategory.post_time
        ? (typeof initialData.subcategory.post_time === 'string'
            ? initialData.subcategory.post_time.substring(0, 5) // Extract HH:MM from HH:MM:SS
            : null)
        : null
      const initialValues = {
        name: initialData.subcategory.name || '',
        detail: initialData.subcategory.detail || '',
        url: initialData.subcategory.url || '',
        defaultHashtags: initialData.subcategory.default_hashtags || [],
        channels: initialData.subcategory.channels || [],
        default_copy_length: (initialData.subcategory.default_copy_length as 'short' | 'medium' | 'long') || 'medium',
        post_time: postTime,
      }
      return initialValues
    }
    // For new subcategories, use brand default (hook ensures this is always non-null)
    const initialValues = {
      name: '',
      detail: '',
      url: '',
      defaultHashtags: [], // Changed from empty string to empty array
      channels: [],
      default_copy_length: defaultCopyLength, // Hook ensures this is always 'short' | 'medium' | 'long'
      post_time: defaultPostTime ?? null, // Hook provides HH:MM format, explicitly include even if null
    }
    return initialValues
  })
  
  // Update default_copy_length and post_time when brand settings load (only for new subcategories)
  // This handles the case where hook loads after component mounts
  useEffect(() => {
    if (mode === 'create') {
      setDetails(prev => ({
        ...prev,
        default_copy_length: defaultCopyLength || prev.default_copy_length,
        post_time: defaultPostTime || prev.post_time
      }))
    }
  }, [defaultCopyLength, defaultPostTime, mode])
  
  const [detailsErrors, setDetailsErrors] = useState<{
    name?: string
    detail?: string
    channels?: string
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
      
      // Handle monthly: check for nth_week/weekday or day_of_month
      let daysOfMonth: number[] = []
      let dayOfMonth: number | null = null
      let nthWeek: number | null = null
      let weekday: number | null = null
      
      if (rule.frequency === 'monthly') {
        if (rule.nth_week && rule.weekday) {
          // Nth weekday mode
          nthWeek = rule.nth_week
          weekday = rule.weekday
        } else if (rule.day_of_month) {
          // Day(s) of month mode
          if (Array.isArray(rule.day_of_month)) {
            daysOfMonth = rule.day_of_month
            dayOfMonth = daysOfMonth[0] || null // Keep legacy single day for compatibility
          } else {
            dayOfMonth = rule.day_of_month
            daysOfMonth = [rule.day_of_month]
          }
        }
      }
      
      return {
        frequency: rule.frequency || null,
        timeOfDay: timesArray[0] || '',
        timezone: getDefaultTimezone(rule.timezone, brand?.timezone),
        daysOfWeek: daysOfWeek,
        dayOfMonth: dayOfMonth,
        daysOfMonth: daysOfMonth,
        nthWeek: nthWeek,
        weekday: weekday,
      }
    }
    // For new schedule rules, initialize timeOfDay from details.post_time if available,
    // otherwise fall back to brand default (hook ensures this is always non-null with fallback)
    // Note: details state is initialized after schedule, so we use defaultPostTime directly here
    // and sync with details.post_time in the useEffect below
    return {
      frequency: null,
      timeOfDay: defaultPostTime || '', // Hook ensures this is always '10:00' or the DB value
      timezone: getDefaultTimezone(null, brand?.timezone),
      daysOfWeek: [],
      dayOfMonth: null,
      daysOfMonth: [],
      nthWeek: null,
      weekday: null,
    }
  })
  
  // Update timeOfDay when brand settings load (only for new schedule rules)
  // Sync schedule.timeOfDay with details.post_time to ensure they stay in sync
  useEffect(() => {
    if (mode === 'create') {
      // Use details.post_time if available (it should have the brand default),
      // otherwise fall back to defaultPostTime from the hook
      const timeToUse = details.post_time || defaultPostTime || ''
      if (timeToUse && schedule.timeOfDay !== timeToUse) {
        setSchedule(prev => ({ ...prev, timeOfDay: timeToUse }))
      }
    }
  }, [defaultPostTime, details.post_time, mode, schedule.timeOfDay])
  
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
      let daysDuring: number[] = []
      
      // Extract daysBefore from scheduleRule
      if (initialData.scheduleRule?.days_before) {
        daysBefore = initialData.scheduleRule.days_before
      }
      if (initialData.scheduleRule?.days_during) {
        daysDuring = initialData.scheduleRule.days_during
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
        daysBefore,
        daysDuring
      }
    }
    return {
      occurrences: [],
      daysBefore: [],
      daysDuring: []
    }
  })
  const [eventErrors, setEventErrors] = useState<{
    occurrences?: string
    leadTimes?: string
    daysDuring?: string
    timeOfDay?: string
  }>({})
  // Initialize leadTimesInput from initialData in edit mode
  const [leadTimesInput, setLeadTimesInput] = useState<string>(() => {
    if (mode === 'edit' && initialData?.scheduleRule?.days_before && initialData.scheduleRule.days_before.length > 0) {
      return initialData.scheduleRule.days_before.join(', ')
    }
    return '7, 3, 1'
  })
  const [daysDuringInput, setDaysDuringInput] = useState<string>(() => {
    if (mode === 'edit' && initialData?.scheduleRule?.days_during && initialData.scheduleRule.days_during.length > 0) {
      return initialData.scheduleRule.days_during.join(', ')
    }
    return ''
  })
  
  // Reset occurrences when switching occurrence type (but not in edit mode on mount)
  useEffect(() => {
    // Initialize eventScheduling for specific frequency (all types)
    if (schedule.frequency === 'specific' && mode === 'create') {
      setEventScheduling(prev => ({ ...prev, occurrences: [] }))
      setEventErrors({})
    }
  }, [eventOccurrenceType, schedule.frequency, mode])

  // Force specific frequency for Events as soon as the type is selected (create mode)
  useEffect(() => {
    if (mode === 'create' && subcategoryType === 'event_series' && schedule.frequency !== 'specific') {
      setSchedule(prev => ({ ...prev, frequency: 'specific' }))
    }
  }, [mode, subcategoryType, schedule.frequency])

  const occurrenceRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Initialize daysBefore from leadTimesInput when component mounts or switching to specific frequency
  useEffect(() => {
    if (schedule.frequency === 'specific' && eventScheduling.daysBefore.length === 0) {
      const parsed = parseLeadTimes(leadTimesInput)
      if (parsed.length > 0) {
        setEventScheduling(prev => ({
          ...prev,
          daysBefore: parsed
        }))
      }
    }
  }, [schedule.frequency, leadTimesInput])
  const [isSaving, setIsSaving] = useState(false)
  const [savedSubcategoryId, setSavedSubcategoryId] = useState<string | null>(
    mode === 'edit' && initialData?.subcategory?.id ? initialData.subcategory.id : null
  )
  // Initialize selectedAssetIds from initialData in edit mode
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(
    mode === 'edit' && initialData?.assets ? initialData.assets : []
  )
  const [imageMode, setImageMode] = useState<'upload' | 'existing'>(() => {
    // Always default to 'upload' mode
    return 'upload'
  })
  
  const { assets, loading: assetsLoading, refetch: refetchAssets } = useAssets(brandId)
  const { uploadAsset, uploading: isUploading } = useUploadAsset()

  // Update timezone when brand loads (only if not already set from saved data)
  useEffect(() => {
    if (brand?.timezone && !schedule.timezone) {
      setSchedule(prev => ({ ...prev, timezone: getDefaultTimezone(null, brand.timezone) }))
    }
  }, [brand?.timezone])

  // Note: Assets are automatically loaded by useAssets hook when brandId is available.
  // We intentionally reuse the same hook and pattern as Content Library to keep
  // behavior consistent and avoid duplication. Assets will load once on mount
  // and refetch automatically when brandId changes - no need to refetch on step changes.

  // Reset wizard state when type changes (but not on initial mount or in edit mode)
  const resetWizardState = React.useCallback(() => {
    // Reset details
    setDetails({
      name: '',
      detail: '',
      url: '',
      defaultHashtags: [],
      channels: [],
      default_copy_length: defaultCopyLength || 'medium',
      post_time: defaultPostTime || null,
    })
    setDetailsErrors({})
    
    // Reset schedule - use brand default time for new rules
    setSchedule({
      frequency: null,
      timeOfDay: defaultPostTime || '', // Use brand default
      timezone: getDefaultTimezone(null, brand?.timezone),
      daysOfWeek: [],
      dayOfMonth: null,
      daysOfMonth: [],
      nthWeek: null,
      weekday: null,
    })
    setScheduleErrors({})
    
    // Reset event scheduling
    setEventScheduling({
      occurrences: [],
      daysBefore: [],
      daysDuring: []
    })
    setEventOccurrenceType('single')
    setEventErrors({})
    setLeadTimesInput('7, 3, 1')
    
    // Reset images
    setSelectedAssetIds([])
    setImageMode('upload')
    
    // Reset to step 1
    setCurrentStep(1)
  }, [brand?.timezone, defaultCopyLength, defaultPostTime])

  // Track previous type to detect changes
  const prevSubcategoryTypeRef = React.useRef<SubcategoryType | null>(subcategoryType)
  
  // Reset state when type changes (but not on initial mount)
  useEffect(() => {
    // Only reset if:
    // 1. Type actually changed (not just initial mount)
    // 2. We're not in edit mode (edit mode should keep initial data)
    // 3. Previous type was not null (avoid resetting on first render)
    if (
      prevSubcategoryTypeRef.current !== null &&
      prevSubcategoryTypeRef.current !== subcategoryType &&
      mode === 'create'
    ) {
      resetWizardState()
    }
    prevSubcategoryTypeRef.current = subcategoryType
  }, [subcategoryType, mode, resetWizardState])

  // Validate Step 1: must have a valid type and it cannot be Schedules
  const isStep1Valid = !!subcategoryType && subcategoryType !== 'dynamic_schedule'
  const isStep2Valid =
    details.name.trim().length > 0 &&
    details.detail.trim().length > 0 &&
    details.channels.length > 0

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

  const parseDaysDuring = (input: string): number[] => {
    if (!input.trim()) return []
    return input
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => parseInt(s, 10))
      .filter(n => !isNaN(n) && n >= 0)
  }

  // Normalize time array: convert empty arrays to null
  const normalizeTimeArray = (arr?: string[] | null): string[] | null => {
    return arr && arr.length > 0 ? arr : null
  }

  // Format time string to HH:MM:SS format
  const formatTimeToHHMMSS = (timeStr: string): string => {
    if (!timeStr || !timeStr.trim()) return timeStr
    const trimmed = timeStr.trim()
    // If already in HH:MM:SS format, return as-is
    if (trimmed.includes(':') && trimmed.split(':').length === 3) {
      return trimmed
    }
    // If in HH:MM format, add :00
    if (trimmed.includes(':') && trimmed.split(':').length === 2) {
      return `${trimmed}:00`
    }
    return trimmed
  }

  // Helper to set time fields correctly: single time uses time_of_day, multiple uses times_of_day
  const setTimeFields = (ruleData: Record<string, unknown>, times: string[] | null) => {
    const normalized = normalizeTimeArray(times)
    if (!normalized) {
      ruleData.time_of_day = null
      ruleData.times_of_day = null
      return
    }
    // For single time, use time_of_day; for multiple, use times_of_day
    if (normalized.length === 1) {
      ruleData.time_of_day = [formatTimeToHHMMSS(normalized[0])]
      ruleData.times_of_day = null
    } else {
      ruleData.time_of_day = null
      ruleData.times_of_day = normalized.map(formatTimeToHHMMSS)
    }
  }

  const hasDateRangeSelection = React.useMemo(() => {
    if (eventOccurrenceType !== 'range') return false
    return eventScheduling.occurrences.some(occ => {
      const start = occ.start_date?.trim()
      const end = occ.end_date?.trim()
      return !!start && !!end && start !== end
    })
  }, [eventOccurrenceType, eventScheduling.occurrences])

  // Update daysBefore when leadTimesInput changes (only for Events)
  useEffect(() => {
    // Update daysBefore for specific frequency (all types)
    if (schedule.frequency === 'specific') {
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
  }, [leadTimesInput, schedule.frequency])

  // Update daysDuring for date ranges (specific frequency only)
  useEffect(() => {
    if (schedule.frequency !== 'specific') return
    const parsed = parseDaysDuring(daysDuringInput)
    setEventScheduling(prev => {
      const nextDaysDuring = hasDateRangeSelection ? parsed : []
      if (JSON.stringify(prev.daysDuring.sort()) !== JSON.stringify(nextDaysDuring.sort())) {
        return {
          ...prev,
          daysDuring: nextDaysDuring
        }
      }
      return prev
    })
  }, [daysDuringInput, hasDateRangeSelection, schedule.frequency])

  const isStep3Valid = (): boolean => {
    // Specific frequency uses event-style validation (for all types)
    if (schedule.frequency === 'specific') {
      // Must have at least one occurrence with valid data
      if (eventScheduling.occurrences.length === 0) {
        return false
      }
      
      // Validate based on occurrence type
      if (eventOccurrenceType === 'single') {
        // Single mode: date + time required (no days_before fallback)
        return eventScheduling.occurrences.every(
          occ => occ.date && occ.date.trim().length > 0 && occ.time && occ.time.trim().length > 0
        )
      } else {
        // Range mode: start_date + end_date required, plus a time (from schedule.timeOfDay)
        const hasValidDates = eventScheduling.occurrences.every(
          occ => occ.start_date && occ.start_date.trim().length > 0 && occ.end_date && occ.end_date.trim().length > 0
        )
        const hasTime = schedule.timeOfDay && schedule.timeOfDay.trim().length > 0
        return hasValidDates && !!hasTime
      }
    }
    
    // Other types use the standard schedule validation
    if (!schedule.frequency) return false
    
    if (schedule.frequency === 'daily') {
      return schedule.timeOfDay.trim().length > 0
    }
    
    if (schedule.frequency === 'weekly') {
      return schedule.timeOfDay.trim().length > 0 && schedule.daysOfWeek.length > 0
    }
    
    if (schedule.frequency === 'monthly') {
      if (schedule.timeOfDay.trim().length === 0) return false
      // Monthly requires EITHER days of month OR nth weekday
      const hasDaysOfMonth = schedule.daysOfMonth && schedule.daysOfMonth.length > 0
      const hasNthWeekday = schedule.nthWeek !== null && schedule.weekday !== null
      return hasDaysOfMonth || hasNthWeekday
    }
    
    return false
  }

  const canGoNext =
    currentStep === 1 ? isStep1Valid :
    currentStep === 2 ? isStep2Valid :
    currentStep === 3 ? isStep3Valid() :
    currentStep === 4 ? true : // Step 4 has no required fields
    true

  // Helper function to build subcategory settings based on type
  const buildSubcategorySettings = (
    details: WizardDetails,
    subcategoryType: SubcategoryType | null,
    eventScheduling?: EventSchedulingState,
    eventOccurrenceType?: 'single' | 'range'
  ): Record<string, any> => {
    if (!subcategoryType) {
      return {}
    }

    switch (subcategoryType) {
      case 'promo_or_offer': {
        // TODO: Add promo-specific fields to WizardDetails when UI is implemented
        // Expected fields:
        // - promo_length_days: number | null (duration of promo in days)
        // - auto_expire: boolean (whether promo auto-expires)
        // For now, return empty object to prevent breaking existing functionality
        return {}
      }

      case 'event_series': {
        const settings: Record<string, any> = {}
        
        // Persist occurrence_type
        if (eventOccurrenceType) {
          settings.occurrence_type = eventOccurrenceType
        }
        
        // Persist occurrences array (contains either {date, time} or {start_date, end_date})
        if (eventScheduling && eventScheduling.occurrences && eventScheduling.occurrences.length > 0) {
          settings.occurrences = eventScheduling.occurrences
        }
        
        // Persist default_lead_times from eventScheduling.daysBefore
        if (eventScheduling && eventScheduling.daysBefore && eventScheduling.daysBefore.length > 0) {
          settings.default_lead_times = eventScheduling.daysBefore
        }
        // Persist days_during for ranges
        if (eventScheduling && eventScheduling.daysDuring && eventScheduling.daysDuring.length > 0) {
          settings.days_during = eventScheduling.daysDuring
        }
        
        return settings
      }

      default:
        // Return empty object for other types (don't break existing functionality)
        return {}
    }
  }

  // Helper function to ensure subcategory is saved (used before Step 4)
  const ensureSubcategorySaved = async (): Promise<{ subcategoryId: string } | null> => {
    // Prevent creating Schedules type (temporarily disabled)
    if (subcategoryType === 'dynamic_schedule') {
      showToast({
        title: 'Invalid category type',
        message: 'Schedules categories cannot be created at this time.',
        type: 'error'
      })
      setCurrentStep(1)
      return null
    }
    
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
        if (details.channels.length === 0) newErrors.channels = 'Select at least one channel.'
        setDetailsErrors(newErrors)
        setCurrentStep(2)
        return null
      }
      
      if (!isStep3Valid()) {
        // Specific frequency validation (for all types)
        if (schedule.frequency === 'specific') {
          const newErrors: typeof eventErrors = {}
          if (eventScheduling.occurrences.length === 0) {
            newErrors.occurrences = 'Please add at least one date.'
          } else {
            if (eventOccurrenceType === 'single') {
              const missingDates = eventScheduling.occurrences.filter(occ => !occ.date || !occ.date.trim())
              const missingTimes = eventScheduling.occurrences.filter(occ => !occ.time || !occ.time.trim())
              if (missingDates.length > 0) {
                newErrors.occurrences = 'All dates must have a date.'
              } else if (missingTimes.length > 0) {
                newErrors.occurrences = 'All dates must have a time.'
              }
            } else {
              // Range mode
              const missingStartDates = eventScheduling.occurrences.filter(occ => !occ.start_date || !occ.start_date.trim())
              const missingEndDates = eventScheduling.occurrences.filter(occ => !occ.end_date || !occ.end_date.trim())
              const missingTime = !schedule.timeOfDay || !schedule.timeOfDay.trim()
              if (missingStartDates.length > 0) {
                newErrors.occurrences = 'All date ranges must have a start date.'
              } else if (missingEndDates.length > 0) {
                newErrors.occurrences = 'All date ranges must have an end date.'
              } else if (missingTime) {
                newErrors.timeOfDay = 'Please select a time for the range.'
              }
            }
          }
          setEventErrors(newErrors)
          return null
        }
        
        // Other frequency types validation
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
          // Monthly requires EITHER days of month OR nth weekday
          const hasDaysOfMonth = schedule.daysOfMonth && schedule.daysOfMonth.length > 0
          const hasNthWeekday = schedule.nthWeek !== null && schedule.weekday !== null
          if (!hasDaysOfMonth && !hasNthWeekday) {
            newErrors.dayOfMonth = 'Please select either specific days of the month or an Nth weekday.'
          }
        }
        setScheduleErrors(newErrors)
        return null
      }
      return null
    }

    setIsSaving(true)

    try {
      // Normalize hashtags (already an array)
      const normalizedHashtags = normalizeHashtags(details.defaultHashtags)

      // Use form values for copy_length and post_time (mirroring copy_length pattern)
      // These values come from the form state which was initialized from brand defaults via useBrandPostSettings hook
      const insertData = {
        brand_id: brandId,
        category_id: null,
        name: details.name.trim(),
        detail: details.detail.trim(),
        url: details.url.trim() || null,
        default_hashtags: normalizedHashtags,
        channels: details.channels.length > 0 ? details.channels : null,
        subcategory_type: subcategoryType || 'other',
        default_copy_length: details.default_copy_length || 'medium',
        // Convert post_time from form format (HH:MM) to database format (HH:MM:SS)
        post_time: details.post_time 
          ? (details.post_time.includes(':') && details.post_time.split(':').length === 2
              ? `${details.post_time}:00`
              : details.post_time)
          : null,
        settings: buildSubcategorySettings(details, subcategoryType, eventScheduling, eventOccurrenceType)
      }

      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategories')
        .insert(insertData)
        .select()
        .single()

      if (subcategoryError) {
        console.error('[Wizard] Subcategory insert error:', subcategoryError)
        if (subcategoryError.code === '23505') {
          throw new Error(`A category with the name "${details.name}" already exists. Please use a different name.`)
        }
        throw new Error(`Failed to create category: ${subcategoryError.message}`)
      }

      const subcategoryId = subcategoryData.id
      setSavedSubcategoryId(subcategoryId)
      

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
        // Normalize channels before saving to schedule_rules
        // CRITICAL: schedule_rule.channels is the single source of truth for draft generation
        const normalizeChannelForSave = (ch: string): string => {
          if (ch === 'instagram') return 'instagram_feed';
          if (ch === 'linkedin') return 'linkedin_profile';
          return ch;
        };
        const normalizedEventChannels = details.channels.length > 0
          ? details.channels.map(normalizeChannelForSave)
          : null;

        // Upsert schedule rule for Events - ALWAYS ensure exactly one rule per subcategory
        const eventRuleData: Record<string, unknown> = {
          brand_id: brandId,
          subcategory_id: subcategoryId,
          category_id: null,
          name: `${details.name.trim()} – Specific Events`,
          frequency: 'specific',
          days_during: eventOccurrenceType === 'range' ? null : null, // Can be set in future, but null for now
          channels: normalizedEventChannels, // Use normalized channels - this is the single source of truth
          is_active: true,
          tone: null,
          hashtag_rule: null,
          image_tag_rule: null,
          // Set default timezone (will be overridden if occurrences exist)
          timezone: brand?.timezone || 'Pacific/Auckland'
        }

        // Extract date and time from first occurrence for event_series with frequency='specific'
        // Note: occurrences should always exist due to validation, but we handle empty case defensively
        const times: string[] = []
        if (eventScheduling.occurrences.length > 0) {
          const firstOccurrence = eventScheduling.occurrences[0]
          
          // For single occurrence mode, set start_date and end_date
          if (eventOccurrenceType === 'single' && firstOccurrence.date) {
            // Set start_date and end_date to the same date (YYYY-MM-DD)
            eventRuleData.start_date = firstOccurrence.date.trim()
            eventRuleData.end_date = firstOccurrence.date.trim()
            
            // Extract time if available
            if (firstOccurrence.time && firstOccurrence.time.trim()) {
              times.push(firstOccurrence.time.trim())
            }
          }
          
          // Handle date range mode
          if (eventOccurrenceType === 'range' && firstOccurrence.start_date && firstOccurrence.end_date) {
            eventRuleData.start_date = firstOccurrence.start_date.trim()
            eventRuleData.end_date = firstOccurrence.end_date.trim()
            
            // Use schedule.timeOfDay as the time source for ranges
            if (schedule.timeOfDay && schedule.timeOfDay.trim()) {
              times.push(schedule.timeOfDay.trim())
            }
          }
          
          // Set timezone (use brand timezone or default to Pacific/Auckland)
          eventRuleData.timezone = brand?.timezone || 'Pacific/Auckland'
        }

        // Set time fields using helper (single time uses time_of_day, multiple uses times_of_day)
        setTimeFields(eventRuleData, times.length > 0 ? times : null)

        // Ensure constraint satisfaction: Either (start_date + time_of_day/times_of_day) OR (days_before OR days_during)
        // If we have start_date and time, constraint is satisfied
        // Otherwise, ensure days_before is set to satisfy the constraint
        const hasStartDateAndTime = eventRuleData.start_date && 
          ((eventRuleData.time_of_day && Array.isArray(eventRuleData.time_of_day) && eventRuleData.time_of_day.length > 0) ||
           (eventRuleData.times_of_day && Array.isArray(eventRuleData.times_of_day) && eventRuleData.times_of_day.length > 0))
        
        if (!hasStartDateAndTime) {
          // Constraint not satisfied by start_date + times_of_day, so use days_before
          eventRuleData.days_before = eventScheduling.daysBefore.length > 0 
            ? eventScheduling.daysBefore 
            : [0] // Fallback to [0] to satisfy constraint
        } else {
          // Constraint satisfied by start_date + times_of_day, but still set days_before if available
          eventRuleData.days_before = eventScheduling.daysBefore.length > 0 
            ? eventScheduling.daysBefore 
            : null
        }

        // Set days_during only for valid date ranges
        eventRuleData.days_during = hasDateRangeSelection && eventScheduling.daysDuring.length > 0
          ? eventScheduling.daysDuring
          : null

        // Check for existing rule to avoid duplicates
        const { data: existingEventRule } = await supabase
          .from('schedule_rules')
          .select('id')
          .eq('subcategory_id', subcategoryId)
          .eq('brand_id', brandId)
          .maybeSingle()

        if (existingEventRule) {
          const { error: eventRuleUpdateError } = await supabase
            .from('schedule_rules')
            .update(eventRuleData)
            .eq('id', existingEventRule.id)

          if (eventRuleUpdateError) {
            console.error('[Wizard] Schedule rule update error for Events:', eventRuleUpdateError)
            throw new Error(`Failed to update schedule rule: ${eventRuleUpdateError.message}`)
          }

        } else {
          const { error: eventRuleInsertError } = await supabase
            .from('schedule_rules')
            .insert(eventRuleData)

          if (eventRuleInsertError) {
            console.error('[Wizard] Schedule rule insert error for Events:', eventRuleInsertError)
            throw new Error(`Failed to create schedule rule: ${eventRuleInsertError.message}`)
          }

        }

        // Verify the created schedule_rule has start_date and time populated
        if (eventOccurrenceType === 'single' && eventScheduling.occurrences.length > 0) {
          const { data: createdRule, error: verifyError } = await supabase
            .from('schedule_rules')
            .select('start_date, end_date, time_of_day, times_of_day, timezone')
            .eq('subcategory_id', subcategoryId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (!verifyError && createdRule) {
            const hasTime = (createdRule.time_of_day && Array.isArray(createdRule.time_of_day) && createdRule.time_of_day.length > 0) ||
                            (createdRule.times_of_day && Array.isArray(createdRule.times_of_day) && createdRule.times_of_day.length > 0)
            if (!createdRule.start_date || !hasTime) {
              console.error('[Wizard] ⚠️ Schedule rule verification failed: start_date or time is missing')
            }
          }
        }

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

        const { error: occurrencesError } = await supabase
          .from('event_occurrences')
          .insert(occurrencesToInsert)

        if (occurrencesError) {
          console.error('[Wizard] Event occurrences insert error:', occurrencesError)
          throw new Error(`Failed to create event occurrences: ${occurrencesError.message}`)
        }
      }

      // Create schedule rule if needed (based on type + frequency rules) - for non-Events
      // ALWAYS create a schedule_rule for all subcategory types if frequency is set
      const shouldCreateRule = !!schedule.frequency

      if (shouldCreateRule && schedule.frequency) {
        // Normalize channels before saving to schedule_rules
        // CRITICAL: schedule_rule.channels is the single source of truth for draft generation
        const normalizeChannelForSave = (ch: string): string => {
          if (ch === 'instagram') return 'instagram_feed';
          if (ch === 'linkedin') return 'linkedin_profile';
          return ch;
        };
        const normalizedChannels = details.channels.length > 0
          ? details.channels.map(normalizeChannelForSave)
          : null;

        // Build schedule rule payload
        const baseRuleData: Record<string, unknown> = {
          brand_id: brandId,
          subcategory_id: subcategoryId,
          category_id: null,
          name: `${details.name.trim()} – ${schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)}`,
          frequency: schedule.frequency,
          channels: normalizedChannels, // Use normalized channels - this is the single source of truth
          is_active: true,
          tone: null,
          hashtag_rule: null,
          image_tag_rule: null
        }

        // Add fields based on frequency type
        if (schedule.frequency === 'daily') {
          setTimeFields(baseRuleData, schedule.timeOfDay ? [schedule.timeOfDay] : null)
          baseRuleData.timezone = schedule.timezone || getDefaultTimezone(null, brand?.timezone)
        } else if (schedule.frequency === 'weekly') {
          // Map string days to integers (mon -> 1, tue -> 2, etc.)
          const dayMap: Record<string, number> = { 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 7 }
          const mappedDays = schedule.daysOfWeek
            .map(d => dayMap[d] || 0)
            .filter(d => d > 0 && d <= 7)
          baseRuleData.days_of_week = mappedDays.length > 0 ? Array.from(new Set(mappedDays)).sort((a, b) => a - b) : null
          setTimeFields(baseRuleData, schedule.timeOfDay ? [schedule.timeOfDay] : null)
          baseRuleData.timezone = schedule.timezone || getDefaultTimezone(null, brand?.timezone)
        } else if (schedule.frequency === 'monthly') {
          // Handle monthly: either days of month OR nth weekday
          if (schedule.daysOfMonth && schedule.daysOfMonth.length > 0) {
            // Mode A: Specific days of the month
            baseRuleData.day_of_month = schedule.daysOfMonth.sort((a, b) => a - b)
            baseRuleData.nth_week = null
            baseRuleData.weekday = null
          } else if (schedule.nthWeek !== null && schedule.weekday !== null) {
            // Mode B: Nth weekday
            baseRuleData.nth_week = schedule.nthWeek
            baseRuleData.weekday = schedule.weekday
            baseRuleData.day_of_month = null
          }
          setTimeFields(baseRuleData, schedule.timeOfDay ? [schedule.timeOfDay] : null)
          baseRuleData.timezone = schedule.timezone || getDefaultTimezone(null, brand?.timezone)
        } else if (schedule.frequency === 'specific') {
          // For frequency='specific', we must satisfy the constraint:
          // Either: start_date IS NOT NULL AND time_of_day IS NOT NULL AND cardinality(time_of_day) > 0
          // Or: days_before has at least 1 value OR days_during has at least 1 value
          
          // Set default timezone
          baseRuleData.timezone = schedule.timezone || getDefaultTimezone(null, brand?.timezone) || 'Pacific/Auckland'
          
          // Extract start_date, end_date, and time from eventScheduling.occurrences
          // This works for both single date and date range modes
          const times: string[] = []
          if (eventScheduling.occurrences.length > 0) {
            const firstOccurrence = eventScheduling.occurrences[0]
            
            // Handle single date mode
            if (eventOccurrenceType === 'single' && firstOccurrence.date) {
              baseRuleData.start_date = firstOccurrence.date.trim()
              baseRuleData.end_date = firstOccurrence.date.trim() // Same as start_date for single date
              
              // Extract time if available
              if (firstOccurrence.time && firstOccurrence.time.trim()) {
                times.push(firstOccurrence.time.trim())
              }
            }
            
            // Handle date range mode
            if (eventOccurrenceType === 'range' && firstOccurrence.start_date && firstOccurrence.end_date) {
              baseRuleData.start_date = firstOccurrence.start_date.trim()
              baseRuleData.end_date = firstOccurrence.end_date.trim()
              
              // For range mode, use schedule.timeOfDay as the time source
              if (schedule.timeOfDay && schedule.timeOfDay.trim()) {
                times.push(schedule.timeOfDay.trim())
              }
            }
          }
          
          // Set time fields using helper (single time uses time_of_day, multiple uses times_of_day)
          setTimeFields(baseRuleData, times.length > 0 ? times : null)
          
          // Guard: if start_date is missing, we cannot save (validation should have caught this)
          if (!baseRuleData.start_date) {
            throw new Error('Cannot save schedule rule: start_date is required for frequency="specific". Please add at least one date.')
          }
          
          // Guard: if time is missing or empty, we cannot save
          const hasTime = (baseRuleData.time_of_day && Array.isArray(baseRuleData.time_of_day) && baseRuleData.time_of_day.length > 0) ||
                          (baseRuleData.times_of_day && Array.isArray(baseRuleData.times_of_day) && baseRuleData.times_of_day.length > 0)
          if (!hasTime) {
            throw new Error('Cannot save schedule rule: time is required for frequency="specific". Please add a time.')
          }
          
          // Set days_before if available (from eventScheduling.daysBefore)
          // Only set if we have a valid start_date (don't use as fallback for constraint)
          if (eventScheduling.daysBefore.length > 0) {
            baseRuleData.days_before = eventScheduling.daysBefore
          } else {
            baseRuleData.days_before = null
          }

          // Set days_during only for valid date ranges
          baseRuleData.days_during = hasDateRangeSelection && eventScheduling.daysDuring.length > 0
            ? eventScheduling.daysDuring
            : null

        }

        // Clean up undefined fields
        const cleanRuleData: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(baseRuleData)) {
          if (value !== undefined) {
            cleanRuleData[key] = value
          }
        }

        // Log payload for frequency='specific' to verify constraint satisfaction
        // Upsert by subcategory to avoid duplicates
        const { data: existingRule } = await supabase
          .from('schedule_rules')
          .select('id')
          .eq('subcategory_id', subcategoryId)
          .eq('brand_id', brandId)
          .maybeSingle()

        if (existingRule) {
          const { error: ruleUpdateError } = await supabase
            .from('schedule_rules')
            .update(cleanRuleData)
            .eq('id', existingRule.id)

          if (ruleUpdateError) {
            console.error('[Wizard] Schedule rule update error:', ruleUpdateError)
            throw new Error(`Failed to update schedule rule: ${ruleUpdateError.message}`)
          }
        } else {
          const { error: ruleInsertError } = await supabase
            .from('schedule_rules')
            .insert(cleanRuleData)

          if (ruleInsertError) {
            console.error('[Wizard] Schedule rule insert error:', ruleInsertError)
            throw new Error(`Failed to create schedule rule: ${ruleInsertError.message}`)
          }

        }
      }

      // DEFENSIVE CHECK: Verify that at least one active schedule_rule exists
      const { data: verifyRules, error: verifyError } = await supabase
        .from('schedule_rules')
        .select('id, is_active, frequency')
        .eq('subcategory_id', subcategoryId)
        .eq('is_active', true)

      if (verifyError) {
        console.error('[Wizard] Error verifying schedule rules:', verifyError)
        throw new Error(`Failed to verify schedule rule creation: ${verifyError.message}`)
      }

      if (!verifyRules || verifyRules.length === 0) {
        console.error('[Wizard] ⚠️ CRITICAL: No active schedule_rule found after save!')
        throw new Error('Failed to create schedule rule: No active schedule rule exists for this category. This should never happen.')
      }

      // DRAFT GENERATION TRIGGER POINT
      // 
      // According to docs (category_creation_flow.md, draft_lifecycle.md), draft generation
      // should be triggered immediately after subcategory + schedule_rule are successfully saved.
      // This happens here: after ensureSubcategorySaved() completes successfully.
      //
      // WHY THIS CALL EXISTS:
      // - Drafts must be created immediately when a subcategory is created (not just via nightly cron)
      // - This ensures users see drafts right away without waiting for the nightly generator
      // - The generator is idempotent, so calling it multiple times is safe
      //
      // WHY IT WAS MISSING:
      // - Previous implementation deferred draft generation to handleFinish (Step 4)
      // - But handleFinish uses setTimeout + router.push, which can cancel the call on unmount
      // - Moving it here ensures it runs immediately after save succeeds, before navigation
      console.log('[draftGeneration] triggered after subcategory save', {
        brandId,
        subcategoryId,
        mode
      })

      // Small delay to ensure database transaction is fully committed
      // This ensures rpc_framework_targets can see the newly created/updated schedule_rules
      await new Promise(resolve => setTimeout(resolve, 500))

      // Trigger draft generation and wait for it to complete (for loading modal)
      // This ensures users see the loading state during draft generation
      try {
        const response = await fetch('/api/drafts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandId }),
        })
        
        console.log('[draftGeneration] Response status:', response.status, response.statusText)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('[draftGeneration] Error response:', errorData)
          // Log error but don't throw - draft generation failure shouldn't block wizard
          console.error('[draftGeneration] Failed to generate drafts:', errorData.error || 'Unknown error')
        } else {
          const result = await response.json()
          console.log('[draftGeneration] Drafts created successfully:', result)
          console.log('[draftGeneration] Draft count:', result.draftsCreated)
        }
      } catch (err) {
        // Log error but don't throw - draft generation failure shouldn't block wizard
        console.error('[draftGeneration] Failed to generate drafts:', err)
        console.error('[draftGeneration] Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          name: err instanceof Error ? err.name : undefined
        })
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

  // Helper function to update subcategory in edit mode
  const ensureSubcategoryUpdated = async (): Promise<boolean> => {
    if (!savedSubcategoryId) {
      showToast({
        title: 'Error',
        message: 'No category ID found. Please refresh the page and try again.',
        type: 'error'
      })
      return false
    }

    // Prevent updating to Schedules type or editing existing Schedules (temporarily disabled)
    if (subcategoryType === 'dynamic_schedule') {
      showToast({
        title: 'Invalid category type',
        message: 'Schedules categories cannot be edited or updated at this time.',
        type: 'error'
      })
      setCurrentStep(1)
      return false
    }

    // Validate all steps 1-3 (same validation as create)
    if (!isStep1Valid || !isStep2Valid || !isStep3Valid()) {
      // Set errors for invalid steps
      if (!isStep1Valid) {
        showToast({
          title: 'Please select a type',
          message: 'You must choose what kind of category this is.',
          type: 'error'
        })
        return false
      }
      
      if (!isStep2Valid) {
        const newErrors: typeof detailsErrors = {}
        if (!details.name.trim()) newErrors.name = 'Please give this a name.'
        if (!details.detail.trim()) newErrors.detail = 'Please describe this item.'
        if (details.channels.length === 0) newErrors.channels = 'Select at least one channel.'
        setDetailsErrors(newErrors)
        setCurrentStep(2)
        return false
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
          return false
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
          // Monthly requires EITHER days of month OR nth weekday
          const hasDaysOfMonth = schedule.daysOfMonth && schedule.daysOfMonth.length > 0
          const hasNthWeekday = schedule.nthWeek !== null && schedule.weekday !== null
          if (!hasDaysOfMonth && !hasNthWeekday) {
            newErrors.dayOfMonth = 'Please select either specific days of the month or an Nth weekday.'
          }
        }
        setScheduleErrors(newErrors)
        return false
      }
      return false
    }

    setIsSaving(true)

    try {
      const subcategoryId = savedSubcategoryId

      // 1. Update subcategory
      // Normalize hashtags (already an array)
      const normalizedHashtags = normalizeHashtags(details.defaultHashtags)

      // Fetch existing settings first to preserve them
      const { data: existingSubcategory, error: fetchError } = await supabase
        .from('subcategories')
        .select('settings')
        .eq('id', subcategoryId)
        .single()

      if (fetchError) {
        console.error('[Wizard] Error fetching existing subcategory settings:', fetchError)
        throw new Error(`Failed to fetch subcategory: ${fetchError.message}`)
      }

      // Build new settings
      const newSettings = buildSubcategorySettings(details, subcategoryType, eventScheduling, eventOccurrenceType)
      
      // Merge settings: preserve existing, merge with new (only if newSettings is not empty)
      const existingSettings = existingSubcategory?.settings || {}
      const mergedSettings = Object.keys(newSettings).length > 0
        ? { ...existingSettings, ...newSettings }
        : existingSettings

      const { error: subcategoryError } = await supabase
        .from('subcategories')
        .update({
          name: details.name.trim(),
          detail: details.detail.trim(),
          url: details.url.trim() || null,
          default_hashtags: normalizedHashtags,
          channels: details.channels.length > 0 ? details.channels : null,
          subcategory_type: subcategoryType || 'other',
          default_copy_length: details.default_copy_length || 'medium',
          // Convert post_time from form format (HH:MM) to database format (HH:MM:SS)
          post_time: details.post_time 
            ? (details.post_time.includes(':') && details.post_time.split(':').length === 2
                ? `${details.post_time}:00`
                : details.post_time)
            : null,
          settings: mergedSettings
        })
        .eq('id', subcategoryId)

      if (subcategoryError) {
        console.error('[Wizard] Subcategory update error:', subcategoryError)
        throw new Error(`Failed to update category: ${subcategoryError.message}`)
      }

      // Refresh URL summary if URL changed (fire-and-forget)
      if (details.url && details.url.trim()) {
        fetch(`/api/subcategories/${subcategoryId}/refresh-url-summary`, {
          method: 'POST',
        }).catch(err => {
          console.error('Error initiating URL summary refresh:', err)
        })
      }

      // 2. Upsert schedule_rules
      if (subcategoryType === 'event_series') {
        // Events: upsert schedule rule with frequency='specific' and days_before
        const eventRuleData: Record<string, unknown> = {
          brand_id: brandId,
          subcategory_id: subcategoryId,
          category_id: null,
          name: `${details.name.trim()} – Specific Events`,
          frequency: 'specific',
          days_during: null,
          channels: details.channels.length > 0 ? details.channels : null,
          is_active: true,
          tone: null,
          hashtag_rule: null,
          image_tag_rule: null,
          // Set default timezone first
          timezone: brand?.timezone || 'Pacific/Auckland'
        }

        // Extract date and time from first occurrence for event_series with frequency='specific'
        // Note: occurrences should always exist due to validation, but we handle empty case defensively
        const times: string[] = []
        if (eventScheduling.occurrences.length > 0) {
          const firstOccurrence = eventScheduling.occurrences[0]
          
          // For single occurrence mode, set start_date and end_date
          if (eventOccurrenceType === 'single' && firstOccurrence.date) {
            // Set start_date and end_date to the same date (YYYY-MM-DD)
            eventRuleData.start_date = firstOccurrence.date.trim()
            eventRuleData.end_date = firstOccurrence.date.trim()
            
            // Extract time if available
            if (firstOccurrence.time && firstOccurrence.time.trim()) {
              times.push(firstOccurrence.time.trim())
            }
          }
          
          // Handle date range mode
          if (eventOccurrenceType === 'range' && firstOccurrence.start_date && firstOccurrence.end_date) {
            eventRuleData.start_date = firstOccurrence.start_date.trim()
            eventRuleData.end_date = firstOccurrence.end_date.trim()
            
            // Use schedule.timeOfDay as the time source for ranges
            if (schedule.timeOfDay && schedule.timeOfDay.trim()) {
              times.push(schedule.timeOfDay.trim())
            }
          }
        }

        // Set time fields using helper (single time uses time_of_day, multiple uses times_of_day)
        setTimeFields(eventRuleData, times.length > 0 ? times : null)

        // Ensure constraint satisfaction: Either (start_date + time_of_day/times_of_day) OR (days_before OR days_during)
        // If we have start_date and time, constraint is satisfied
        // Otherwise, ensure days_before is set to satisfy the constraint
        const hasStartDateAndTime = eventRuleData.start_date && 
          ((eventRuleData.time_of_day && Array.isArray(eventRuleData.time_of_day) && eventRuleData.time_of_day.length > 0) ||
           (eventRuleData.times_of_day && Array.isArray(eventRuleData.times_of_day) && eventRuleData.times_of_day.length > 0))
        
        if (!hasStartDateAndTime) {
          // Constraint not satisfied by start_date + times_of_day, so use days_before
          eventRuleData.days_before = eventScheduling.daysBefore.length > 0 
            ? eventScheduling.daysBefore 
            : [0] // Fallback to [0] to satisfy constraint
        } else {
          // Constraint satisfied by start_date + times_of_day, but still set days_before if available
          eventRuleData.days_before = eventScheduling.daysBefore.length > 0 
            ? eventScheduling.daysBefore 
            : null
        }

        // Set days_during only for valid date ranges
        eventRuleData.days_during = hasDateRangeSelection && eventScheduling.daysDuring.length > 0
          ? eventScheduling.daysDuring
          : null

        // Check if schedule rule exists
        const { data: existingRule } = await supabase
          .from('schedule_rules')
          .select('id')
          .eq('subcategory_id', subcategoryId)
          .eq('is_active', true)
          .maybeSingle()

        if (existingRule) {
          // Update existing rule
          const { error: updateError } = await supabase
            .from('schedule_rules')
            .update(eventRuleData)
            .eq('id', existingRule.id)

          if (updateError) {
            console.error('[Wizard] Schedule rule update error for Events:', updateError)
            throw new Error(`Failed to update schedule rule: ${updateError.message}`)
          }
          // Verify the updated schedule_rule has start_date and time populated
          if (eventOccurrenceType === 'single' && eventScheduling.occurrences.length > 0) {
            const { data: updatedRule, error: verifyError } = await supabase
              .from('schedule_rules')
              .select('start_date, end_date, time_of_day, times_of_day, timezone')
              .eq('id', existingRule.id)
              .single()

            if (!verifyError && updatedRule) {
              const hasTime = (updatedRule.time_of_day && Array.isArray(updatedRule.time_of_day) && updatedRule.time_of_day.length > 0) ||
                              (updatedRule.times_of_day && Array.isArray(updatedRule.times_of_day) && updatedRule.times_of_day.length > 0)
              if (!updatedRule.start_date || !hasTime) {
                console.error('[Wizard] ⚠️ Schedule rule verification failed: start_date or time is missing')
              }
            }
          }
        } else {
          // Insert new rule
          const { error: insertError } = await supabase
            .from('schedule_rules')
            .insert(eventRuleData)

          if (insertError) {
            console.error('[Wizard] Schedule rule insert error for Events:', insertError)
            throw new Error(`Failed to create schedule rule: ${insertError.message}`)
          }
          // Verify the created schedule_rule has start_date and time populated
          if (eventOccurrenceType === 'single' && eventScheduling.occurrences.length > 0) {
            const { data: createdRule, error: verifyError } = await supabase
              .from('schedule_rules')
              .select('start_date, end_date, time_of_day, times_of_day, timezone')
              .eq('subcategory_id', subcategoryId)
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (!verifyError && createdRule) {
              const hasTime = (createdRule.time_of_day && Array.isArray(createdRule.time_of_day) && createdRule.time_of_day.length > 0) ||
                              (createdRule.times_of_day && Array.isArray(createdRule.times_of_day) && createdRule.times_of_day.length > 0)
              if (!createdRule.start_date || !hasTime) {
                console.error('[Wizard] ⚠️ Schedule rule verification failed: start_date or time is missing')
              }
            }
          }
        }

        // 3. Upsert event_occurrences
        // Load existing occurrences to compare
        const { data: existingOccurrences } = await supabase
          .from('event_occurrences')
          .select('id')
          .eq('subcategory_id', subcategoryId)

        const existingOccurrenceIds = new Set(existingOccurrences?.map((occ: any) => occ.id) || [])

        // Build desired occurrences from wizard state
        const occurrencesToUpsert = await Promise.all(
          eventScheduling.occurrences.map(async (occurrence) => {
            let startsAt: string
            let endAt: string | null = null
            
            if (eventOccurrenceType === 'single') {
              const dateStr = occurrence.date!.trim()
              const timeStr = occurrence.time!.trim()
              const dateTimeStr = `${dateStr}T${timeStr}:00`
              startsAt = new Date(dateTimeStr).toISOString()
            } else {
              const startDateStr = occurrence.start_date!.trim()
              const endDateStr = occurrence.end_date!.trim()
              const startDateTimeStr = `${startDateStr}T00:00:00`
              startsAt = new Date(startDateTimeStr).toISOString()
              const endDateTimeStr = `${endDateStr}T23:59:59`
              endAt = new Date(endDateTimeStr).toISOString()
            }

            const finalUrl = occurrence.url?.trim() || details.url.trim() || null

            // Handle summary: keep existing if available, otherwise extract for new occurrences
            let summary: any = null
            if (occurrence.summary) {
              // Keep existing summary if available (already parsed in edit mode initialization)
              summary = occurrence.summary
            } else if (finalUrl && !occurrence.id) {
              // Extract summary only for new occurrences (not updating existing ones)
              try {
                const summaryResponse = await fetch(`/api/extract-url-summary?url=${encodeURIComponent(finalUrl)}`)
                if (summaryResponse.ok) {
                  const summaryData = await summaryResponse.json()
                  summary = summaryData
                }
              } catch (err) {
                console.error('[Wizard] Error extracting URL summary for occurrence:', err)
                // Continue without summary if extraction fails
              }
            }

            return {
              id: occurrence.id, // May be undefined for new occurrences
              subcategory_id: subcategoryId,
              starts_at: startsAt,
              end_at: endAt,
              url: finalUrl,
              notes: occurrence.notes?.trim() || null,
              summary: summary ? JSON.stringify(summary) : null
            }
          })
        )

        // Process each occurrence
        for (const occurrence of occurrencesToUpsert) {
          if (occurrence.id && existingOccurrenceIds.has(occurrence.id)) {
            // Update existing occurrence
            const { id, ...updateData } = occurrence
            const { error: updateError } = await supabase
              .from('event_occurrences')
              .update(updateData)
              .eq('id', id)

            if (updateError) {
              console.error('[Wizard] Error updating event occurrence:', updateError)
              throw new Error(`Failed to update event occurrence: ${updateError.message}`)
            }
          } else {
            // Insert new occurrence
            const { id, ...insertData } = occurrence
            const { error: insertError } = await supabase
              .from('event_occurrences')
              .insert(insertData)

            if (insertError) {
              console.error('[Wizard] Error inserting event occurrence:', insertError)
              throw new Error(`Failed to create event occurrence: ${insertError.message}`)
            }
          }
        }

        // Delete occurrences that are no longer in the wizard state
        const desiredOccurrenceIds = new Set(
          occurrencesToUpsert
            .map(occ => occ.id)
            .filter((id): id is string => !!id)
        )

        const idsToDelete = Array.from(existingOccurrenceIds).filter(
          (id: any) => !desiredOccurrenceIds.has(id)
        )

        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('event_occurrences')
            .delete()
            .in('id', idsToDelete)

          if (deleteError) {
            console.error('[Wizard] Error deleting event occurrences:', deleteError)
            throw new Error(`Failed to delete event occurrences: ${deleteError.message}`)
          }
        }
      } else {
        // Non-Events: upsert schedule rule
        // ALWAYS create/update a schedule_rule for all subcategory types if frequency is set
        const shouldHaveRule = !!schedule.frequency

        if (shouldHaveRule && schedule.frequency) {
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

          if (schedule.frequency === 'daily') {
            setTimeFields(baseRuleData, schedule.timeOfDay ? [schedule.timeOfDay] : null)
            baseRuleData.timezone = schedule.timezone || getDefaultTimezone(null, brand?.timezone)
          } else if (schedule.frequency === 'weekly') {
            const dayMap: Record<string, number> = { 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 7 }
            const mappedDays = schedule.daysOfWeek
              .map(d => dayMap[d] || 0)
              .filter(d => d > 0 && d <= 7)
            baseRuleData.days_of_week = mappedDays.length > 0 ? Array.from(new Set(mappedDays)).sort((a, b) => a - b) : null
            setTimeFields(baseRuleData, schedule.timeOfDay ? [schedule.timeOfDay] : null)
            baseRuleData.timezone = schedule.timezone || getDefaultTimezone(null, brand?.timezone)
          } else if (schedule.frequency === 'monthly') {
            // Handle monthly: either days of month OR nth weekday
            if (schedule.daysOfMonth && schedule.daysOfMonth.length > 0) {
              // Mode A: Specific days of the month
              baseRuleData.day_of_month = schedule.daysOfMonth.sort((a, b) => a - b)
              baseRuleData.nth_week = null
              baseRuleData.weekday = null
            } else if (schedule.nthWeek !== null && schedule.weekday !== null) {
              // Mode B: Nth weekday
              baseRuleData.nth_week = schedule.nthWeek
              baseRuleData.weekday = schedule.weekday
              baseRuleData.day_of_month = null
            }
            setTimeFields(baseRuleData, schedule.timeOfDay ? [schedule.timeOfDay] : null)
            baseRuleData.timezone = schedule.timezone || getDefaultTimezone(null, brand?.timezone)
          } else if (schedule.frequency === 'specific') {
            // For frequency='specific', we must satisfy the constraint:
            // Either: start_date IS NOT NULL AND time_of_day IS NOT NULL AND cardinality(time_of_day) > 0
            // Or: days_before has at least 1 value OR days_during has at least 1 value
            
            // Set default timezone
            baseRuleData.timezone = schedule.timezone || getDefaultTimezone(null, brand?.timezone) || 'Pacific/Auckland'
            
            // Extract start_date, end_date, and time from eventScheduling.occurrences
            // This works for both single date and date range modes
            const times: string[] = []
            if (eventScheduling.occurrences.length > 0) {
              const firstOccurrence = eventScheduling.occurrences[0]
              
              // Handle single date mode
              if (eventOccurrenceType === 'single' && firstOccurrence.date) {
                baseRuleData.start_date = firstOccurrence.date.trim()
                baseRuleData.end_date = firstOccurrence.date.trim() // Same as start_date for single date
                
                // Extract time if available
                if (firstOccurrence.time && firstOccurrence.time.trim()) {
                  times.push(firstOccurrence.time.trim())
                }
              }
              
              // Handle date range mode
              if (eventOccurrenceType === 'range' && firstOccurrence.start_date && firstOccurrence.end_date) {
                baseRuleData.start_date = firstOccurrence.start_date.trim()
                baseRuleData.end_date = firstOccurrence.end_date.trim()
                
                // For range mode, use schedule.timeOfDay as the time source
                if (schedule.timeOfDay && schedule.timeOfDay.trim()) {
                  times.push(schedule.timeOfDay.trim())
                }
              }
            }
            
            // Set time fields using helper (single time uses time_of_day, multiple uses times_of_day)
            setTimeFields(baseRuleData, times.length > 0 ? times : null)
            
            // Guard: if start_date is missing, we cannot save (validation should have caught this)
            if (!baseRuleData.start_date) {
              throw new Error('Cannot save schedule rule: start_date is required for frequency="specific". Please add at least one date.')
            }
            
            // Guard: if time is missing or empty, we cannot save
            const hasTime = (baseRuleData.time_of_day && Array.isArray(baseRuleData.time_of_day) && baseRuleData.time_of_day.length > 0) ||
                            (baseRuleData.times_of_day && Array.isArray(baseRuleData.times_of_day) && baseRuleData.times_of_day.length > 0)
            if (!hasTime) {
              throw new Error('Cannot save schedule rule: time is required for frequency="specific". Please add a time.')
            }
            
            // Set days_before if available (from eventScheduling.daysBefore)
            // Only set if we have a valid start_date (don't use as fallback for constraint)
            if (eventScheduling.daysBefore.length > 0) {
              baseRuleData.days_before = eventScheduling.daysBefore
            } else {
              baseRuleData.days_before = null
            }

            // Set days_during only for valid date ranges
            baseRuleData.days_during = hasDateRangeSelection && eventScheduling.daysDuring.length > 0
              ? eventScheduling.daysDuring
              : null
          }

          const cleanRuleData: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(baseRuleData)) {
            if (value !== undefined) {
              cleanRuleData[key] = value
            }
          }

          // Check if schedule rule exists
          const { data: existingRule } = await supabase
            .from('schedule_rules')
            .select('id')
            .eq('subcategory_id', subcategoryId)
            .eq('is_active', true)
            .maybeSingle()

          if (existingRule) {
            // Update existing rule
            const { error: updateError } = await supabase
              .from('schedule_rules')
              .update(cleanRuleData)
              .eq('id', existingRule.id)

            if (updateError) {
              console.error('[Wizard] Schedule rule update error:', updateError)
              throw new Error(`Failed to update schedule rule: ${updateError.message}`)
            }
          } else {
            // Insert new rule
            const { error: insertError } = await supabase
              .from('schedule_rules')
              .insert(cleanRuleData)

            if (insertError) {
              console.error('[Wizard] Schedule rule insert error:', insertError)
              throw new Error(`Failed to create schedule rule: ${insertError.message}`)
            }
          }
        } else {
          // This should never happen due to validation, but if frequency is not set,
          // we should NOT delete existing rules - we should throw an error instead
          console.error('[Wizard] ⚠️ CRITICAL: schedule.frequency is not set, but validation should have prevented this!')
          throw new Error('Schedule frequency is required. This should have been caught by validation.')
        }
      }

      // DEFENSIVE CHECK: Verify that at least one active schedule_rule exists
      const { data: verifyRules, error: verifyError } = await supabase
        .from('schedule_rules')
        .select('id, is_active, frequency')
        .eq('subcategory_id', subcategoryId)
        .eq('is_active', true)

      if (verifyError) {
        console.error('[Wizard] Error verifying schedule rules:', verifyError)
        throw new Error(`Failed to verify schedule rule: ${verifyError.message}`)
      }

      if (!verifyRules || verifyRules.length === 0) {
        console.error('[Wizard] ⚠️ CRITICAL: No active schedule_rule found after update!')
        throw new Error('Failed to ensure schedule rule exists: No active schedule rule exists for this category. This should never happen.')
      }

      // 4. Update asset associations
      // Find the subcategory's tag
      const { data: subcategoryTag } = await supabase
        .from('tags')
        .select('id')
        .eq('brand_id', brandId)
        .eq('name', details.name.trim())
        .eq('kind', 'subcategory')
        .eq('is_active', true)
        .maybeSingle()

      if (subcategoryTag) {
        const tagId = subcategoryTag.id

        // Get currently linked assets
        const { data: existingLinks } = await supabase
          .from('asset_tags')
          .select('asset_id')
          .eq('tag_id', tagId)

        const existingAssetIds = new Set(existingLinks?.map((link: any) => link.asset_id) || [])
        const desiredAssetIds = new Set(selectedAssetIds)

        // Find assets to add
        const assetsToAdd = selectedAssetIds.filter(id => !existingAssetIds.has(id))
        // Find assets to remove
        const assetsToRemove = Array.from(existingAssetIds).filter((id: any) => !desiredAssetIds.has(id))

        // Add new associations
        if (assetsToAdd.length > 0) {
          const assetTagInserts = assetsToAdd.map(assetId => ({
            asset_id: assetId,
            tag_id: tagId
          }))

          const { error: insertError } = await supabase
            .from('asset_tags')
            .insert(assetTagInserts)

          if (insertError) {
            console.error('[Wizard] Error adding asset associations:', insertError)
            throw new Error(`Failed to update image associations: ${insertError.message}`)
          }
        }

        // Remove old associations
        if (assetsToRemove.length > 0) {
          const { error: deleteError } = await supabase
            .from('asset_tags')
            .delete()
            .eq('tag_id', tagId)
            .in('asset_id', assetsToRemove)

          if (deleteError) {
            console.error('[Wizard] Error removing asset associations:', deleteError)
            throw new Error(`Failed to update image associations: ${deleteError.message}`)
          }
        }

      } else {
        // Tag doesn't exist - create it and link assets
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

        if (!createTagError && newTag && selectedAssetIds.length > 0) {
          const assetTagInserts = selectedAssetIds.map(assetId => ({
            asset_id: assetId,
            tag_id: newTag.id
          }))

          const { error: linkError } = await supabase
            .from('asset_tags')
            .insert(assetTagInserts)

          if (linkError) {
            // Don't throw - asset associations are optional
          }
        }
      }

      return true
    } catch (error) {
      console.error('[Wizard] Error updating category:', error)
      showToast({
        title: 'Failed to update category',
        message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        type: 'error'
      })
      return false
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
      if (details.channels.length === 0) newErrors.channels = 'Select at least one channel.'
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

  // Helper function to trigger auto-push drafts (after images are saved)
  const triggerAutoPushDrafts = (subcategoryId: string) => {
    if (mode !== 'create') {
      return // Only auto-push for new subcategories
    }

    // Delay to ensure asset_tags are fully committed and visible to queries
    // Using 1500ms to account for database replication/transaction isolation
    // This ensures asset-selection can find the images when it runs
    setTimeout(() => {
      fetch('/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('[Wizard] Auto-generate: Error response:', errorData)
            throw new Error(errorData.error || 'Failed to create drafts')
          }
          const result = await response.json()
          const draftCount = result.draftsCreated || 0
          
          // Show success toast
          const message = draftCount === 1 
            ? 'Category created and 1 draft added to the Drafts tab.'
            : draftCount > 0
            ? `Category created and ${draftCount} drafts added to the Drafts tab.`
            : 'Category created. Drafts will be generated automatically.'
          
          showToast({
            title: 'Category created',
            message,
            type: 'success',
            actionLabel: 'View drafts',
            onAction: () => router.push(`/brands/${brandId}/schedule`)
          })
        })
        .catch((err) => {
          console.error('[Wizard] Auto-generate: Failed to generate drafts:', err)
          console.error('[Wizard] Auto-generate: Error details:', {
            message: err.message,
            stack: err.stack,
            name: err.name
          })
          
          // Show warning but don't block - drafts will be generated by nightly cron
          showToast({
            title: 'Category created',
            message: 'Drafts will be generated automatically within the next 30 days.',
            type: 'warning',
          })
        })
    }, 1500) // 1500ms delay to ensure DB commits are fully visible
  }

  // Handle Step 4 finish - link images to subcategory, then trigger auto-push
  const handleFinish = async () => {
    // In edit mode, update existing records
    if (mode === 'edit') {
      setIsSaving(true)
      try {
        const success = await ensureSubcategoryUpdated()
        if (success) {
          showToast({
            title: 'Category updated',
            message: 'Your changes have been saved successfully.',
            type: 'success'
          })
          router.push(`/brands/${brandId}/engine-room/categories`)
        }
        // If update failed, error toast already shown by ensureSubcategoryUpdated
      } catch (error) {
        console.error('[Wizard] Unexpected error in edit mode:', error)
        showToast({
          title: 'Failed to update category',
          message: 'An unexpected error occurred. Please try again.',
          type: 'error'
        })
      } finally {
        setIsSaving(false)
      }
      return
    }

    // Ensure subcategory is saved (defensive check)
    const saveResult = await ensureSubcategorySaved()
    if (!saveResult) {
      return // Error already shown by ensureSubcategorySaved
    }

    const subcategoryId = saveResult.subcategoryId

    setIsSaving(true)

    try {
      // Save images if any are selected
      if (selectedAssetIds.length > 0) {
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

          const existingAssetIds = new Set(existingLinks?.map((link: any) => link.asset_id) || [])
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
            
            // Verify the assets are actually linked before proceeding (defensive check)
            if (newAssetIds.length > 0) {
              const { error: verifyError } = await supabase
                .from('asset_tags')
                .select('asset_id')
                .eq('tag_id', tagId)
                .in('asset_id', newAssetIds)
              
              if (verifyError) {
                console.error('[Wizard] Could not verify asset_tags:', verifyError)
              }
            }
          }
        } else {
          throw new Error('Failed to find or create subcategory tag')
        }
      }

      // Note: Draft generation is now triggered in ensureSubcategorySaved() immediately after save
      // This ensures drafts are created right away, before navigation happens
      
      // Redirect immediately
      router.push(`/brands/${brandId}/engine-room/categories`)
    } catch (error) {
      console.error('[Wizard] Error linking images:', error)
      showToast({
        title: 'Category created',
        message: error instanceof Error ? `Images were uploaded but couldn't be linked: ${error.message}. You can manage images from the Content Library.` : 'Images were uploaded but couldn\'t be linked. You can manage images from the Content Library.',
        type: 'error'
      })
      
      // Note: Draft generation already happened in ensureSubcategorySaved(), so no need to call it here
      
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

  // Check if we can navigate to a step
  const canNavigateToStep = (targetStep: Step): boolean => {
    // Always allow going backwards
    if (targetStep <= currentStep) return true
    
    // For forward navigation, check all previous steps are valid
    for (let step = 1; step < targetStep; step++) {
      if (step === 1 && !isStep1Valid) return false
      if (step === 2 && !isStep2Valid) return false
      if (step === 3 && !isStep3Valid()) return false
      // Step 4 has no validation
    }
    return true
  }

  const handleStepClick = (targetStep: Step) => {
    if (!canNavigateToStep(targetStep)) {
      // Find first invalid step and show error
      let firstInvalidStep: Step | null = null
      for (let step = 1; step < targetStep; step++) {
        if (step === 1 && !isStep1Valid) {
          firstInvalidStep = 1
          break
        }
        if (step === 2 && !isStep2Valid) {
          firstInvalidStep = 2
          break
        }
        if (step === 3 && !isStep3Valid()) {
          firstInvalidStep = 3
          break
        }
      }
      
      if (firstInvalidStep) {
        setCurrentStep(firstInvalidStep)
        showToast({
          title: 'Please complete previous steps',
          message: `Step ${firstInvalidStep} must be completed before proceeding.`,
          type: 'error'
        })
      }
      return
    }
    
    setCurrentStep(targetStep)
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
              </div>
            </div>
          </div>

          {/* Progress Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
            <div className="flex items-center justify-between max-w-3xl">
              {STEPS.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => handleStepClick(step.number)}
                      className="flex flex-col items-center cursor-pointer"
                      disabled={!canNavigateToStep(step.number) && step.number > currentStep}
                    >
                      <div
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all
                          ${
                            isCurrentStep(step.number)
                              ? 'bg-[#6366F1] text-white'
                              : isStepComplete(step.number)
                              ? 'bg-green-500 text-white'
                              : canNavigateToStep(step.number)
                              ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
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
                              : canNavigateToStep(step.number)
                              ? 'text-gray-500 hover:text-gray-700'
                              : 'text-gray-400'
                          }
                        `}
                      >
                        {step.name}
                      </span>
                    </button>
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

                    {/* Type Selection Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {TYPE_OPTIONS.map((option) => {
                        const isSelected = subcategoryType === option.value
                        return (
                          <button
                            key={option.value}
                            onClick={() => {
                              // In edit mode, prevent type change
                              if (mode === 'edit') return
                              // Prevent selecting Schedules type (temporarily disabled)
                              if (option.value === 'dynamic_schedule') return
                              setSubcategoryType(option.value)
                            }}
                            disabled={mode === 'edit'}
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
                  </div>
                )}

                {currentStep === 2 && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-6">
                      Step 2: Details
                    </h2>

                    <div className="space-y-5">
                      {/* Occurrence Type Selector (Events only) */}
                      {subcategoryType === 'event_series' && (
                        <div className="mb-5">
                          <h3 className="text-sm font-medium text-gray-900 mb-3">
                            Are these events single dates or date ranges?
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
                          placeholder="Short, clear name"
                          error={detailsErrors.name}
                        />
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
                          placeholder="What should Ferdy mention?"
                          rows={4}
                          error={detailsErrors.detail}
                        />
                      </FormField>

                      {/* URL */}
                      <FormField label="URL (optional)">
                        <Input
                          type="url"
                          value={details.url}
                          onChange={(e) => setDetails(prev => ({ ...prev, url: e.target.value }))}
                          placeholder="Link for Ferdy to pull extra details"
                        />
                      </FormField>

                      {/* Default Hashtags */}
                      <FormField label="Default hashtags (optional)">
                        <HashtagInput
                          value={details.defaultHashtags}
                          onChange={(hashtags) => setDetails(prev => ({ ...prev, defaultHashtags: hashtags }))}
                          placeholder="brandname, event, networking"
                          helperText="Press Enter to add a hashtag"
                        />
                      </FormField>

                      {/* Channels */}
                      <FormField label="Channels" required>
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
                                  // Clear error when user selects a channel
                                  if (detailsErrors.channels) {
                                    setDetailsErrors(prev => ({ ...prev, channels: undefined }))
                                  }
                                }}
                                className="mr-2 w-4 h-4 text-[#6366F1] border-gray-300 rounded focus:ring-[#6366F1]"
                              />
                              <span className="text-sm text-gray-700">{channel.label}</span>
                            </label>
                          ))}
                        </div>
                        {detailsErrors.channels && (
                          <p className="text-red-500 text-sm mt-1">{detailsErrors.channels}</p>
                        )}
                      </FormField>

                      {/* Post Length */}
                      <FormField label="Post length (default for this category)" required>
                        <div className="flex flex-col gap-3">
                          {[
                            { value: 'short', label: 'Short', description: '1–2 sentences' },
                            { value: 'medium', label: 'Medium', description: '3–5 sentences' },
                            { value: 'long', label: 'Long', description: '6–8 sentences' },
                          ].map((option) => {
                            const isBrandDefault = option.value === defaultCopyLength
                            const description = isBrandDefault 
                              ? `${option.description} (default)` 
                              : option.description
                            return (
                              <label
                                key={option.value}
                                className="flex items-start cursor-pointer"
                              >
                                <input
                                  type="radio"
                                  name="default_copy_length"
                                  value={option.value}
                                  checked={details.default_copy_length === option.value}
                                  onChange={(e) => {
                                    setDetails(prev => ({ 
                                      ...prev, 
                                      default_copy_length: e.target.value as 'short' | 'medium' | 'long'
                                    }))
                                  }}
                                  className="mt-1 mr-3 w-4 h-4 text-[#6366F1] border-gray-300 focus:ring-[#6366F1]"
                                />
                                <div>
                                  <span className="text-sm font-medium text-gray-900">{option.label}</span>
                                  <span className="text-sm text-gray-600 ml-2">— {description}</span>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </FormField>

                      {/* Post Time Override */}
                      <FormField label="Post time (optional override)">
                        <Input
                          type="time"
                          value={details.post_time || ''}
                          onChange={(e) => {
                            const newTime = e.target.value || null
                            setDetails(prev => ({ 
                              ...prev, 
                              post_time: newTime
                            }))
                            // Also update schedule timeOfDay to keep them in sync
                            // Use newTime if set, otherwise fall back to brand default
                            const timeToUse = newTime || defaultPostTime || ''
                            setSchedule(prev => ({ ...prev, timeOfDay: timeToUse }))
                          }}
                          placeholder={defaultPostTime || '10:00'}
                        />
                        <p className="mt-2 text-sm text-gray-600">
                          {details.post_time 
                            ? `This category will post at ${details.post_time}. Leave blank to use brand default (${defaultPostTime || '10:00'}).`
                            : `Uses brand default time: ${defaultPostTime || '10:00'}. Set a time to override for this category.`
                          }
                        </p>
                      </FormField>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-6">
                      Step 3: {schedule.frequency === 'specific' ? 'Event dates' : 'Schedule'}
                    </h2>

                    {/* Specific frequency: Show occurrences manager (for all types) */}
                    {schedule.frequency === 'specific' ? (
                      <div className="space-y-6">
                        {/* Occurrences List */}
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 mb-2">
                            Event dates
                          </h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Are these events single dates or date ranges?
                          </p>
                          
                          {eventScheduling.occurrences.length === 0 ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center mb-4">
                              <p className="text-sm text-gray-600">
                                No dates added yet.
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
                                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3"
                                >
                                  <div className="flex items-start justify-between">
                                    <h4 className="text-sm font-medium text-gray-900">
                                      {eventOccurrenceType === 'single' ? `Date ${index + 1}` : `Range ${index + 1}`}
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEventScheduling(prev => ({
                                          ...prev,
                                          occurrences: prev.occurrences.filter((_, i) => i !== index)
                                        }))
                                      }}
                                      className="text-red-600 hover:text-red-700 p-1"
                                      title="Remove"
                                    >
                                      <XMarkIcon className="w-5 h-5" />
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
                                      placeholder="Additional notes..."
                                      rows={2}
                                    />
                                  </FormField>
                                  
                                  {/* URL Summary Preview */}
                                  {occurrence.summary && occurrence.summary.details && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                                      <p className="font-medium text-gray-900 mb-2">Details found:</p>
                                      <div className="space-y-1 text-gray-700">
                                        {occurrence.summary.details.dateText && (
                                          <p><strong>Date:</strong> {occurrence.summary.details.dateText}</p>
                                        )}
                                        {occurrence.summary.details.startTime && (
                                          <p><strong>Time:</strong> {occurrence.summary.details.startTime}</p>
                                        )}
                                        {occurrence.summary.details.venueName && (
                                          <p><strong>Venue:</strong> {occurrence.summary.details.venueName}</p>
                                        )}
                                        {occurrence.summary.details.priceText && (
                                          <p><strong>Price:</strong> {occurrence.summary.details.priceText}</p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
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
                            {eventOccurrenceType === 'single' ? '+ Add date' : '+ Add range'}
                          </button>
                          
                          {eventErrors.occurrences && (
                            <p className="text-red-500 text-sm mt-2">{eventErrors.occurrences}</p>
                          )}
                        </div>
                        
                        {/* Lead-time Input */}
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 mb-3">
                            Reminder schedule
                          </h3>
                          <p className="text-sm text-gray-600 mb-4">
                            When should Ferdy post about this event?
                          </p>
                          <FormField label="Days before">
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
                          </FormField>

                          {hasDateRangeSelection && (
                            <FormField label="Days During">
                              <Input
                                type="text"
                                value={daysDuringInput}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setDaysDuringInput(value)
                                  const hasInvalidChars = value.split(',').some(s => {
                                    const trimmed = s.trim()
                                    return trimmed.length > 0 && isNaN(parseInt(trimmed, 10))
                                  })
                                  if (hasInvalidChars && value.trim() !== '') {
                                    setEventErrors(prev => ({ ...prev, daysDuring: 'Use numbers separated by commas (0 for event start day)' }))
                                  } else {
                                    setEventErrors(prev => ({ ...prev, daysDuring: undefined }))
                                  }
                                }}
                                placeholder="0, 1, 2"
                                error={eventErrors.daysDuring}
                              />
                              <p className="mt-2 text-sm text-gray-600">
                                Offsets from start date (0 = start day, 1 = next day…). Leave blank to skip during-event posts.
                              </p>
                            </FormField>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Non-Events: Show standard schedule UI */
                      <div className="space-y-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">
                          How often should this post?
                        </h3>

                      {/* Frequency Selector */}
                      <FormField label="" required>
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
                                      {freq === 'weekly' && (
                                        <p className="text-xs text-gray-600">
                                          Pick days of the week
                                        </p>
                                      )}
                                      {freq === 'monthly' && (
                                        <p className="text-xs text-gray-600">
                                          Pick a day of the month
                                        </p>
                                      )}
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

                      {/* Daily fields */}
                      {schedule.frequency === 'daily' && (
                        <div className="space-y-3">
                          <FormField label="Time" required>
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
                            <p className="mt-2 text-sm text-gray-600">
                              Timezone: {brand?.timezone || 'Not set'}
                            </p>
                          </FormField>
                        </div>
                      )}

                      {/* Weekly fields */}
                      {schedule.frequency === 'weekly' && (
                        <div className="space-y-3">
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
                          <FormField label="Time" required>
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
                            <p className="mt-2 text-sm text-gray-600">
                              Timezone: {brand?.timezone || 'Not set'}
                            </p>
                          </FormField>
                        </div>
                      )}

                      {/* Monthly fields */}
                      {schedule.frequency === 'monthly' && (
                        <div className="space-y-4">
                          {/* Mode A: Specific days of the month */}
                          <div>
                            <FormField label="Specific days of the month">
                              <div className="flex flex-wrap gap-2">
                                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                                  const isSelected = schedule.daysOfMonth.includes(day)
                                  return (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => {
                                        // Toggle day selection
                                        const newDays = isSelected
                                          ? schedule.daysOfMonth.filter(d => d !== day)
                                          : [...schedule.daysOfMonth, day].sort((a, b) => a - b)
                                        
                                        setSchedule(prev => ({
                                          ...prev,
                                          daysOfMonth: newDays,
                                          // Clear nth weekday when selecting days
                                          nthWeek: null,
                                          weekday: null,
                                          // Keep legacy dayOfMonth for compatibility
                                          dayOfMonth: newDays.length > 0 ? newDays[0] : null
                                        }))
                                        
                                        if (scheduleErrors.dayOfMonth) {
                                          setScheduleErrors(prev => ({ ...prev, dayOfMonth: undefined }))
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                        isSelected
                                          ? 'bg-[#6366F1] text-white'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      }`}
                                    >
                                      {day}
                                    </button>
                                  )
                                })}
                              </div>
                            </FormField>
                          </div>
                          
                          {/* Mode B: Nth weekday */}
                          <div>
                            <FormField label="Or post on">
                              <div className="flex gap-3 items-center">
                                <select
                                  value={schedule.nthWeek !== null ? schedule.nthWeek : ''}
                                  onChange={(e) => {
                                    const value = e.target.value ? parseInt(e.target.value, 10) : null
                                    setSchedule(prev => ({
                                      ...prev,
                                      nthWeek: value,
                                      // Clear days of month when selecting nth weekday
                                      daysOfMonth: [],
                                      dayOfMonth: null
                                    }))
                                    if (scheduleErrors.dayOfMonth) {
                                      setScheduleErrors(prev => ({ ...prev, dayOfMonth: undefined }))
                                    }
                                  }}
                                  disabled={schedule.daysOfMonth.length > 0}
                                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  <option value="">Select</option>
                                  <option value="1">1st</option>
                                  <option value="2">2nd</option>
                                  <option value="3">3rd</option>
                                  <option value="4">4th</option>
                                  <option value="5">Last</option>
                                </select>
                                <select
                                  value={schedule.weekday !== null ? schedule.weekday : ''}
                                  onChange={(e) => {
                                    const value = e.target.value ? parseInt(e.target.value, 10) : null
                                    setSchedule(prev => ({ ...prev, weekday: value }))
                                    if (scheduleErrors.dayOfMonth) {
                                      setScheduleErrors(prev => ({ ...prev, dayOfMonth: undefined }))
                                    }
                                  }}
                                  disabled={schedule.daysOfMonth.length > 0}
                                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  <option value="">Select day</option>
                                  {[
                                    { value: 1, label: 'Monday' },
                                    { value: 2, label: 'Tuesday' },
                                    { value: 3, label: 'Wednesday' },
                                    { value: 4, label: 'Thursday' },
                                    { value: 5, label: 'Friday' },
                                    { value: 6, label: 'Saturday' },
                                    { value: 7, label: 'Sunday' },
                                  ].map(day => (
                                    <option key={day.value} value={day.value}>
                                      {day.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {scheduleErrors.dayOfMonth && (
                                <p className="text-red-500 text-sm mt-1">{scheduleErrors.dayOfMonth}</p>
                              )}
                            </FormField>
                          </div>
                          
                          <FormField label="Time" required>
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
                            <p className="mt-2 text-sm text-gray-600">
                              Timezone: {brand?.timezone || 'Not set'}
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
                    <h2 className="text-lg font-medium text-gray-900 mb-6">
                      Step 4: Images
                    </h2>

                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                      Choose images
                    </h3>

                    {/* Mode Toggle - Tabs */}
                    <div className="mb-6 border-b border-gray-200">
                      <div className="flex space-x-8">
                        <button
                          type="button"
                          onClick={() => setImageMode('upload')}
                          className={`
                            px-1 py-4 text-sm font-medium border-b-2 transition-colors
                            ${
                              imageMode === 'upload'
                                ? 'border-[#6366F1] text-gray-900 font-semibold'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                          `}
                        >
                          Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageMode('existing')}
                          className={`
                            px-1 py-4 text-sm font-medium border-b-2 transition-colors
                            ${
                              imageMode === 'existing'
                                ? 'border-[#6366F1] text-gray-900 font-semibold'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                          `}
                        >
                          From library
                        </button>
                      </div>
                    </div>

                    {/* Upload Mode */}
                    {imageMode === 'upload' && (
                      <div className="space-y-4">

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

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            {selectedAssetIds.length > 0 ? (
                              <>Selected: <span className="font-semibold">{selectedAssetIds.length}</span> image{selectedAssetIds.length !== 1 ? 's' : ''}</>
                            ) : (
                              'No images selected'
                            )}
                          </p>
                        </div>
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
                          {mode === 'edit' ? 'Saving...' : 'Saving...'}
                        </>
                      ) : (
                        <>
                          {mode === 'edit' ? 'Save' : 'Finish'}
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
        
        {/* Loading Modal */}
        <Modal
          isOpen={isSaving}
          onClose={() => {}} // Prevent closing during save
          title="Creating category…"
          showCloseButton={false}
        >
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#6366F1] border-t-transparent mb-4"></div>
            <p className="text-gray-600 text-center">
              Saving your category and generating drafts. This can take a few seconds.
            </p>
          </div>
        </Modal>
        
      </AppLayout>
    </RequireAuth>
  )
}

// Default export for Next.js page - no custom props allowed
