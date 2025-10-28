'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase-browser'
import Modal from '@/components/ui/Modal'
import { FormField } from '@/components/ui/Form'
import { Input } from '@/components/ui/Input'
import { normalizeHashtags } from '@/lib/utils/hashtags'

interface SubcategoryData {
  name: string
  detail?: string
  url?: string
  hashtags: string[]
  channels: string[]
}

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
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'x', label: 'X (Twitter)' }
]

export function SubcategoryScheduleForm({
  isOpen,
  onClose,
  brandId,
  categoryId,
  editingSubcategory,
  editingScheduleRule,
  onSuccess
}: SubcategoryScheduleFormProps) {
  // Subcategory state
  const [subcategoryData, setSubcategoryData] = useState<SubcategoryData>({
    name: '',
    detail: '',
    url: '',
    hashtags: [],
    channels: []
  })

  // Schedule rule state
  const [scheduleData, setScheduleData] = useState<ScheduleRuleData>({
    frequency: 'weekly',
    timeOfDay: '',
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
    timezone: 'Pacific/Auckland'  // Default to NZ timezone
  })

  // Helper state for specific date inputs
  const [daysBeforeInput, setDaysBeforeInput] = useState('')
  const [daysDuringInput, setDaysDuringInput] = useState('')
  const [newTimeInput, setNewTimeInput] = useState('')

  // Form state
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hashtagInput, setHashtagInput] = useState('')

  // Initialize form with editing data
  useEffect(() => {
    if (editingSubcategory) {
      setSubcategoryData({
        name: editingSubcategory.name,
        detail: editingSubcategory.detail || '',
        url: editingSubcategory.url || '',
        hashtags: editingSubcategory.hashtags || [],
        channels: editingSubcategory.channels || []
      })
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
        hashtags: [],
        channels: []
      })
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
      setScheduleData({
        frequency: 'weekly',
        timeOfDay: '',
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
        timezone: 'Pacific/Auckland'
      })
      setDaysBeforeInput('')
      setDaysDuringInput('')
    }

    setErrors({})
    setHashtagInput('')
    setNewTimeInput('')
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

    // Simplified validation - only check essential fields
    if (!subcategoryData.name.trim()) {
      newErrors.subcategoryName = 'Name is required'
    }

    // Validate channels - at least one channel is required
    if (!subcategoryData.channels || subcategoryData.channels.length === 0) {
      newErrors.channels = 'At least one channel is required'
    }

    // Validate specific date/range fields
    if (scheduleData.frequency === 'specific') {
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
  }, [subcategoryData, scheduleData])

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
    
    if (!validateForm()) {
      console.log('Form validation failed')
      return
    }

    console.log('Form validation passed, starting save...')
    setIsLoading(true)

    try {
      // Save subcategory
      let subcategoryId: string

      if (editingSubcategory) {
        // Normalize hashtags before saving
        const normalizedHashtags = normalizeHashtags(subcategoryData.hashtags || []);
        
        // Update existing subcategory
        const { data, error } = await supabase
          .from('subcategories')
          .update({
            name: subcategoryData.name,
            detail: subcategoryData.detail || null,
            url: subcategoryData.url || null,
            default_hashtags: normalizedHashtags,
            channels: subcategoryData.channels.length > 0 ? subcategoryData.channels : null
          })
          .eq('id', editingSubcategory.id)
          .select()
          .single()

        if (error) {
          console.error('Subcategory update error:', error)
          throw error
        }
        subcategoryId = data.id
      } else {
        // Normalize hashtags before saving
        const normalizedHashtags = normalizeHashtags(subcategoryData.hashtags || []);
        
        // Create new subcategory
        const { data, error } = await supabase
          .from('subcategories')
          .insert({
            brand_id: brandId,
            category_id: categoryId,
            name: subcategoryData.name,
            detail: subcategoryData.detail || null,
            url: subcategoryData.url || null,
            default_hashtags: normalizedHashtags,
            channels: subcategoryData.channels.length > 0 ? subcategoryData.channels : null
          })
          .select()
          .single()

        if (error) {
          console.error('Subcategory insert error:', error)
          throw error
        }
        subcategoryId = data.id
      }

      // Upsert schedule rule - one active rule per subcategory
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
        category_id: categoryId || null,
        name: `${subcategoryData.name} – ${scheduleData.frequency.charAt(0).toUpperCase() + scheduleData.frequency.slice(1)}`,
        frequency: scheduleData.frequency,
        channels: subcategoryData.channels.length > 0 ? subcategoryData.channels : null,
        is_active: true,
        tone: null,
        hashtag_rule: null,
        image_tag_rule: null
      }

      // Prepare schedule rule data based on frequency type
      let scheduleRuleData: typeof baseRuleData & {
        time_of_day?: string[] | null
        days_of_week?: number[] | null
        day_of_month?: number | null
        nth_week?: number | null
        weekday?: number | null
        start_date?: string | null
        end_date?: string | null
        days_before?: number[] | null
        days_during?: number[] | null
        timezone?: string | null
      } = {
        brand_id: brandId,
        subcategory_id: subcategoryId,
        category_id: categoryId || null,
        name: `${subcategoryData.name} – ${scheduleData.frequency.charAt(0).toUpperCase() + scheduleData.frequency.slice(1)}`,
        frequency: scheduleData.frequency,
        channels: subcategoryData.channels.length > 0 ? subcategoryData.channels : null,
        is_active: true,
        // Default tone and rules - can be enhanced later
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
        // Weekly: days_of_week and time_of_day as array (single element)
        scheduleRuleData.days_of_week = scheduleData.daysOfWeek.length > 0 
          ? scheduleData.daysOfWeek.map(d => {
              const dayMap: Record<string, number> = { 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 7 }
              return dayMap[d] || 0
            }).filter(d => d > 0)
          : null
        scheduleRuleData.time_of_day = scheduleData.timeOfDay 
          ? [scheduleData.timeOfDay] 
          : null
      } else if (scheduleData.frequency === 'monthly') {
        // Monthly: either day_of_month OR nth_week + weekday, plus time_of_day as array (single element)
        if (scheduleData.daysOfMonth.length > 0) {
          scheduleRuleData.day_of_month = scheduleData.daysOfMonth[0]
        } else if (scheduleData.nthWeek && scheduleData.weekday) {
          scheduleRuleData.nth_week = scheduleData.nthWeek
          scheduleRuleData.weekday = scheduleData.weekday
        }
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
        if (existingRules && existingRules.length > 0) {
          // Update existing rule
          const { error } = await supabase
            .from('schedule_rules')
            .update(cleanRuleData)
            .eq('id', existingRules[0].id)

          if (error) {
            console.error('Schedule rule update error:', error)
            throw new Error(`Failed to update schedule rule: ${error.message}`)
          }
        } else {
          // Create new rule
          const { error } = await supabase
            .from('schedule_rules')
            .insert(cleanRuleData)

          if (error) {
            console.error('Schedule rule insert error:', error)
            throw new Error(`Failed to create schedule rule: ${error.message}`)
          }
        }
      } catch (scheduleError) {
        console.error('Schedule rule save failed:', scheduleError)
        throw scheduleError  // Re-throw to trigger form error handling
      }

      console.log('Successfully saved subcategory and schedule rule')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving subcategory and schedule rule:', error)
      setErrors({ submit: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = useMemo(() => {
    // Check essential fields
    if (!subcategoryData.name.trim()) return false
    if (!subcategoryData.channels || subcategoryData.channels.length === 0) return false

    // Check specific frequency requirements
    if (scheduleData.frequency === 'specific') {
      if (!scheduleData.startDate) return false
      if (scheduleData.isDateRange && !scheduleData.endDate) return false
      if (scheduleData.timesOfDay.length === 0) return false
    }

    return true
  }, [subcategoryData, scheduleData])

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="4xl" title={editingSubcategory ? 'Edit Subcategory & Schedule Rule' : 'Create Subcategory & Schedule Rule'}>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Card A: Subcategory */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Subcategory</h3>
            
            <div className="space-y-4">
              <FormField label="Name" required>
                <Input
                  value={subcategoryData.name}
                  onChange={(e) => setSubcategoryData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter subcategory name"
                  error={errors.subcategoryName}
                />
              </FormField>

              <FormField label="Detail">
                <textarea
                  value={subcategoryData.detail}
                  onChange={(e) => setSubcategoryData(prev => ({ ...prev, detail: e.target.value }))}
                  placeholder="Enter details (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Rule</h3>
            
            <div className="space-y-4">
              {/* Frequency */}
              <FormField label="Frequency" required>
                <div className="flex gap-2 flex-wrap">
                  {(['daily', 'weekly', 'monthly', 'specific'] as const).map((freq) => (
                    <label key={freq} className="flex items-center">
                      <input
                        type="radio"
                        value={freq}
                        checked={scheduleData.frequency === freq}
                        onChange={(e) => setScheduleData(prev => ({ ...prev, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'specific' }))}
                        className="mr-2"
                      />
                      {freq === 'specific' ? 'Specific Date/Range' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </label>
                  ))}
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
                            setScheduleData(prev => ({ ...prev, daysOfWeek: newDays }))
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
                              setScheduleData(prev => ({ ...prev, daysOfMonth: newDays }))
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
                    />
                  </FormField>
                  {errors.monthlyType && <p className="text-red-500 text-sm">{errors.monthlyType}</p>}
                </div>
              )}

              {/* Specific Date/Range Options */}
              {scheduleData.frequency === 'specific' && (
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

                  {/* Start Date */}
                  <FormField label="Start Date" required>
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
