'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase-browser'
import Modal from '@/components/ui/Modal'
import { FormField } from '@/components/ui/Form'
import { Input } from '@/components/ui/Input'
import { normalizeHashtags } from '@/lib/utils/hashtags'
import { useBrand } from '@/hooks/useBrand'
import { EventOccurrencesManager } from './EventOccurrencesManager'
import { useCategories } from '@/hooks/useCategories'
import { SubcategoryType } from '@/types/subcategories'

interface SubcategoryData {
  name: string
  detail?: string
  url?: string
  subcategory_type: SubcategoryType
  hashtags: string[]
  channels: string[]
}

// Type-specific settings interfaces
interface EventSeriesSettings {
  default_lead_times?: number[]
}

interface EvergreenProgrammeSettings {
  highlight_points?: string[]
}

interface PromoOfferSettings {
  promo_length_days?: number | null
  auto_expire?: boolean
}

interface RotatingScheduleSettings {
  url_refresh_frequency?: 'daily' | 'weekly'
}

interface ContentPillarSettings {
  number_of_items?: number | null
}

type SubcategorySettings = 
  | EventSeriesSettings 
  | EvergreenProgrammeSettings 
  | PromoOfferSettings 
  | RotatingScheduleSettings 
  | ContentPillarSettings 
  | Record<string, never>

interface ScheduleRuleData {
  frequency: 'daily' | 'weekly' | 'monthly' | 'specific'
  timeOfDay: string  // For daily/weekly/monthly
  timesOfDay: string[]  // For specific date/range
  daysOfWeek: string[]
  daysOfMonth: number[]
  nthWeek?: number
  weekday?: number
  channels: string[]
  // Specific date/range fields
  isDateRange: boolean  // Single date vs date range
  startDate: string  // YYYY-MM-DD format
  endDate: string  // YYYY-MM-DD format (same as startDate for single date)
  daysBefore: number[]  // e.g., [5, 3, 1]
  daysDuring: number[]  // e.g., [2, 3, 5] (only for ranges)
  timezone: string  // IANA timezone
}

interface SubcategoryScheduleFormProps {
  isOpen: boolean
  onClose: () => void
  brandId: string
  categoryId?: string
  editingSubcategory?: {
    id: string
    name: string
    detail?: string
    url?: string
    subcategory_type?: SubcategoryType
    settings?: Record<string, any>
    hashtags: string[]
    channels?: string[]
  }
  editingScheduleRule?: {
    id: string
    frequency: string
    timeOfDay: string
    daysOfWeek: string[]
    daysOfMonth: number[]
    nthWeek?: number
    weekday?: number
    channels: string[]
  }
  onSuccess: () => void
  categories?: Array<{ id: string; name: string }>  // For category selection
  onCreateCategory?: (name: string) => Promise<{ id: string; name: string }>  // For creating new category
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

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' }
]

const NTH_WEEK_OPTIONS = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: 5, label: 'Last' }
]

const CHANNELS = [
  { value: 'instagram', label: 'Instagram Feed' },
  { value: 'instagram_story', label: 'Instagram Story' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn Profile' },
]

const SUBCATEGORY_TYPE_OPTIONS: Array<{ value: SubcategoryType; label: string }> = [
  { value: 'event_series', label: 'Event Series (multiple dates, ticket links, launches, webinars)' },
  { value: 'service_or_programme', label: 'Evergreen Programme (ongoing offer, membership, recurring service)' },
  { value: 'promo_or_offer', label: 'Promo / Offer (sales, discounts, time-bound promotions)' },
  { value: 'dynamic_schedule', label: 'Rotating / Schedule (timetables, classes, rotating availability scraped from a URL)' },
  { value: 'content_series', label: 'Content Pillar (weekly themes, meet-the-team, recurring content)' },
  { value: 'other', label: 'Other' },
]

const SUBCATEGORY_TYPE_HELP_TEXT: Record<SubcategoryType, { title: string; body: string }> = {
  event_series: {
    title: "Event Series",
    body: "Use this for anything with specific dates: fixtures, launches, webinars, workshops or in-person events. You'll add one or more event dates below."
  },
  service_or_programme: {
    title: "Evergreen Programme",
    body: "Use this for ongoing offers like memberships, programmes, retainers or recurring services. Ferdy will treat this as something you can talk about any time."
  },
  promo_or_offer: {
    title: "Promo / Offer",
    body: "Use this for time-bound sales, discounts, launches or special offers. You can combine this with dates if the promo has a clear start or end."
  },
  dynamic_schedule: {
    title: "Rotating / Schedule",
    body: "Use this for classes, timetables, rotating schedules or availability that lives on a URL. Ferdy can pull fresh information from that page when generating posts."
  },
  content_series: {
    title: "Content Pillar",
    body: "Use this for recurring content themes like 'Meet the team', 'Weekly tip' or 'Player spotlight'. Each post focuses on a different item in the series."
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

// Define allowed schedule frequencies per subcategory type
// This ensures each type only shows relevant scheduling options
type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'specific'

const ALLOWED_FREQUENCIES_BY_TYPE: Record<SubcategoryType, ScheduleFrequency[]> = {
  event_series: ['weekly', 'monthly', 'specific'],              // Event Series: supports specific dates
  service_or_programme: ['weekly', 'monthly'],                  // Evergreen Programme: no daily or specific
  promo_or_offer: ['weekly', 'monthly', 'specific'],            // Promo / Offer: supports specific dates
  dynamic_schedule: ['daily', 'weekly', 'monthly'],             // Rotating / Schedule: no specific dates
  content_series: ['weekly', 'monthly'],                        // Content Pillar: no daily or specific
  other: ['daily', 'weekly', 'monthly', 'specific'],           // Other: all options available
  unspecified: ['daily', 'weekly', 'monthly', 'specific'],     // Unspecified: all options available (backward compatibility)
}

const getScheduleSectionTitle = (subcategoryType: SubcategoryType | undefined): string => {
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

export function SubcategoryScheduleForm({
  isOpen,
  onClose,
  brandId,
  categoryId: initialCategoryId,
  editingSubcategory,
  editingScheduleRule,
  onSuccess,
  categories: externalCategories,
  onCreateCategory: externalCreateCategory
}: SubcategoryScheduleFormProps) {
  // Fetch brand for timezone
  const { brand } = useBrand(brandId)
  
  // Fetch categories if not provided
  const { categories: hookCategories, createCategory: hookCreateCategory } = useCategories(brandId)
  const categories = externalCategories || hookCategories || []
  const createCategory = externalCreateCategory || (async (name: string) => {
    const result = await hookCreateCategory(name, brandId)
    return { id: result.id, name: result.name }
  })
  
  // Category selection state
  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>('existing')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(initialCategoryId)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  // Track the current subcategory ID (for EventOccurrencesManager)
  const [currentSubcategoryId, setCurrentSubcategoryId] = useState<string | null>(
    editingSubcategory?.id || null
  )

  // Subcategory state
  const [subcategoryData, setSubcategoryData] = useState<SubcategoryData>({
    name: '',
    detail: '',
    url: '',
    subcategory_type: 'other',
    hashtags: [],
    channels: []
  })

  // Schedule rule state
  // Default timezone to brand timezone, fallback to Pacific/Auckland
  const [scheduleData, setScheduleData] = useState<ScheduleRuleData>({
    frequency: 'weekly',
    timeOfDay: '', // Will be auto-populated from brand.default_post_time if empty
    timesOfDay: [],
    daysOfWeek: [],
    daysOfMonth: [],
    nthWeek: undefined,
    weekday: undefined,
    channels: [],
    isDateRange: false,
    startDate: '',
    endDate: '',
    daysBefore: [],
    daysDuring: [],
    timezone: brand?.timezone || 'Pacific/Auckland'  // Default to brand timezone
  })

  // Update timezone and auto-populate timeOfDay when brand loads (only for new subcategories)
  useEffect(() => {
    if (brand && !editingScheduleRule && !editingSubcategory) {
      setScheduleData(prev => {
        const updates: Partial<ScheduleRuleData> = {}
        
        // Update timezone
        if (brand.timezone && prev.timezone !== brand.timezone) {
          updates.timezone = brand.timezone
        }
        
        // Auto-populate timeOfDay from default_post_time if it's empty
        if (brand.default_post_time && !prev.timeOfDay) {
          const defaultTime = typeof brand.default_post_time === 'string' 
            ? brand.default_post_time.substring(0, 5) // Extract HH:MM from HH:MM:SS
            : ''
          if (defaultTime) {
            updates.timeOfDay = defaultTime
          }
        }
        
        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
          return { ...prev, ...updates }
        }
        return prev
      })
    }
  }, [brand?.timezone, brand?.default_post_time, editingScheduleRule, editingSubcategory])

  // Auto-reset frequency when subcategory type changes (if current frequency is not allowed)
  // Skip this for existing subcategories to preserve legacy data
  useEffect(() => {
    if (!editingSubcategory && subcategoryData.subcategory_type) {
      const currentType = subcategoryData.subcategory_type || 'other'
      const allowedFrequencies = ALLOWED_FREQUENCIES_BY_TYPE[currentType]
      const currentFrequency = scheduleData.frequency
      
      // If current frequency is not allowed for this type, reset to first allowed frequency
      if (!allowedFrequencies.includes(currentFrequency)) {
        const newFrequency = allowedFrequencies[0] || 'weekly'
        setScheduleData(prev => ({ ...prev, frequency: newFrequency as ScheduleFrequency }))
      }
    }
  }, [subcategoryData.subcategory_type, editingSubcategory])

  // Reset settings when subcategory type changes
  // Track the previous type to detect changes
  const [previousType, setPreviousType] = useState<SubcategoryType | undefined>(subcategoryData.subcategory_type)
  
  useEffect(() => {
    const currentType = subcategoryData.subcategory_type || 'other'
    // If type changed, reset to defaults for new type
    if (previousType !== currentType) {
      setSettings(getDefaultSettings(currentType))
      setPreviousType(currentType)
    }
  }, [subcategoryData.subcategory_type, previousType])

  // Helper state for specific date inputs
  const [daysBeforeInput, setDaysBeforeInput] = useState('')
  const [daysDuringInput, setDaysDuringInput] = useState('')
  const [newTimeInput, setNewTimeInput] = useState('')

  // Type-specific settings state
  const [settings, setSettings] = useState<Record<string, any>>({})

  // Form state
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hashtagInput, setHashtagInput] = useState('')
  const [draftOccurrences, setDraftOccurrences] = useState<Array<{
    id: string
    frequency: 'date' | 'date_range'
    start_date: string
    end_date: string | null
    times_of_day: string[]
    channels: string[]
    timezone: string
    url?: string | null
  }>>([])

  // Helper to parse comma-separated number array
  const parseNumberArray = (str: string): number[] => {
    if (!str.trim()) return []
    return str
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0)
  }

  // Helper to parse comma-separated string array
  const parseStringArray = (str: string): string[] => {
    if (!str.trim()) return []
    return str
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }

  // Helper to update settings
  const updateSettings = (partialSettings: Partial<Record<string, any>>) => {
    setSettings(prev => ({ ...prev, ...partialSettings }))
  }

  // Get default settings for a type
  const getDefaultSettings = (type: SubcategoryType): Record<string, any> => {
    switch (type) {
      case 'event_series':
        return { default_lead_times: [] }
      case 'service_or_programme':
        return { highlight_points: [] }
      case 'promo_or_offer':
        return { promo_length_days: null, auto_expire: false }
      case 'dynamic_schedule':
        return { url_refresh_frequency: 'weekly' }
      case 'content_series':
        return { number_of_items: null }
      case 'other':
      case 'unspecified':
      default:
        return {}
    }
  }

  // Initialize form with editing data
  useEffect(() => {
    // Update currentSubcategoryId when editingSubcategory changes
    // This is critical for EventOccurrencesManager to fetch occurrences
    const newSubcategoryId = editingSubcategory?.id || null
    setCurrentSubcategoryId(newSubcategoryId)
    
    // If editing a subcategory with specific frequency, ensure frequency is set
    // This is critical so EventOccurrencesManager renders and can fetch occurrences
    // If editingScheduleRule has frequency='specific', it will be set below
    // If not, we need to check if the subcategory has any specific frequency occurrences
    const checkAndSetSpecificFrequency = async () => {
      if (newSubcategoryId && !editingScheduleRule) {
        // Check if this subcategory has any specific frequency occurrences
        const { data: specificRules } = await supabase
          .from('schedule_rules')
          .select('id, frequency')
          .eq('subcategory_id', newSubcategoryId)
          .eq('frequency', 'specific')
          .is('archived_at', null)
          .limit(1)
        
        if (specificRules && specificRules.length > 0) {
          // This subcategory has specific frequency occurrences, set frequency to 'specific'
          setScheduleData(prev => ({ ...prev, frequency: 'specific' }))
        }
      }
    }
    
    if (editingSubcategory && !editingScheduleRule) {
      checkAndSetSpecificFrequency()
    }

    if (editingSubcategory) {
      const type = editingSubcategory.subcategory_type || 'other'
      setSubcategoryData({
        name: editingSubcategory.name,
        detail: editingSubcategory.detail || '',
        url: editingSubcategory.url || '',
        subcategory_type: type,
        hashtags: editingSubcategory.hashtags || [],
        channels: editingSubcategory.channels || []
      })
      // Load settings if available, otherwise use defaults for the type
      const existingSettings = editingSubcategory.settings || {}
      if (existingSettings && Object.keys(existingSettings).length > 0) {
        // Merge existing settings with defaults to ensure all fields are present
        const defaults = getDefaultSettings(type)
        setSettings({ ...defaults, ...existingSettings })
      } else {
        setSettings(getDefaultSettings(type))
      }
      // Initialize previousType to prevent reset on first render
      setPreviousType(type)
      // Prefill schedule rule channels from subcategory channels if schedule rule has no channels
      if (editingSubcategory.channels && editingSubcategory.channels.length > 0) {
        setScheduleData(prev => {
          // Only update if schedule rule channels are empty
          if (!prev.channels || prev.channels.length === 0) {
            return { ...prev, channels: editingSubcategory.channels || [] }
          }
          return prev
        })
      }
    } else {
      setSubcategoryData({
        name: '',
        detail: '',
        url: '',
        subcategory_type: 'other',
        hashtags: [],
        channels: []
      })
      setSettings({})
      setPreviousType('other')
    }

    if (editingScheduleRule) {
      const freq = editingScheduleRule.frequency as 'daily' | 'weekly' | 'monthly' | 'specific'
      const editingRule = editingScheduleRule as {
        frequency: string
        timeOfDay?: string
        timesOfDay?: string[]
        daysOfWeek?: string[]
        daysOfMonth?: number[]
        nthWeek?: number
        weekday?: number
        channels?: string[]
        isDateRange?: boolean
        startDate?: string
        endDate?: string
        daysBefore?: number[]
        daysDuring?: number[]
        timezone?: string
      }
      
      // Extract timeOfDay from timesOfDay array if present, otherwise use timeOfDay directly
      const firstTime = editingRule.timesOfDay && editingRule.timesOfDay.length > 0 
        ? editingRule.timesOfDay[0] 
        : editingRule.timeOfDay || ''
      
      setScheduleData({
        frequency: freq,
        timeOfDay: firstTime,
        timesOfDay: editingRule.timesOfDay && editingRule.timesOfDay.length > 0 
          ? editingRule.timesOfDay 
          : (firstTime ? [firstTime] : []),
        daysOfWeek: editingRule.daysOfWeek || [],
        daysOfMonth: editingRule.daysOfMonth || [],
        nthWeek: editingRule.nthWeek,
        weekday: editingRule.weekday,
        channels: editingRule.channels || [],
        isDateRange: editingRule.isDateRange || false,
        startDate: editingRule.startDate || '',
        endDate: editingRule.endDate || '',
        daysBefore: editingRule.daysBefore || [],
        daysDuring: editingRule.daysDuring || [],
        timezone: editingRule.timezone || 'Pacific/Auckland'
      })
      setDaysBeforeInput((editingRule.daysBefore || []).join(','))
      setDaysDuringInput((editingRule.daysDuring || []).join(','))
    } else {
      // Auto-populate timeOfDay from brand.default_post_time if available
      const defaultTime = brand?.default_post_time 
        ? (typeof brand.default_post_time === 'string' 
            ? brand.default_post_time.substring(0, 5) // Extract HH:MM from HH:MM:SS
            : '')
        : ''
      
      setScheduleData({
        frequency: 'weekly',
        timeOfDay: defaultTime,
        timesOfDay: [],
        daysOfWeek: [],
        daysOfMonth: [],
        nthWeek: undefined,
        weekday: undefined,
        channels: [],
        isDateRange: false,
        startDate: '',
        endDate: '',
        daysBefore: [],
        daysDuring: [],
        timezone: brand?.timezone || 'Pacific/Auckland'
      })
      setDaysBeforeInput('')
      setDaysDuringInput('')
    }

    setErrors({})
    setHashtagInput('')
    setNewTimeInput('')
    setDraftOccurrences([])
  }, [editingSubcategory, editingScheduleRule, isOpen])

  // Helper functions for specific date/range
  const parseDaysInput = (input: string): number[] => {
    if (!input.trim()) return []
    return input
      .split(',')
      .map(d => parseInt(d.trim()))
      .filter(d => !isNaN(d) && d >= 0)
  }

  const updateDaysBefore = (input: string) => {
    setDaysBeforeInput(input)
    const parsed = parseDaysInput(input)
    setScheduleData(prev => ({ ...prev, daysBefore: parsed }))
  }

  const updateDaysDuring = (input: string) => {
    setDaysDuringInput(input)
    const parsed = parseDaysInput(input)
    setScheduleData(prev => ({ ...prev, daysDuring: parsed }))
  }

  const addTime = () => {
    if (newTimeInput.trim() && !scheduleData.timesOfDay.includes(newTimeInput.trim())) {
      setScheduleData(prev => ({
        ...prev,
        timesOfDay: [...prev.timesOfDay, newTimeInput.trim()].sort()
      }))
      setNewTimeInput('')
    }
  }

  const removeTime = (timeToRemove: string) => {
    setScheduleData(prev => ({
      ...prev,
      timesOfDay: prev.timesOfDay.filter(t => t !== timeToRemove)
    }))
  }

  // Validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    // Validate subcategory type - required
    if (!subcategoryData.subcategory_type) {
      newErrors.subcategoryType = 'Please choose a subcategory type.'
    }

    // Validate frequency matches allowed frequencies for this type
    const currentType = subcategoryData.subcategory_type || 'other'
    const allowedFrequencies = ALLOWED_FREQUENCIES_BY_TYPE[currentType]
    if (!allowedFrequencies.includes(scheduleData.frequency)) {
      const allowedList = allowedFrequencies.map(f => {
        if (f === 'specific') return 'Specific Date/Range'
        return f.charAt(0).toUpperCase() + f.slice(1)
      }).join(', ')
      newErrors.frequency = `This schedule type isn't supported for this subcategory type. Please choose one of: ${allowedList}.`
    }

    // Simplified validation - only check essential fields
    if (!subcategoryData.name.trim()) {
      newErrors.subcategoryName = 'Name is required'
    }

    // Description (detail) is required for all frequency types
    if (!subcategoryData.detail || !subcategoryData.detail.trim()) {
      newErrors.subcategoryDetail = 'Description is required'
    }

    // Validate channels - at least one channel is required
    if (!subcategoryData.channels || subcategoryData.channels.length === 0) {
      newErrors.channels = 'At least one channel is required'
    }

    // Validate daily frequency - time of day is required
    if (scheduleData.frequency === 'daily') {
      if (!scheduleData.timeOfDay || !scheduleData.timeOfDay.trim()) {
        newErrors.timeOfDay = 'Time of day is required'
      }
    }

    // Validate weekly frequency fields
    if (scheduleData.frequency === 'weekly') {
      if (scheduleData.daysOfWeek.length === 0) {
        newErrors.daysOfWeek = 'At least one day of the week is required'
      }
      if (!scheduleData.timeOfDay || !scheduleData.timeOfDay.trim()) {
        newErrors.timeOfDay = 'Time of day is required'
      }
    }

    // Validate monthly frequency fields
    if (scheduleData.frequency === 'monthly') {
      if (scheduleData.daysOfMonth.length === 0 && (!scheduleData.nthWeek || !scheduleData.weekday)) {
        newErrors.monthlyType = 'Select either specific days of the month or nth weekday option'
      }
      if (!scheduleData.timeOfDay || !scheduleData.timeOfDay.trim()) {
        newErrors.timeOfDay = 'Time of day is required'
      }
    }

    // Validate specific date/range fields
    // Only validate these when creating new (not editing existing subcategory)
    // When editing, all scheduling is per-occurrence and managed separately
    if (scheduleData.frequency === 'specific' && !editingSubcategory) {
      if (!scheduleData.startDate) {
        newErrors.startDate = 'Start date is required'
      }
      if (scheduleData.isDateRange && !scheduleData.endDate) {
        newErrors.endDate = 'End date is required for date ranges'
      }
      if (scheduleData.startDate && scheduleData.endDate && scheduleData.isDateRange) {
        const start = new Date(scheduleData.startDate)
        const end = new Date(scheduleData.endDate)
        if (end < start) {
          newErrors.endDate = 'End date must be after start date'
        }
      }
      if (scheduleData.timesOfDay.length === 0) {
        newErrors.timesOfDay = 'At least one time of day is required'
      }
      // Ensure days_before and days_during have valid non-negative integers
      if (scheduleData.daysBefore.some(d => d < 0)) {
        newErrors.daysBefore = 'Days before must be non-negative'
      }
      if (scheduleData.isDateRange && scheduleData.daysDuring.some(d => d < 0)) {
        newErrors.daysDuring = 'Days during must be non-negative'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [subcategoryData, scheduleData, editingSubcategory])

  // Hashtag management
  const addHashtag = () => {
    if (hashtagInput.trim()) {
      // Normalize hashtags when adding
      const newTags = [...subcategoryData.hashtags, hashtagInput.trim()];
      const normalized = normalizeHashtags(newTags);
      setSubcategoryData(prev => ({
        ...prev,
        hashtags: normalized
      }))
      setHashtagInput('')
    }
  }

  const removeHashtag = (tagToRemove: string) => {
    setSubcategoryData(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleHashtagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addHashtag()
    }
  }

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted, validating...')
    console.log('Form state:', {
      subcategoryName: subcategoryData.name,
      channels: subcategoryData.channels,
      frequency: scheduleData.frequency,
      draftOccurrences: draftOccurrences.length,
      currentSubcategoryId,
      isFormValid: isFormValid
    })
    
    if (!validateForm()) {
      console.log('Form validation failed')
      setErrors({ submit: 'Please fill in all required fields' })
      return
    }

    if (!isFormValid) {
      console.log('Form is not valid according to isFormValid')
      setErrors({ submit: 'Please fill in all required fields' })
      return
    }

    console.log('Form validation passed, starting save...')
    setIsLoading(true)
    setErrors({}) // Clear any previous errors

    try {
      // Handle category creation/selection first (only for new subcategories)
      let finalCategoryId = initialCategoryId
      
      if (!editingSubcategory) {
        if (categoryMode === 'new') {
          if (!newCategoryName.trim()) {
            setErrors({ submit: 'Category name is required' })
            setIsLoading(false)
            return
          }
          setIsCreatingCategory(true)
          try {
            const newCategory = await createCategory(newCategoryName.trim())
            finalCategoryId = newCategory.id
            setSelectedCategoryId(newCategory.id)
          } catch (err) {
            console.error('Failed to create category:', err)
            setErrors({ submit: 'Failed to create category. Please try again.' })
            setIsLoading(false)
            setIsCreatingCategory(false)
            return
          } finally {
            setIsCreatingCategory(false)
          }
        } else {
          if (!selectedCategoryId) {
            setErrors({ submit: 'Please select a category' })
            setIsLoading(false)
            return
          }
          finalCategoryId = selectedCategoryId
        }
      }

      // Save subcategory
      let subcategoryId: string

      if (editingSubcategory) {
        // Normalize hashtags before saving
        const normalizedHashtags = normalizeHashtags(subcategoryData.hashtags || []);
        
        // Update existing subcategory
        // IMPORTANT: Only update the specified fields, preserve category_id
        // Detail is required - validate before saving
        if (!subcategoryData.detail || !subcategoryData.detail.trim()) {
          setErrors({ submit: 'Description is required' })
          setIsLoading(false)
          return
        }

        console.info('[SubcategoryScheduleForm] Updating subcategory:', {
          id: editingSubcategory.id,
          name: subcategoryData.name,
          hasDetail: !!subcategoryData.detail,
          hasUrl: !!subcategoryData.url
        })

        const { data, error } = await supabase
          .from('subcategories')
          .update({
            name: subcategoryData.name,
            detail: subcategoryData.detail.trim(),
            url: subcategoryData.url || null,
            default_hashtags: normalizedHashtags,
            channels: subcategoryData.channels.length > 0 ? subcategoryData.channels : null,
            subcategory_type: subcategoryData.subcategory_type || 'other',
            settings: settings || {}
            // NOTE: category_id is NOT included in update - it must be preserved
          })
          .eq('id', editingSubcategory.id)
          .select()
          .single()

        console.info('[SubcategoryScheduleForm] Update response:', { data, error })

        if (error) {
          console.error('[SubcategoryScheduleForm] Subcategory update error:', error)
          throw error
        }
        subcategoryId = data.id
        
        // Refresh URL summary if URL is present (fire-and-forget)
        // Always refresh when URL is present - the API will handle if URL hasn't changed
        if (subcategoryData.url && subcategoryData.url.trim()) {
          console.log('[SubcategoryScheduleForm] Triggering URL summary refresh for subcategory:', subcategoryId, 'URL:', subcategoryData.url);
          // Small delay to ensure database transaction is committed
          setTimeout(() => {
            // Fire-and-forget: call API to refresh URL summary
            fetch(`/api/subcategories/${subcategoryId}/refresh-url-summary`, {
              method: 'POST',
            })
            .then(response => {
              if (!response.ok) {
                console.warn('[SubcategoryScheduleForm] URL summary refresh API returned non-OK status:', response.status);
              } else {
                console.log('[SubcategoryScheduleForm] URL summary refresh initiated successfully');
              }
            })
            .catch(err => {
              console.error('[SubcategoryScheduleForm] Error initiating URL summary refresh:', err);
              // Don't block the save flow
            });
          }, 500); // 500ms delay to ensure DB commit
        }
      } else {
        // Normalize hashtags before saving
        const normalizedHashtags = normalizeHashtags(subcategoryData.hashtags || []);
        
        // Check if a subcategory with this name already exists in this category
        // (might be from a failed deletion or timing issue)
        const { data: existingSubcat, error: checkError } = await supabase
          .from('subcategories')
          .select('id')
          .eq('brand_id', brandId)
          .eq('category_id', finalCategoryId)
          .ilike('name', subcategoryData.name)
          .maybeSingle()

        if (checkError) {
          console.warn('Error checking for existing subcategory:', checkError)
        }

        // If a subcategory with the same name exists, delete it first
        // This handles cases where deletion didn't complete properly
        if (existingSubcat) {
          console.log('Found existing subcategory with same name, deleting it first:', existingSubcat.id)
          // Delete associated schedule_rules first
          await supabase
            .from('schedule_rules')
            .delete()
            .eq('subcategory_id', existingSubcat.id)
          
          // Delete the existing subcategory
          const { error: deleteError } = await supabase
            .from('subcategories')
            .delete()
            .eq('id', existingSubcat.id)

          if (deleteError) {
            console.error('Failed to delete existing subcategory:', deleteError)
            // Continue anyway - might be a different record
          }
        }
        
        // Create new subcategory
        // Detail is required - validate before saving
        if (!subcategoryData.detail || !subcategoryData.detail.trim()) {
          setErrors({ submit: 'Description is required' })
          setIsLoading(false)
          return
        }

        console.info('[SubcategoryScheduleForm] Creating subcategory:', {
          name: subcategoryData.name,
          categoryId: finalCategoryId,
          hasDetail: !!subcategoryData.detail,
          hasUrl: !!subcategoryData.url
        })

        const { data, error } = await supabase
          .from('subcategories')
          .insert({
            brand_id: brandId,
            category_id: finalCategoryId,
            name: subcategoryData.name,
            detail: subcategoryData.detail.trim(),
            url: subcategoryData.url || null,
            default_hashtags: normalizedHashtags,
            channels: subcategoryData.channels.length > 0 ? subcategoryData.channels : null,
            subcategory_type: subcategoryData.subcategory_type || 'other',
            settings: settings || {}
          })
          .select()
          .single()

        console.info('[SubcategoryScheduleForm] Insert response:', { data, error })

        if (error) {
          console.error('[SubcategoryScheduleForm] Subcategory insert error:', error)
          // Provide more helpful error message
          if (error.code === '23505') {
            throw new Error(`A subcategory with the name "${subcategoryData.name}" already exists in this category. Please delete it first or use a different name.`)
          }
          throw error
        }
        subcategoryId = data.id
        console.info('[SubcategoryScheduleForm] Successfully created subcategory:', subcategoryId)
        // Update currentSubcategoryId so EventOccurrencesManager can work
        setCurrentSubcategoryId(subcategoryId)
        
        // Refresh URL summary if URL is present (fire-and-forget)
        if (subcategoryData.url && subcategoryData.url.trim()) {
          // Fire-and-forget: call API to refresh URL summary
          fetch(`/api/subcategories/${subcategoryId}/refresh-url-summary`, {
            method: 'POST',
          }).catch(err => {
            console.error('Error initiating URL summary refresh:', err);
            // Don't block the save flow
          });
        }
      }

      // Upsert schedule rule - one active rule per subcategory
      // SKIP this for specific frequency when editing - all scheduling is per-occurrence
      const isEditingSpecificFrequency = editingSubcategory && scheduleData.frequency === 'specific'
      
      if (!isEditingSpecificFrequency) {
        // First, check if a rule already exists for this subcategory
        const { data: existingRules } = await supabase
          .from('schedule_rules')
          .select('id')
          .eq('brand_id', brandId)
          .eq('subcategory_id', subcategoryId)
          .eq('is_active', true)
          .limit(1)

      // Prepare base schedule rule data
      const baseRuleData = {
        brand_id: brandId,
        subcategory_id: subcategoryId,
        category_id: finalCategoryId || null,
        name: `${subcategoryData.name} – ${scheduleData.frequency.charAt(0).toUpperCase() + scheduleData.frequency.slice(1)}`,
        frequency: scheduleData.frequency,
        channels: subcategoryData.channels.length > 0 ? subcategoryData.channels : null,
        is_active: true,
        tone: null,
        hashtag_rule: null,
        image_tag_rule: null
      }

      // Prepare schedule rule data based on frequency type
      const scheduleRuleData: typeof baseRuleData & {
        time_of_day?: string[] | null
        days_of_week?: number[] | null
        day_of_month?: number[] | null
        nth_week?: number | null
        weekday?: number | null
        start_date?: string | null
        end_date?: string | null
        days_before?: number[] | null
        days_during?: number[] | null
        timezone?: string | null
      } = {
        ...baseRuleData
      }

      // Add fields based on frequency type
      if (scheduleData.frequency === 'daily') {
        // Daily: time_of_day as array (single element)
        scheduleRuleData.time_of_day = scheduleData.timeOfDay 
          ? [scheduleData.timeOfDay] 
          : null
        // Explicitly don't set other fields (optional fields will be undefined/null)
      } else if (scheduleData.frequency === 'weekly') {
        // Weekly: days_of_week as integer array, time_of_day as array (single element)
        if (scheduleData.daysOfWeek.length > 0) {
          // Map string days to integers (mon -> 1, tue -> 2, etc.), filter invalid, sort, and remove duplicates
          const dayMap: Record<string, number> = { 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 7 }
          const mappedDays = scheduleData.daysOfWeek
            .map(d => dayMap[d] || 0)
            .filter(d => d > 0 && d <= 7) // Valid range: 1-7
          // Remove duplicates and sort
          scheduleRuleData.days_of_week = Array.from(new Set(mappedDays)).sort((a, b) => a - b)
        } else {
          scheduleRuleData.days_of_week = null
        }
        scheduleRuleData.time_of_day = scheduleData.timeOfDay 
          ? [scheduleData.timeOfDay] 
          : null
      } else if (scheduleData.frequency === 'monthly') {
        // Monthly: either day_of_month (integer array) OR nth_week + weekday, plus time_of_day as array (single element)
        if (scheduleData.daysOfMonth.length > 0) {
          // Filter valid days (1-31), remove duplicates, and sort
          const validDays = scheduleData.daysOfMonth
            .filter(d => d >= 1 && d <= 31)
          scheduleRuleData.day_of_month = Array.from(new Set(validDays)).sort((a, b) => a - b)
          // Don't set nth_week and weekday when using day_of_month (they won't be included in cleanRuleData)
        } else if (scheduleData.nthWeek && scheduleData.weekday) {
          scheduleRuleData.nth_week = scheduleData.nthWeek
          scheduleRuleData.weekday = scheduleData.weekday
          // Don't set day_of_month when using nth_week + weekday (it won't be included in cleanRuleData)
        }
        // If neither option is selected, neither field will be set (they'll be undefined and filtered out)
        scheduleRuleData.time_of_day = scheduleData.timeOfDay 
          ? [scheduleData.timeOfDay] 
          : null
      } else if (scheduleData.frequency === 'specific') {
        // Specific: start_date, end_date, days_before, days_during, time_of_day (array), timezone
        // Store dates as timestamptz (convert date string to timestamp at start of day in timezone)
        if (scheduleData.startDate) {
          // Create date at start of day in the specified timezone, then convert to UTC timestamptz
          const startDateStr = `${scheduleData.startDate}T00:00:00`
          scheduleRuleData.start_date = startDateStr
          
          if (scheduleData.isDateRange && scheduleData.endDate) {
            // End date at end of day
            const endDateStr = `${scheduleData.endDate}T23:59:59`
            scheduleRuleData.end_date = endDateStr
          } else {
            // Single date: end_date = start_date (at end of day)
            scheduleRuleData.end_date = `${scheduleData.startDate}T23:59:59`
          }
        } else {
          scheduleRuleData.start_date = null
          scheduleRuleData.end_date = null
        }
        scheduleRuleData.days_before = scheduleData.daysBefore.length > 0 ? scheduleData.daysBefore : null
        scheduleRuleData.days_during = scheduleData.isDateRange && scheduleData.daysDuring.length > 0 
          ? scheduleData.daysDuring 
          : null
        // Use time_of_day as array for specific frequency
        scheduleRuleData.time_of_day = scheduleData.timesOfDay.length > 0 
          ? scheduleData.timesOfDay 
          : null
        scheduleRuleData.timezone = scheduleData.timezone || null
      }
      
      // Clean up undefined fields to avoid sending them to Supabase
      const cleanRuleData: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(scheduleRuleData)) {
        if (value !== undefined) {
          cleanRuleData[key] = value
        }
      }

      // Upsert schedule rule - update if exists, insert if not
      try {
        // Debug: Log the data being sent
        console.log('Schedule rule data being saved:', {
          frequency: cleanRuleData.frequency,
          cleanRuleData
        })
        
        if (existingRules && existingRules.length > 0) {
          // Update existing rule
          const { error } = await supabase
            .from('schedule_rules')
            .update(cleanRuleData)
            .eq('id', existingRules[0].id)

          if (error) {
            console.error('Schedule rule update error:', error)
            console.error('Error details:', JSON.stringify(error, null, 2))
            throw new Error(`Failed to update schedule rule: ${error.message}`)
          }
        } else {
          // Create new rule
          const { error } = await supabase
            .from('schedule_rules')
            .insert(cleanRuleData)

          if (error) {
            console.error('Schedule rule insert error:', error)
            console.error('Error details:', JSON.stringify(error, null, 2))
            console.error('Data being inserted:', JSON.stringify(cleanRuleData, null, 2))
            throw new Error(`Failed to create schedule rule: ${error.message}`)
          }
        }
      } catch (scheduleError) {
        console.error('Schedule rule save failed:', scheduleError)
        throw scheduleError  // Re-throw to trigger form error handling
      }

      console.log('Successfully saved subcategory and schedule rule')
      } else {
        // When editing specific frequency, skip schedule rule update
        // All scheduling is managed per-occurrence via EventOccurrencesManager
        console.log('Skipping schedule rule update for specific frequency (editing mode)')
      }

      // Save draft occurrences if any were added
      // Only save occurrences that are new (have draft- IDs), not ones that already exist
      if (scheduleData.frequency === 'specific' && draftOccurrences.length > 0) {
        try {
          // Filter to only new occurrences (draft- IDs) - these don't exist in DB yet
          const newOccurrences = draftOccurrences.filter(occ => occ.id.startsWith('draft-'))
          
          if (newOccurrences.length > 0) {
            const occurrenceInserts = newOccurrences.map(occ => {
              // Ensure time_of_day is an array and not empty
              const timesOfDay = Array.isArray(occ.times_of_day) && occ.times_of_day.length > 0
                ? occ.times_of_day
                : []
              
              // Validate required fields for specific frequency
              if (!occ.start_date) {
                throw new Error('Start date is required for all occurrences')
              }
              if (timesOfDay.length === 0) {
                throw new Error('At least one time of day is required for all occurrences')
              }
              if (!occ.channels || occ.channels.length === 0) {
                throw new Error('At least one channel is required for all occurrences')
              }
              
              // For single dates (no end_date), set end_date to start_date to satisfy constraint
              // The constraint requires: end_date IS NOT NULL OR (days_during IS NOT NULL AND cardinality > 0)
              const endDate = occ.end_date || occ.start_date
              
              // Ensure timezone is set
              const finalTimezone = occ.timezone || brand?.timezone || 'Pacific/Auckland'
              
              return {
                brand_id: brandId,
                subcategory_id: subcategoryId,
                category_id: finalCategoryId || null,
                name: `${subcategoryData.name} – Specific`,
                frequency: 'specific' as const,
                start_date: occ.start_date,
                end_date: endDate, // Must be NOT NULL for constraint - use start_date if null
                time_of_day: timesOfDay, // Always an array
                channels: occ.channels, // Must be non-empty array for specific frequency
                timezone: finalTimezone,
                is_active: true,
                tone: null,
                hashtag_rule: null,
                image_tag_rule: null,
                days_before: [], // Empty array instead of null
                days_during: null, // null is fine when end_date is set
                detail: null, // Occurrence detail (not subcategory detail)
                url: occ.url || null // Include occurrence URL
              }
            })

            console.info('[SubcategoryScheduleForm] Attempting to insert occurrences:', {
              count: occurrenceInserts.length,
              inserts: occurrenceInserts
            })
            
            const { error: occurrencesError, data } = await supabase
              .from('schedule_rules')
              .insert(occurrenceInserts)
              .select()

            console.info('[SubcategoryScheduleForm] Insert response:', { data, error: occurrencesError })

            if (occurrencesError) {
              console.error('[SubcategoryScheduleForm] Error saving occurrences:', {
                error: occurrencesError,
                code: occurrencesError.code,
                message: occurrencesError.message,
                details: occurrencesError.details,
                hint: occurrencesError.hint,
                occurrences: occurrenceInserts
              })
              throw new Error(`Failed to save occurrences: ${occurrencesError.message || occurrencesError.code || 'Unknown error'}`)
            }

            console.info(`[SubcategoryScheduleForm] Successfully saved ${newOccurrences.length} occurrence(s):`, data)
          }
        } catch (occurrencesError) {
          console.error('Error saving occurrences:', occurrencesError)
          // Don't throw - subcategory is already saved, just log the error
        }
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving subcategory and schedule rule:', {
        error,
        errorType: error?.constructor?.name,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === 'string' ? error : 'Unknown error')
      setErrors({ submit: `Failed to save: ${errorMessage}` })
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = useMemo(() => {
    // Check essential fields
    if (!subcategoryData.subcategory_type) return false
    if (!subcategoryData.name.trim()) return false
    if (!subcategoryData.detail || !subcategoryData.detail.trim()) return false
    if (!subcategoryData.channels || subcategoryData.channels.length === 0) return false

    // Check timeOfDay for daily, weekly, and monthly frequencies
    if (scheduleData.frequency === 'daily' || scheduleData.frequency === 'weekly' || scheduleData.frequency === 'monthly') {
      if (!scheduleData.timeOfDay || !scheduleData.timeOfDay.trim()) {
        return false
      }
    }

    // Check weekly frequency requirements
    if (scheduleData.frequency === 'weekly') {
      if (scheduleData.daysOfWeek.length === 0) {
        return false
      }
    }

    // Check monthly frequency requirements
    if (scheduleData.frequency === 'monthly') {
      if (scheduleData.daysOfMonth.length === 0 && (!scheduleData.nthWeek || !scheduleData.weekday)) {
        return false
      }
    }

    // Check specific frequency requirements
    if (scheduleData.frequency === 'specific') {
      // When editing existing subcategory with specific frequency:
      // - All scheduling is per-occurrence, so we only need subcategory fields (name, channels)
      // - Occurrences are managed separately via EventOccurrencesManager
      // - No need to validate startDate/timesOfDay when editing (those fields are hidden)
      const isEditingExisting = !!editingSubcategory && !!currentSubcategoryId
      
      if (isEditingExisting) {
        // When editing, only validate subcategory fields (name, channels)
        // Occurrences are managed separately and don't need to be validated here
        return true // Already validated name and channels above
      }
      
      // For new subcategories with specific frequency:
      // 1. Old form fields are filled (startDate, timesOfDay), OR
      // 2. There are draft occurrences from EventOccurrencesManager
      const hasOldFormData = scheduleData.startDate && scheduleData.timesOfDay.length > 0
      const hasDraftOccurrences = draftOccurrences.length > 0
      
      // If using old form, validate it properly
      if (hasOldFormData) {
        if (scheduleData.isDateRange && !scheduleData.endDate) {
          return false
        }
        return true
      }
      
      // Otherwise, require draft occurrences
      return hasDraftOccurrences
    }

    return true
  }, [subcategoryData, scheduleData, draftOccurrences, currentSubcategoryId])

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="4xl" title={editingSubcategory ? 'Edit Framework Item' : 'Add Framework Item'}>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Card: Category */}
          {!editingSubcategory && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Category</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={categoryMode === 'existing'}
                      onChange={() => {
                        setCategoryMode('existing')
                        setNewCategoryName('')
                      }}
                      className="mr-2"
                    />
                    <span>Use existing</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={categoryMode === 'new'}
                      onChange={() => {
                        setCategoryMode('new')
                        setSelectedCategoryId(undefined)
                      }}
                      className="mr-2"
                    />
                    <span>Create new</span>
                  </label>
                </div>
                
                {categoryMode === 'existing' ? (
                  <FormField label="Category" required>
                    <select
                      value={selectedCategoryId || ''}
                      onChange={(e) => setSelectedCategoryId(e.target.value || undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </FormField>
                ) : (
                  <FormField label="Category Name" required>
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name"
                    />
                  </FormField>
                )}
              </div>
            </div>
          )}
          
          {/* Card A: Subcategory */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Subcategory (applies to all events in this series)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Use this section to describe the overall programme, offer, or event series. These details apply to every event date.
            </p>
            
            <div className="space-y-4">
              <FormField label="What kind of thing is this?" required>
                <select
                  value={subcategoryData.subcategory_type}
                  onChange={(e) => setSubcategoryData(prev => ({ ...prev, subcategory_type: e.target.value as SubcategoryType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {SUBCATEGORY_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  This tells Ferdy how to structure the posts. Choose the closest match.
                </p>
                {errors.subcategoryType && <p className="text-red-500 text-sm mt-1">{errors.subcategoryType}</p>}
              </FormField>

              {/* Type explainer panel */}
              {subcategoryData.subcategory_type && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2 mb-4">
                  {(() => {
                    const helpText = SUBCATEGORY_TYPE_HELP_TEXT[subcategoryData.subcategory_type || 'other']
                    return (
                      <>
                        <h4 className="text-sm font-semibold text-gray-900 mb-1">{helpText.title}</h4>
                        <p className="text-sm text-gray-700">{helpText.body}</p>
                      </>
                    )
                  })()}
                </div>
              )}

              {/* Type-specific settings panel */}
              {subcategoryData.subcategory_type && subcategoryData.subcategory_type !== 'other' && subcategoryData.subcategory_type !== 'unspecified' && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Settings for this type</h3>
                  {(() => {
                    const type = subcategoryData.subcategory_type
                    
                    // Event Series
                    if (type === 'event_series') {
                      return (
                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default lead times (days before event):
                          </label>
                          <input
                            type="text"
                            value={settings.default_lead_times?.join(', ') || ''}
                            onChange={(e) => updateSettings({ default_lead_times: parseNumberArray(e.target.value) })}
                            placeholder="7, 3, 1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <p className="text-xs text-gray-600 mt-1">Example: 7, 3, 1</p>
                        </div>
                      )
                    }
                    
                    // Evergreen Programme
                    if (type === 'service_or_programme') {
                      return (
                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Highlight points:
                          </label>
                          <input
                            type="text"
                            value={settings.highlight_points?.join(', ') || ''}
                            onChange={(e) => updateSettings({ highlight_points: parseStringArray(e.target.value) })}
                            placeholder="Benefits, Who it's for"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <p className="text-xs text-gray-600 mt-1">Example: Benefits, Who it's for</p>
                        </div>
                      )
                    }
                    
                    // Promo / Offer
                    if (type === 'promo_or_offer') {
                      return (
                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Promo length (days):
                            </label>
                            <input
                              type="number"
                              value={settings.promo_length_days || ''}
                              onChange={(e) => updateSettings({ 
                                promo_length_days: e.target.value ? parseInt(e.target.value, 10) : null 
                              })}
                              placeholder="e.g., 7"
                              min="1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={settings.auto_expire || false}
                              onChange={(e) => updateSettings({ auto_expire: e.target.checked })}
                              className="mr-2"
                            />
                            <label className="text-sm text-gray-700">Auto-expire after promo length</label>
                          </div>
                        </div>
                      )
                    }
                    
                    // Rotating / Schedule
                    if (type === 'dynamic_schedule') {
                      return (
                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            URL refresh frequency:
                          </label>
                          <select
                            value={settings.url_refresh_frequency || 'weekly'}
                            onChange={(e) => updateSettings({ url_refresh_frequency: e.target.value as 'daily' | 'weekly' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                          </select>
                        </div>
                      )
                    }
                    
                    // Content Pillar
                    if (type === 'content_series') {
                      return (
                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of items:
                          </label>
                          <input
                            type="number"
                            value={settings.number_of_items || ''}
                            onChange={(e) => updateSettings({ 
                              number_of_items: e.target.value ? parseInt(e.target.value, 10) : null 
                            })}
                            placeholder="e.g., 10"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <p className="text-xs text-gray-600 mt-1">Example: 10 episodes, 35 players</p>
                        </div>
                      )
                    }
                    
                    return null
                  })()}
                </div>
              )}

              <div className="mb-2"></div>

              <FormField label="Name" required>
                <Input
                  value={subcategoryData.name}
                  onChange={(e) => setSubcategoryData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter subcategory name"
                  error={errors.subcategoryName}
                />
              </FormField>

              <FormField label="Detail" required>
                <textarea
                  value={subcategoryData.detail}
                  onChange={(e) => setSubcategoryData(prev => ({ ...prev, detail: e.target.value }))}
                  placeholder="Enter description (required)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.subcategoryDetail && <p className="text-red-500 text-sm mt-1">{errors.subcategoryDetail}</p>}
              </FormField>

              <FormField label="URL">
                <Input
                  value={subcategoryData.url}
                  onChange={(e) => setSubcategoryData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com (optional)"
                  error={errors.subcategoryUrl}
                />
              </FormField>

              <FormField label="Channels" required>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map((channel) => (
                    <label key={channel.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={subcategoryData.channels.includes(channel.value)}
                        onChange={(e) => {
                          const newChannels = e.target.checked
                            ? [...subcategoryData.channels, channel.value]
                            : subcategoryData.channels.filter(c => c !== channel.value)
                          setSubcategoryData(prev => ({ ...prev, channels: newChannels }))
                          // Also update schedule rule channels if they're empty or match the old subcategory channels
                          if (scheduleData.channels.length === 0 || scheduleData.channels.every(c => subcategoryData.channels.includes(c))) {
                            setScheduleData(prev => ({ ...prev, channels: newChannels }))
                          }
                        }}
                        className="mr-2"
                      />
                      {channel.label}
                    </label>
                  ))}
                </div>
                {errors.channels && <p className="text-red-500 text-sm mt-1">{errors.channels}</p>}
              </FormField>

              <FormField label="Hashtags">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      onKeyPress={handleHashtagKeyPress}
                      placeholder="Type hashtag and press Enter or comma"
                    />
                    <button
                      type="button"
                      onClick={addHashtag}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {subcategoryData.hashtags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeHashtag(tag)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </FormField>
            </div>
          </div>

          {/* Card B: Schedule Rule */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{getScheduleSectionTitle(subcategoryData.subcategory_type)}</h3>
            
            <div className="space-y-4">
              {/* Frequency */}
              <FormField label="Frequency" required>
                <div className="flex gap-2 flex-wrap">
                  {(() => {
                    // Get allowed frequencies for the current subcategory type
                    const currentType = subcategoryData.subcategory_type || 'other'
                    const allowedFrequencies = ALLOWED_FREQUENCIES_BY_TYPE[currentType]
                    const currentFrequency = scheduleData.frequency
                    // Include current frequency even if not allowed (for legacy data)
                    const frequenciesToShow = Array.from(new Set([...allowedFrequencies, currentFrequency]))
                    
                    return (['daily', 'weekly', 'monthly', 'specific'] as const).map((freq) => {
                      const isAllowed = allowedFrequencies.includes(freq)
                      const isCurrent = currentFrequency === freq
                      // Show if allowed, or if it's the current (legacy) frequency
                      if (!frequenciesToShow.includes(freq)) return null
                      
                      return (
                        <label key={freq} className={`flex items-center ${!isAllowed ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          <input
                            type="radio"
                            value={freq}
                            checked={isCurrent}
                            onChange={(e) => {
                              // Only allow changing to allowed frequencies
                              if (allowedFrequencies.includes(e.target.value as ScheduleFrequency)) {
                                setScheduleData(prev => ({ ...prev, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'specific' }))
                              }
                            }}
                            disabled={!isAllowed && !isCurrent}
                            className="mr-2"
                          />
                          <span className={!isAllowed && !isCurrent ? 'text-gray-500' : ''}>
                            {freq === 'specific' ? 'Specific Date/Range' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                            {!isAllowed && isCurrent && ' (legacy)'}
                          </span>
                        </label>
                      )
                    })
                  })()}
                </div>
                {errors.frequency && <p className="text-red-500 text-sm mt-1">{errors.frequency}</p>}
              </FormField>

              {/* Daily Options */}
              {scheduleData.frequency === 'daily' && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                  <FormField label="Time of Day" required>
                    <Input
                      type="time"
                      value={scheduleData.timeOfDay}
                      onChange={(e) => setScheduleData(prev => ({ ...prev, timeOfDay: e.target.value }))}
                      error={errors.timeOfDay}
                      required
                    />
                  </FormField>
                </div>
              )}

              {/* Weekly Options */}
              {scheduleData.frequency === 'weekly' && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                  <FormField label="Days of Week" required>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            const newDays = scheduleData.daysOfWeek.includes(day.value)
                              ? scheduleData.daysOfWeek.filter(d => d !== day.value)
                              : [...scheduleData.daysOfWeek, day.value]
                            // Sort by day order (mon=0, tue=1, etc.) to maintain logical order
                            const dayOrder: Record<string, number> = { 'mon': 0, 'tue': 1, 'wed': 2, 'thu': 3, 'fri': 4, 'sat': 5, 'sun': 6 }
                            const sortedDays = newDays.sort((a, b) => (dayOrder[a] || 99) - (dayOrder[b] || 99))
                            setScheduleData(prev => ({ ...prev, daysOfWeek: sortedDays }))
                          }}
                          className={`px-3 py-1 rounded-md text-sm ${
                            scheduleData.daysOfWeek.includes(day.value)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    {errors.daysOfWeek && <p className="text-red-500 text-sm mt-1">{errors.daysOfWeek}</p>}
                  </FormField>
                  <FormField label="Time of Day" required>
                    <Input
                      type="time"
                      value={scheduleData.timeOfDay}
                      onChange={(e) => setScheduleData(prev => ({ ...prev, timeOfDay: e.target.value }))}
                      error={errors.timeOfDay}
                      required
                    />
                  </FormField>
                </div>
              )}

              {/* Monthly Options */}
              {scheduleData.frequency === 'monthly' && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                  <FormField label="Days of Month">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const newDays = scheduleData.daysOfMonth.includes(day)
                                ? scheduleData.daysOfMonth.filter(d => d !== day)
                                : [...scheduleData.daysOfMonth, day]
                              // Sort and remove duplicates before setting
                              const sortedUniqueDays = Array.from(new Set(newDays)).sort((a, b) => a - b)
                              setScheduleData(prev => ({ ...prev, daysOfMonth: sortedUniqueDays }))
                            }}
                            className={`w-8 h-8 text-xs rounded ${
                              scheduleData.daysOfMonth.includes(day)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </FormField>

                  <div className="text-sm text-gray-600">OR</div>

                  <FormField label="Weekday Pattern">
                    <div className="flex gap-4">
                      <select
                        value={scheduleData.nthWeek || ''}
                        onChange={(e) => setScheduleData(prev => ({ ...prev, nthWeek: e.target.value ? parseInt(e.target.value) : undefined }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        {NTH_WEEK_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <select
                        value={scheduleData.weekday || ''}
                        onChange={(e) => setScheduleData(prev => ({ ...prev, weekday: e.target.value ? parseInt(e.target.value) : undefined }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select weekday...</option>
                        {WEEKDAY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </FormField>

                  <FormField label="Time of Day" required>
                    <Input
                      type="time"
                      value={scheduleData.timeOfDay}
                      onChange={(e) => setScheduleData(prev => ({ ...prev, timeOfDay: e.target.value }))}
                      error={errors.timeOfDay}
                      required
                    />
                  </FormField>
                  {errors.monthlyType && <p className="text-red-500 text-sm">{errors.monthlyType}</p>}
                </div>
              )}

              {/* Specific Date/Range Options - Only show when creating new, not when editing existing */}
              {scheduleData.frequency === 'specific' && !editingSubcategory && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                  {/* Date Type Toggle */}
                  <FormField label="Date Type">
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={!scheduleData.isDateRange}
                          onChange={() => {
                            setScheduleData(prev => ({
                              ...prev,
                              isDateRange: false,
                              endDate: prev.startDate  // Set endDate to startDate for single date
                            }))
                          }}
                          className="mr-2"
                        />
                        Single Date
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={scheduleData.isDateRange}
                          onChange={() => setScheduleData(prev => ({ ...prev, isDateRange: true }))}
                          className="mr-2"
                        />
                        Date Range
                      </label>
                    </div>
                  </FormField>

                  {/* Start Date / Date */}
                  <FormField label={scheduleData.isDateRange ? "Start Date" : "Date"} required>
                    <Input
                      type="date"
                      value={scheduleData.startDate}
                      onChange={(e) => {
                        const date = e.target.value
                        setScheduleData(prev => ({
                          ...prev,
                          startDate: date,
                          endDate: !prev.isDateRange ? date : prev.endDate  // Update endDate if single date
                        }))
                      }}
                      error={errors.startDate}
                    />
                  </FormField>

                  {/* End Date (only for ranges) */}
                  {scheduleData.isDateRange && (
                    <FormField label="End Date" required>
                      <Input
                        type="date"
                        value={scheduleData.endDate}
                        onChange={(e) => setScheduleData(prev => ({ ...prev, endDate: e.target.value }))}
                        min={scheduleData.startDate}
                        error={errors.endDate}
                      />
                    </FormField>
                  )}

                  {/* Times of Day */}
                  <FormField label="Times of Day" required>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="time"
                          value={newTimeInput}
                          onChange={(e) => setNewTimeInput(e.target.value)}
                          placeholder="HH:MM"
                        />
                        <button
                          type="button"
                          onClick={addTime}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          Add Time
                        </button>
                      </div>
                      {scheduleData.timesOfDay.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {scheduleData.timesOfDay.map((time, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                            >
                              {time}
                              <button
                                type="button"
                                onClick={() => removeTime(time)}
                                className="ml-2 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {errors.timesOfDay && <p className="text-red-500 text-sm mt-1">{errors.timesOfDay}</p>}
                    </div>
                  </FormField>

                  {/* Days Before */}
                  <FormField label="Days Before (comma-separated, e.g., 5,3,1)">
                    <Input
                      type="text"
                      value={daysBeforeInput}
                      onChange={(e) => updateDaysBefore(e.target.value)}
                      placeholder="5,3,1"
                      error={errors.daysBefore}
                    />
                    <p className="text-xs text-gray-500 mt-1">Posts will be scheduled X days before the start date</p>
                  </FormField>

                  {/* Days During (only for ranges) */}
                  {scheduleData.isDateRange && (
                    <FormField label="Days During (comma-separated, e.g., 2,3,5)">
                      <Input
                        type="text"
                        value={daysDuringInput}
                        onChange={(e) => updateDaysDuring(e.target.value)}
                        placeholder="2,3,5"
                        error={errors.daysDuring}
                      />
                      <p className="text-xs text-gray-500 mt-1">Posts will be scheduled X days after the start date (within the range)</p>
                    </FormField>
                  )}

                  {/* Timezone */}
                  <FormField label="Timezone" required>
                    <select
                      value={scheduleData.timezone}
                      onChange={(e) => setScheduleData(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Pacific/Auckland">Pacific/Auckland (NZ)</option>
                      <option value="Pacific/Sydney">Pacific/Sydney (AEST)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    </select>
                  </FormField>
                </div>
              )}

              {/* Event Occurrences Manager - Show only for event_series with specific frequency */}
              {(() => {
                const currentType = subcategoryData.subcategory_type || 'other'
                const allowedFrequencies = ALLOWED_FREQUENCIES_BY_TYPE[currentType]
                const shouldShowOccurrences = 
                  scheduleData.frequency === 'specific' && 
                  currentType === 'event_series' &&
                  allowedFrequencies.includes('specific')
                
                return shouldShowOccurrences && (
                  <div className={`bg-white border border-gray-200 rounded-lg p-6 ${editingSubcategory ? "mt-0" : "mt-6"}`}>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Event Dates & Occurrences</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Each occurrence is a specific date or date range for this subcategory (e.g. an individual event date or promo period).
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Changes here affect only that specific date, not the whole subcategory.
                  </p>
                  <EventOccurrencesManager
                    brandId={brandId}
                    subcategoryId={currentSubcategoryId}
                    brandTimezone={brand?.timezone || scheduleData.timezone || 'Pacific/Auckland'}
                    subcategoryDetail={subcategoryData.detail || ''}
                    onOccurrencesChanged={() => {
                      // Refresh any parent components if needed
                      if (currentSubcategoryId) {
                        onSuccess()
                      }
                    }}
                    onOccurrencesChange={(occurrences) => {
                      // Collect all occurrences with their IDs
                      // This allows validation to pass when editing existing subcategory with occurrences
                      const allOccurrences = occurrences.map(o => ({
                        id: o.id,
                        frequency: o.frequency,
                        start_date: o.start_date,
                        end_date: o.end_date,
                        times_of_day: o.times_of_day,
                        channels: o.channels,
                        timezone: o.timezone,
                        url: o.url || null
                      }))
                      setDraftOccurrences(allOccurrences)
                      
                      // Also update currentSubcategoryId if we have occurrences but no ID yet
                      // (This handles the case where occurrences are added but subcategory hasn't been saved yet)
                    }}
                  />
                  </div>
                )
              })()}

            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 -mx-6 -mb-6">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  )
}
