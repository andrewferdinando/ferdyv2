'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { Modal } from '@/components/ui/Modal'
import { Form, FormField, FormActions } from '@/components/ui/Form'
import { Input } from '@/components/ui/Input'

interface SubcategoryData {
  name: string
  detail?: string
  url?: string
  hashtags: string[]
}

interface ScheduleRuleData {
  frequency: 'daily' | 'weekly' | 'monthly'
  timeOfDay: string
  timesPerWeek?: number
  daysOfWeek: string[]
  daysOfMonth: number[]
  nthWeek?: number
  weekday?: number
  channels: string[]
  tone?: string
  timezone: string
  isActive: boolean
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
  }
  editingScheduleRule?: {
    id: string
    frequency: string
    timeOfDay: string
    timesPerWeek?: number
    daysOfWeek: string[]
    daysOfMonth: number[]
    nthWeek?: number
    weekday?: number
    channels: string[]
    tone?: string
    timezone: string
    isActive: boolean
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
    hashtags: []
  })

  // Schedule rule state
  const [scheduleData, setScheduleData] = useState<ScheduleRuleData>({
    frequency: 'weekly',
    timeOfDay: '09:00',
    timesPerWeek: undefined,
    daysOfWeek: [],
    daysOfMonth: [],
    nthWeek: undefined,
    weekday: undefined,
    channels: [],
    tone: '',
    timezone: 'America/New_York', // Default to brand timezone
    isActive: true
  })

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
        hashtags: editingSubcategory.hashtags || []
      })
    } else {
      setSubcategoryData({
        name: '',
        detail: '',
        url: '',
        hashtags: []
      })
    }

    if (editingScheduleRule) {
      setScheduleData({
        frequency: editingScheduleRule.frequency as 'daily' | 'weekly' | 'monthly',
        timeOfDay: editingScheduleRule.timeOfDay,
        timesPerWeek: editingScheduleRule.timesPerWeek,
        daysOfWeek: editingScheduleRule.daysOfWeek || [],
        daysOfMonth: editingScheduleRule.daysOfMonth || [],
        nthWeek: editingScheduleRule.nthWeek,
        weekday: editingScheduleRule.weekday,
        channels: editingScheduleRule.channels || [],
        tone: editingScheduleRule.tone || '',
        timezone: editingScheduleRule.timezone,
        isActive: editingScheduleRule.isActive
      })
    } else {
      setScheduleData({
        frequency: 'weekly',
        timeOfDay: '09:00',
        timesPerWeek: undefined,
        daysOfWeek: [],
        daysOfMonth: [],
        nthWeek: undefined,
        weekday: undefined,
        channels: [],
        tone: '',
        timezone: 'America/New_York',
        isActive: true
      })
    }

    setErrors({})
    setHashtagInput('')
  }, [editingSubcategory, editingScheduleRule, isOpen])

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Subcategory validation
    if (!subcategoryData.name.trim()) {
      newErrors.subcategoryName = 'Name is required'
    }

    if (subcategoryData.url && subcategoryData.url.trim()) {
      try {
        new URL(subcategoryData.url)
      } catch {
        newErrors.subcategoryUrl = 'Please enter a valid URL'
      }
    }

    // Schedule validation
    if (!scheduleData.frequency) {
      newErrors.frequency = 'Frequency is required'
    }

    if (scheduleData.frequency === 'daily') {
      if (!scheduleData.timeOfDay) {
        newErrors.timeOfDay = 'Time of day is required'
      }
      if (scheduleData.timesPerWeek && (scheduleData.timesPerWeek < 1 || scheduleData.timesPerWeek > 7)) {
        newErrors.timesPerWeek = 'Times per week must be between 1 and 7'
      }
    }

    if (scheduleData.frequency === 'weekly') {
      if (scheduleData.daysOfWeek.length === 0) {
        newErrors.daysOfWeek = 'At least one day of week is required'
      }
      if (!scheduleData.timeOfDay) {
        newErrors.timeOfDay = 'Time of day is required'
      }
    }

    if (scheduleData.frequency === 'monthly') {
      if (scheduleData.daysOfMonth.length === 0 && (!scheduleData.nthWeek || !scheduleData.weekday)) {
        newErrors.monthlyType = 'Either days of month or weekday pattern is required'
      }
      if (!scheduleData.timeOfDay) {
        newErrors.timeOfDay = 'Time of day is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Hashtag management
  const addHashtag = () => {
    if (hashtagInput.trim()) {
      const tag = hashtagInput.trim().replace(/^#/, '')
      if (!subcategoryData.hashtags.includes(tag)) {
        setSubcategoryData(prev => ({
          ...prev,
          hashtags: [...prev.hashtags, tag]
        }))
      }
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
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Save subcategory
      let subcategoryId: string

      if (editingSubcategory) {
        // Update existing subcategory
        const { data, error } = await supabase
          .from('subcategories')
          .update({
            name: subcategoryData.name,
            detail: subcategoryData.detail || null,
            url: subcategoryData.url || null,
            hashtags: subcategoryData.hashtags,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSubcategory.id)
          .select()
          .single()

        if (error) throw error
        subcategoryId = data.id
      } else {
        // Create new subcategory
        const { data, error } = await supabase
          .from('subcategories')
          .insert({
            brand_id: brandId,
            category_id: categoryId,
            name: subcategoryData.name,
            detail: subcategoryData.detail || null,
            url: subcategoryData.url || null,
            hashtags: subcategoryData.hashtags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error
        subcategoryId = data.id
      }

      // Save schedule rule
      const scheduleRuleData = {
        brand_id: brandId,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        name: `${subcategoryData.name} – ${scheduleData.frequency.charAt(0).toUpperCase() + scheduleData.frequency.slice(1)}`,
        tone: scheduleData.tone || null,
        frequency: scheduleData.frequency,
        time_of_day: scheduleData.timeOfDay,
        times_per_week: scheduleData.timesPerWeek || null,
        days_of_week: scheduleData.daysOfWeek,
        day_of_month: scheduleData.daysOfMonth.length > 0 ? scheduleData.daysOfMonth : null,
        nth_week: scheduleData.nthWeek || null,
        weekday: scheduleData.weekday || null,
        channels: scheduleData.channels,
        timezone: scheduleData.timezone,
        is_active: scheduleData.isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (editingScheduleRule) {
        // Update existing schedule rule
        const { error } = await supabase
          .from('schedule_rules')
          .update(scheduleRuleData)
          .eq('id', editingScheduleRule.id)

        if (error) throw error
      } else {
        // Create new schedule rule
        const { error } = await supabase
          .from('schedule_rules')
          .insert(scheduleRuleData)

        if (error) throw error
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving subcategory and schedule rule:', error)
      setErrors({ submit: 'Failed to save. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = validateForm()

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {editingSubcategory ? 'Edit Subcategory & Schedule Rule' : 'Create Subcategory & Schedule Rule'}
        </h2>

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
                        #{tag}
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
                <div className="flex gap-2">
                  {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                    <label key={freq} className="flex items-center">
                      <input
                        type="radio"
                        value={freq}
                        checked={scheduleData.frequency === freq}
                        onChange={(e) => setScheduleData(prev => ({ ...prev, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' }))}
                        className="mr-2"
                      />
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
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
                  <FormField label="Times per Week (optional)">
                    <Input
                      type="number"
                      min="1"
                      max="7"
                      value={scheduleData.timesPerWeek || ''}
                      onChange={(e) => setScheduleData(prev => ({ ...prev, timesPerWeek: e.target.value ? parseInt(e.target.value) : undefined }))}
                      placeholder="1-7"
                      error={errors.timesPerWeek}
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

              {/* Common Options */}
              <FormField label="Channels">
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map((channel) => (
                    <label key={channel.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={scheduleData.channels.includes(channel.value)}
                        onChange={(e) => {
                          const newChannels = e.target.checked
                            ? [...scheduleData.channels, channel.value]
                            : scheduleData.channels.filter(c => c !== channel.value)
                          setScheduleData(prev => ({ ...prev, channels: newChannels }))
                        }}
                        className="mr-2"
                      />
                      {channel.label}
                    </label>
                  ))}
                </div>
              </FormField>

              <FormField label="Tone">
                <Input
                  value={scheduleData.tone}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, tone: e.target.value }))}
                  placeholder="Enter tone (optional)"
                />
              </FormField>

              <FormField label="Timezone">
                <Input
                  value={scheduleData.timezone}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, timezone: e.target.value }))}
                  placeholder="America/New_York"
                />
              </FormField>

              <FormField label="Active">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={scheduleData.isActive}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="mr-2"
                  />
                  Schedule rule is active
                </label>
              </FormField>
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
