'use client'

import { useState, useEffect, useRef } from 'react'
import type { JSX } from 'react'
import { supabase } from '@/lib/supabase-browser'
import Modal from '@/components/ui/Modal'
import { FormField } from '@/components/ui/Form'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/ToastProvider'
import TimezoneSelect from './TimezoneSelect'

interface EventOccurrence {
  id: string
  frequency: 'date' | 'date_range'
  start_date: string
  end_date: string | null
  times_of_day: string[]
  channels: string[]
  timezone: string
  is_active: boolean
  detail?: string | null  // Occurrence detail/description
  url?: string | null  // Occurrence-specific URL
}

interface EventOccurrencesManagerProps {
  brandId: string
  subcategoryId: string | null  // null for new subcategories
  brandTimezone: string
  subcategoryDetail?: string  // Subcategory description to default new occurrences from
  onOccurrencesChanged?: () => void
  onOccurrencesChange?: (occurrences: EventOccurrence[]) => void  // Callback to pass occurrences to parent
}

export function EventOccurrencesManager({
  brandId,
  subcategoryId,
  brandTimezone,
  subcategoryDetail = '',
  onOccurrencesChanged,
  onOccurrencesChange
}: EventOccurrencesManagerProps) {
  const { showToast } = useToast()
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([])
  const [loading, setLoading] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState<EventOccurrence | null>(null)
  const [lockedMonths, setLockedMonths] = useState<string[]>([])
  const [lockedMonthsLoaded, setLockedMonthsLoaded] = useState(false)
  const [minDate, setMinDate] = useState<string>('')
  const [blockedMaxDate, setBlockedMaxDate] = useState<string>('')

  // Form state for single occurrence
  const [isDateRange, setIsDateRange] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const startDateInputRef = useRef<HTMLInputElement>(null)
  const endDateInputRef = useRef<HTMLInputElement>(null)
  const [timesOfDay, setTimesOfDay] = useState<string[]>([])
  const [newTimeInput, setNewTimeInput] = useState('')
  const [channels, setChannels] = useState<string[]>([])
  const [url, setUrl] = useState('')
  const [timezone, setTimezone] = useState(brandTimezone)
  const [subcategoryUrl, setSubcategoryUrl] = useState<string | null>(null)
  const [detail, setDetail] = useState<string>('')

  // Bulk add state
  const [bulkInput, setBulkInput] = useState('')
  const [bulkTimesOfDay, setBulkTimesOfDay] = useState<string[]>([])
  const [bulkNewTimeInput, setBulkNewTimeInput] = useState('')
  const [bulkChannels, setBulkChannels] = useState<string[]>([])

  const CHANNELS = [
    { value: 'instagram', label: 'Instagram Feed' },
    { value: 'instagram_story', label: 'Instagram Story' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'linkedin', label: 'LinkedIn Profile' },
  ]

const formatTimeDisplay = (time: string) => {
  if (!time) return ''

  const [hourStr, minuteStr = '00'] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return time
  }

  const date = new Date()
  date.setHours(hour, minute, 0, 0)

  return new Intl.DateTimeFormat('en-NZ', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

const FacebookIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <div className={`rounded bg-[#1877F2] flex items-center justify-center ${className}`}>
    <span className="text-white text-[10px] font-bold">f</span>
  </div>
)

const LinkedInIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <div className={`rounded bg-[#0A66C2] flex items-center justify-center ${className}`}>
    <span className="text-white text-[10px] font-bold">in</span>
  </div>
)

const InstagramIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <div className={`rounded bg-gradient-to-br from-[#833AB4] via-[#C13584] to-[#E1306C] flex items-center justify-center ${className}`}>
    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.07 1.645.07 4.85s-.012 3.584-.07 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.251-.149-4.771-1.699-4.919-4.919-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85c.149-3.227 1.664-4.771 4.919-4.919 1.266-.058 1.644-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072C3.58 0.238 2.31 1.684 2.163 4.947.105 6.227.092 6.635.092 9.897s.014 3.667.072 4.947c.147 3.264 1.693 4.534 4.947 4.682 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c3.264-.148 4.534-1.693 4.682-4.947.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947C23.762 2.316 22.316.846 19.053.698 17.773.64 17.365.626 14.103.626zM12 5.835a6.165 6.165 0 100 12.33 6.165 6.165 0 000-12.33zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" />
    </svg>
  </div>
)

const CHANNEL_ICON_COMPONENTS: Record<string, (props: { className?: string }) => JSX.Element> = {
  instagram: InstagramIcon,
  instagram_story: InstagramIcon,
  facebook: FacebookIcon,
  linkedin: LinkedInIcon,
}

const renderChannelIcons = (channels: string[]) =>
  channels.map((channel, index) => {
    const key = `${channel}-${index}`
    const normalized = channel?.toLowerCase?.() ?? channel
    const IconComponent = CHANNEL_ICON_COMPONENTS[normalized]

    if (IconComponent) {
      return <IconComponent key={key} className="w-4 h-4" />
    }

    return (
      <div
        key={key}
        className="w-4 h-4 rounded bg-gray-300 text-gray-700 text-[10px] flex items-center justify-center uppercase"
      >
        {normalized ? normalized.charAt(0) : '?'}
      </div>
    )
  })

  useEffect(() => {
    if (subcategoryId) {
      fetchOccurrences()
      fetchSubcategoryUrl()
    } else {
      // For new subcategories, just clear occurrences and set loading to false
      setOccurrences([])
      setLoading(false)
      setSubcategoryUrl(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, subcategoryId])

  const fetchSubcategoryUrl = async () => {
    if (!subcategoryId) return
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('url')
        .eq('id', subcategoryId)
        .single()

      if (error) throw error
      setSubcategoryUrl(data?.url || null)
    } catch (err) {
      console.error('Error fetching subcategory URL:', err)
      setSubcategoryUrl(null)
    }
  }

  // Fetch locked months on mount and when modal opens
  useEffect(() => {
    fetchLockedMonths()
  }, [brandId])

  // Also fetch when add modal opens to ensure we have latest data
  useEffect(() => {
    if (isAddModalOpen) {
      fetchLockedMonths()
    }
  }, [isAddModalOpen, brandId])

  // Calculate minDate and update when lockedMonths, lockedMonthsLoaded, or brandTimezone changes
  useEffect(() => {
    calculateMinDate()
  }, [lockedMonths, lockedMonthsLoaded, brandTimezone])

  // Debug: Log when minDate changes
  useEffect(() => {
    if (lockedMonths.length > 0) {
      console.log('Locked months:', lockedMonths, 'Min date:', minDate)
    }
  }, [minDate, lockedMonths])

  // EventOccurrencesManager is ONLY used for date/date_range occurrences
  // So we don't enforce locked month restrictions here
  // (Locked months should only apply to recurring frequencies like daily/weekly/monthly)

  // Notify parent when occurrences change
  useEffect(() => {
    onOccurrencesChange?.(occurrences)
  }, [occurrences, onOccurrencesChange])

  const fetchOccurrences = async () => {
    if (!subcategoryId) {
      console.log('EventOccurrencesManager: No subcategoryId, skipping fetch')
      return
    }
    
    try {
      console.log('EventOccurrencesManager: Fetching occurrences for subcategoryId:', subcategoryId)
      setLoading(true)
      const { data, error } = await supabase
        .from('schedule_rules')
        .select('*')
        .eq('brand_id', brandId)
        .eq('subcategory_id', subcategoryId)
        .eq('frequency', 'specific')
        .is('archived_at', null) // Only fetch non-archived occurrences
        .order('start_date', { ascending: true })

      if (error) {
        console.error('EventOccurrencesManager: Error fetching occurrences:', error)
        throw error
      }

      console.log('EventOccurrencesManager: Fetched occurrences:', data?.length || 0, 'items')

      const mapped = (data || []).map((rule): EventOccurrence => ({
        id: rule.id,
        frequency: (rule.end_date && rule.end_date !== rule.start_date ? 'date_range' : 'date') as 'date' | 'date_range',
        start_date: rule.start_date,
        end_date: rule.end_date,
        times_of_day: Array.isArray(rule.time_of_day) ? rule.time_of_day : (rule.time_of_day ? [rule.time_of_day] : []),
        channels: rule.channels || [],
        timezone: rule.timezone || brandTimezone,
        is_active: rule.is_active ?? true,
        detail: rule.detail || null,
        url: rule.url || null
      }))

      console.log('EventOccurrencesManager: Mapped occurrences:', mapped.length)
      setOccurrences(mapped)
    } catch (err) {
      console.error('Error fetching occurrences:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchLockedMonths = async () => {
    try {
      setLockedMonthsLoaded(false) // Mark as loading
      const response = await fetch(`/api/framework/pushed-months?brandId=${brandId}`)
      if (!response.ok) {
        console.error('Failed to fetch locked months:', response.status, response.statusText)
        setLockedMonthsLoaded(true) // Mark as loaded even on error
        return
      }
      const data = await response.json()
      console.log('Locked months fetched:', data.lockedMonths)
      setLockedMonths(data.lockedMonths || [])
      setLockedMonthsLoaded(true) // Mark as loaded
    } catch (err) {
      console.error('Error fetching locked months:', err)
      setLockedMonthsLoaded(true) // Mark as loaded even on error
    }
  }

  // Helper: Convert date string to Date object at noon UTC to avoid timezone rollbacks
  const toDateAtNoonUTC = (dateStr: string): Date => {
    return new Date(dateStr + 'T12:00:00Z')
  }

  // Helper: Convert Date to ISO string (yyyy-MM-dd)
  const toISOString = (date: Date): string => {
    return date.toISOString().slice(0, 10) // Returns yyyy-MM-dd
  }

  const calculateMinDate = () => {
    // Don't calculate until locked months are loaded
    if (!lockedMonthsLoaded) {
      console.log('Waiting for locked months to load...')
      return
    }

    if (lockedMonths.length === 0) {
      // No locked months - allow any date from today
      const now = new Date()
      const todayInBrandTz = new Intl.DateTimeFormat('en-CA', {
        timeZone: brandTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now)
      console.log('No locked months, setting minDate to today:', todayInBrandTz)
      setMinDate(todayInBrandTz) // Already in yyyy-MM-dd format
      setBlockedMaxDate('')
      return
    }

    // Find the LATEST locked month (most recent/furthest in future)
    const sortedLockedMonths = [...lockedMonths].sort()
    const latestLockedMonth = sortedLockedMonths[sortedLockedMonths.length - 1]
    
    console.log('Latest locked month:', latestLockedMonth)

    // Parse the latest locked month
    const [lockedYear, lockedMonth] = latestLockedMonth.split('-').map(Number)
    
    // Calculate the first day of the month AFTER the latest locked month
    let nextMonth = lockedMonth + 1
    let nextYear = lockedYear
    
    if (nextMonth > 12) {
      nextMonth = 1
      nextYear = lockedYear + 1
    }
    
    // Set minDate to the first day of the month after the latest locked month
    // Format: yyyy-MM-dd (ISO format required by native date input)
    const firstUnlockedMonthStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
    console.log('First unlocked month start (minDate):', firstUnlockedMonthStart)
    
    setMinDate(firstUnlockedMonthStart) // ISO format: yyyy-MM-dd
    setBlockedMaxDate('') // No need for max date - minDate handles it
  }

  // Helper function to extract date part (YYYY-MM-DD) from a date string
  const extractDatePart = (dateValue: string | null): string => {
    if (!dateValue) return ''
    const normalizeToUTC = (dateStr: string): string => {
      if (dateStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
        return dateStr
      }
      return dateStr.endsWith('Z') ? dateStr : dateStr + 'Z'
    }
    const normalized = normalizeToUTC(dateValue)
    const utcDate = new Date(normalized)
    const year = utcDate.getUTCFullYear()
    const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(utcDate.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Check if a date is in a locked month
  const isDateLocked = (dateStr: string): boolean => {
    if (!dateStr) return false
    const [year, month] = dateStr.split('-').map(Number)
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const isLocked = lockedMonths.includes(monthStr)
    console.log('isDateLocked check:', { dateStr, year, month, monthStr, lockedMonths, isLocked })
    return isLocked
  }

  // Check if two dates are in the same month (YYYY-MM format)
  const isSameMonth = (date1: string, date2: string): boolean => {
    if (!date1 || !date2) return false
    const month1 = date1.substring(0, 7) // YYYY-MM
    const month2 = date2.substring(0, 7)
    return month1 === month2
  }

  // Get the month string (YYYY-MM) for a date
  const getMonthString = (dateStr: string): string => {
    if (!dateStr) return ''
    return dateStr.substring(0, 7) // YYYY-MM
  }

  const resetForm = () => {
    setIsDateRange(false)
    setStartDate('')
    setEndDate('')
    setTimesOfDay([])
    setNewTimeInput('')
    setChannels([])
    setUrl('')
    setTimezone(brandTimezone)
    setDetail('')
    setIsEditing(null)
  }

  const resetFormWithDefaults = () => {
    resetForm()
    // If there are existing occurrences, default to the first one's values
    if (occurrences.length > 0) {
      const firstOccurrence = occurrences[0]
      setTimesOfDay([...firstOccurrence.times_of_day])
      setChannels([...firstOccurrence.channels])
      setTimezone(firstOccurrence.timezone)
      // Default URL from first occurrence if present, otherwise subcategory URL
      setUrl(firstOccurrence.url || subcategoryUrl || '')
      // Don't default detail from subcategory when editing - use existing occurrence detail or empty
      setDetail('')
    } else {
      // For new occurrences, default detail from subcategory description
      setDetail(subcategoryDetail || '')
      // Default URL from subcategory
      if (subcategoryUrl) {
        setUrl(subcategoryUrl)
      }
    }
  }

  const handleAddTime = () => {
    if (newTimeInput && !timesOfDay.includes(newTimeInput)) {
      setTimesOfDay([...timesOfDay, newTimeInput])
      setNewTimeInput('')
    }
  }

  const handleRemoveTime = (time: string) => {
    setTimesOfDay(timesOfDay.filter(t => t !== time))
  }

  const handleBulkAddTime = () => {
    if (bulkNewTimeInput && !bulkTimesOfDay.includes(bulkNewTimeInput)) {
      setBulkTimesOfDay([...bulkTimesOfDay, bulkNewTimeInput])
      setBulkNewTimeInput('')
    }
  }

  const handleBulkRemoveTime = (time: string) => {
    setBulkTimesOfDay(bulkTimesOfDay.filter(t => t !== time))
  }

  const toggleChannel = (channel: string) => {
    setChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    )
  }

  const toggleBulkChannel = (channel: string) => {
    setBulkChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    )
  }

  const parseBulkLines = (input: string): Array<{ frequency: 'date' | 'date_range', start: string, end?: string }> => {
    return input
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        // Match date range: "2026-04-12 to 2026-07-21" (case insensitive)
        const rangeMatch = line.match(/^(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})$/i)
        if (rangeMatch) {
          const start = rangeMatch[1]
          const end = rangeMatch[2]
          // EventOccurrencesManager is ONLY for date/date_range, so no locked month checks needed
          return { frequency: 'date_range' as const, start, end }
        }
        
        // Match single date: "2026-04-12"
        const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})$/)
        if (dateMatch) {
          const start = dateMatch[1]
          // EventOccurrencesManager is ONLY for date/date_range, so no locked month checks needed
          return { frequency: 'date' as const, start }
        }
        
        throw new Error(`Unrecognized line: ${line}`)
      })
  }

  const handleSaveSingle = async () => {
    // EventOccurrencesManager is ONLY for date/date_range occurrences
    // Locked month restrictions should only apply to recurring frequencies (daily/weekly/monthly)
    
    if (!startDate || timesOfDay.length === 0 || channels.length === 0) {
      showToast({
        type: 'error',
        title: 'Missing required fields',
        message: 'Please fill in all required fields (date, times, and channels)'
      })
      return
    }

    if (isDateRange) {
      if (!endDate || endDate < startDate) {
        showToast({
          type: 'error',
          title: 'Invalid date range',
          message: 'End date must be after start date'
        })
        return
      }
    }

    // Validate date changes for existing occurrences
    if (isEditing && isEditing.id && !isEditing.id.startsWith('draft-')) {
      // This is an existing occurrence being edited
      const originalStartDate = extractDatePart(isEditing.start_date)
      const originalMonth = getMonthString(originalStartDate)
      const newMonth = getMonthString(startDate)
      
      // Allow editing if:
      // 1. New date is in the same month as original (can edit details, URL, etc. even if month is locked)
      // 2. New date is not in a locked month (can move to unlocked months)
      // Block only if: new date is in a different locked month
      if (originalMonth !== newMonth) {
        // Date is being moved to a different month
        if (isDateLocked(startDate)) {
          // New month is locked - block the change
          showToast({
            type: 'error',
            title: 'Cannot change date',
            message: 'This occurrence has drafts already generated for that month. You cannot move it outside this month.'
          })
          return
        }
        // New month is not locked - allow the change
      }
      // Same month - always allow (editing details, URL, etc. is fine)
    }

    try {
      // Create timestamptz strings - use UTC explicitly to preserve the date correctly
      // Date inputs are in YYYY-MM-DD format, we store as UTC midnight to avoid timezone conversion issues
      let startDateTz = ''
      let endDateTz: string | null = null
      
      if (!startDate) {
        throw new Error('Start date is required')
      }
      
      // Validate start_date is a valid date
      const startDateObj = new Date(startDate)
      if (isNaN(startDateObj.getTime())) {
        throw new Error('Invalid start date')
      }
      
      // Store as UTC midnight to preserve the exact date
      // The timezone field in the rule will be used when scheduling/generating posts
      startDateTz = `${startDate}T00:00:00Z`
      
      if (isDateRange && endDate) {
        // Validate end_date is a valid date
        const endDateObj = new Date(endDate)
        if (isNaN(endDateObj.getTime())) {
          throw new Error('Invalid end date')
        }
        endDateTz = `${endDate}T23:59:59Z`
      } else if (!isDateRange && startDate) {
        // For single-day events, set end_date to start_date to satisfy database constraint
        endDateTz = startDateTz
      } else {
        // Fallback: if no endDate provided for range, use startDate
        endDateTz = startDateTz
      }
      
      // Ensure timezone is set (default to brand timezone)
      const finalTimezone = timezone || brandTimezone || 'Pacific/Auckland'
      
      const occurrence: EventOccurrence = {
        id: isEditing?.id || `draft-${Date.now()}-${Math.random()}`,
        frequency: isDateRange ? 'date_range' : 'date',
        start_date: startDateTz,
        end_date: endDateTz,
        times_of_day: timesOfDay.length > 0 ? timesOfDay : [],
        channels: channels.length > 0 ? channels : [],
        timezone: finalTimezone,
        is_active: true,
        detail: detail.trim() || null,
        url: url.trim() || null
      }

      if (subcategoryId) {
        // Save to database if subcategoryId exists
        const payload = {
          brand_id: brandId,
          subcategory_id: subcategoryId,
          frequency: 'specific' as const,
          start_date: occurrence.start_date,
          end_date: occurrence.end_date,
          time_of_day: occurrence.times_of_day.length > 0 ? occurrence.times_of_day : [],
          channels: occurrence.channels.length > 0 ? occurrence.channels : [],
          timezone: occurrence.timezone,
          is_active: true,
          days_before: [], // Empty array for specific frequency
          days_during: null, // null is fine when end_date is set
          detail: occurrence.detail || null,
          url: occurrence.url || null
        }

        console.info('[EventOccurrencesManager] Saving occurrence:', {
          isEditing: !!isEditing,
          occurrenceId: isEditing?.id,
          payload
        })

        if (isEditing && isEditing.id && !isEditing.id.startsWith('draft-')) {
          // Update existing occurrence
          const { data, error: updateError } = await supabase
            .from('schedule_rules')
            .update(payload)
            .eq('id', isEditing.id)
            .select()
          
          console.info('[EventOccurrencesManager] Update response:', { data, error: updateError })
          
          if (updateError) {
            console.error('[EventOccurrencesManager] Error updating occurrence:', updateError)
            throw new Error(`Failed to update occurrence: ${updateError.message || updateError.code || 'Unknown error'}`)
          }
          
          console.info('[EventOccurrencesManager] Successfully updated occurrence:', data)
        } else {
          // Insert new occurrence
          const { data, error: insertError } = await supabase
            .from('schedule_rules')
            .insert(payload)
            .select()
          
          console.info('[EventOccurrencesManager] Insert response:', { data, error: insertError })
          
          if (insertError) {
            console.error('[EventOccurrencesManager] Error inserting occurrence:', insertError)
            throw new Error(`Failed to save occurrence: ${insertError.message || insertError.code || 'Unknown error'}`)
          }
          
          console.info('[EventOccurrencesManager] Successfully inserted occurrence:', data)
        }
        
        // Refresh occurrences list
        await fetchOccurrences()
        onOccurrencesChanged?.()
        
        showToast({
          type: 'success',
          title: 'Occurrence saved',
          message: isEditing ? 'Occurrence updated successfully' : 'Occurrence added successfully'
        })
      } else {
        // For new subcategories, just update local state
        if (isEditing) {
          setOccurrences(prev => prev.map(o => o.id === isEditing.id ? occurrence : o))
        } else {
          setOccurrences(prev => [...prev, occurrence])
        }
        
        console.info('[EventOccurrencesManager] Updated local state (no subcategoryId yet):', occurrence)
      }

      resetForm()
      setIsAddModalOpen(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save occurrence'
      console.error('[EventOccurrencesManager] Error saving occurrence:', err)
      showToast({
        type: 'error',
        title: 'Failed to save occurrence',
        message: errorMessage
      })
    }
  }

  const handleBulkSave = async () => {
    if (!bulkInput.trim()) {
      showToast({
        type: 'error',
        title: 'Missing dates',
        message: 'Please enter at least one date or date range'
      })
      return
    }

    if (bulkTimesOfDay.length === 0 || bulkChannels.length === 0) {
      showToast({
        type: 'error',
        title: 'Missing required fields',
        message: 'Please provide default times and channels for all occurrences'
      })
      return
    }

    try {
      const parsed = parseBulkLines(bulkInput)
      
      if (subcategoryId) {
        // Save to database if subcategoryId exists
        // Create timestamps that represent midnight in UTC to preserve the date correctly
        const inserts = parsed.map(p => {
          const endDate = p.frequency === 'date_range' && p.end ? `${p.end}T23:59:59Z` : `${p.start}T23:59:59Z`
          return {
            brand_id: brandId,
            subcategory_id: subcategoryId,
            frequency: 'specific' as const,
            start_date: `${p.start}T00:00:00Z`, // Use UTC explicitly
            end_date: endDate, // Always set end_date (use start_date for single dates)
            time_of_day: bulkTimesOfDay.length > 0 ? bulkTimesOfDay : [],
            channels: bulkChannels.length > 0 ? bulkChannels : [],
            timezone: brandTimezone || 'Pacific/Auckland',
            is_active: true,
            days_before: [],
            days_during: null,
            detail: null,
            url: null
          }
        })

        console.info('[EventOccurrencesManager] Bulk saving occurrences:', { count: inserts.length, inserts })

        const { data, error: insertError } = await supabase
          .from('schedule_rules')
          .insert(inserts)
          .select()

        console.info('[EventOccurrencesManager] Bulk insert response:', { data, error: insertError })

        if (insertError) {
          console.error('[EventOccurrencesManager] Error bulk saving occurrences:', insertError)
          throw new Error(`Failed to save occurrences: ${insertError.message || insertError.code || 'Unknown error'}`)
        }

        await fetchOccurrences()
        onOccurrencesChanged?.()
        
        showToast({
          type: 'success',
          title: 'Occurrences added',
          message: `Successfully added ${inserts.length} occurrence(s)`
        })
      } else {
        // For new subcategories, just update local state
        const newOccurrences: EventOccurrence[] = parsed.map((p, idx) => ({
          id: `draft-${Date.now()}-${idx}-${Math.random()}`,
          frequency: p.frequency,
          start_date: `${p.start}T00:00:00Z`, // Use UTC explicitly
          end_date: p.frequency === 'date_range' && p.end ? `${p.end}T23:59:59Z` : `${p.start}T23:59:59Z`, // Use UTC explicitly
          times_of_day: bulkTimesOfDay,
          channels: bulkChannels,
          timezone: brandTimezone,
          is_active: true,
          detail: null,
          url: null
        }))
        setOccurrences(prev => [...prev, ...newOccurrences])
        console.info('[EventOccurrencesManager] Added to local state (no subcategoryId yet):', newOccurrences.length, 'occurrences')
      }

      setBulkInput('')
      setBulkTimesOfDay([])
      setBulkChannels([])
      setIsBulkModalOpen(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk save occurrences'
      console.error('[EventOccurrencesManager] Error bulk saving:', err)
      showToast({
        type: 'error',
        title: 'Failed to save occurrences',
        message: errorMessage
      })
    }
  }

  const handleEdit = (occurrence: EventOccurrence) => {
    const startDatePart = extractDatePart(occurrence.start_date)
    const endDatePart = extractDatePart(occurrence.end_date)

    // EventOccurrencesManager is ONLY used for date/date_range occurrences
    // So we don't need to enforce locked month restrictions here
    // (Locked months should only apply to recurring frequencies like daily/weekly/monthly)
    
    setIsEditing(occurrence)
    setIsDateRange(occurrence.frequency === 'date_range')
    setStartDate(startDatePart)
    setEndDate(endDatePart)
    setTimesOfDay(occurrence.times_of_day || [])
    setChannels(occurrence.channels || [])
    setTimezone(occurrence.timezone || brandTimezone)
    setDetail(occurrence.detail || '')
    // Use occurrence URL if present, otherwise fall back to subcategory URL
    setUrl(occurrence.url || subcategoryUrl || '')
    setIsAddModalOpen(true)
  }

  const handleDuplicate = async (occurrence: EventOccurrence) => {
    try {
      const duplicated: EventOccurrence = {
        ...occurrence,
        id: `draft-${Date.now()}-${Math.random()}`,
        detail: occurrence.detail || null,  // Ensure detail is copied
        url: occurrence.url || null  // Ensure url is copied
      }

      if (subcategoryId) {
        const payload = {
          brand_id: brandId,
          subcategory_id: subcategoryId,
          frequency: 'specific' as const,
          start_date: occurrence.start_date,
          end_date: occurrence.end_date,
          time_of_day: occurrence.times_of_day.length > 0 ? occurrence.times_of_day : [],
          channels: occurrence.channels.length > 0 ? occurrence.channels : [],
          timezone: occurrence.timezone || brandTimezone || 'Pacific/Auckland',
          is_active: true,
          days_before: [],
          days_during: null,
          detail: occurrence.detail || null,
          url: occurrence.url || null
        }

        console.info('[EventOccurrencesManager] Duplicating occurrence:', { payload })

        const { data, error: insertError } = await supabase
          .from('schedule_rules')
          .insert(payload)
          .select()

        console.info('[EventOccurrencesManager] Duplicate insert response:', { data, error: insertError })

        if (insertError) {
          console.error('[EventOccurrencesManager] Error duplicating occurrence:', insertError)
          throw new Error(`Failed to duplicate occurrence: ${insertError.message || insertError.code || 'Unknown error'}`)
        }

        await fetchOccurrences()
        onOccurrencesChanged?.()
        
        showToast({
          type: 'success',
          title: 'Occurrence duplicated',
          message: 'Occurrence duplicated successfully'
        })
      } else {
        setOccurrences(prev => [...prev, duplicated])
        console.info('[EventOccurrencesManager] Duplicated in local state (no subcategoryId yet):', duplicated)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate occurrence'
      console.error('[EventOccurrencesManager] Error duplicating occurrence:', err)
      showToast({
        type: 'error',
        title: 'Failed to duplicate occurrence',
        message: errorMessage
      })
    }
  }

  const handleDeleteOccurrence = async (occurrence: EventOccurrence) => {
    if (!confirm(`Are you sure you want to delete this event date? Any drafts already generated for this occurrence will not be automatically removed.`)) return

    try {
      if (subcategoryId && !occurrence.id.startsWith('draft-')) {
        // Delete from database
        const { error } = await supabase
          .from('schedule_rules')
          .delete()
          .eq('id', occurrence.id)

        if (error) {
          console.error('[EventOccurrencesManager] delete error:', error)
          throw error
        }

        // Remove from local state
        setOccurrences(prev => prev.filter(o => o.id !== occurrence.id))
        onOccurrencesChanged?.()
        
        showToast({
          type: 'success',
          title: 'Event date deleted',
          message: 'Event date deleted successfully'
        })
      } else {
        // For draft occurrences, just remove from local state
        setOccurrences(prev => prev.filter(o => o.id !== occurrence.id))
        showToast({
          type: 'success',
          title: 'Event date deleted',
          message: 'Event date deleted successfully'
        })
      }
    } catch (err) {
      console.error('[EventOccurrencesManager] delete error:', err)
      showToast({
        type: 'error',
        title: 'Could not delete this event date',
        message: 'Please try again.'
      })
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatDateRange = (start: string, end: string | null) => {
    if (!end || end === start) {
      return formatDate(start)
    }
    const startDate = new Date(start)
    const endDate = new Date(end)
    const startFormatted = startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const endFormatted = endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${startFormatted}–${endFormatted}`
  }

  const upcomingOccurrences = occurrences.filter(o => {
    const end = o.end_date || o.start_date
    return new Date(end) >= new Date()
  })

  const pastOccurrences = occurrences.filter(o => {
    const end = o.end_date || o.start_date
    return new Date(end) < new Date()
  })

  if (loading) {
    return <div className="text-sm text-gray-500">Loading occurrences...</div>
  }

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
      >
        <span className="font-medium text-gray-900">Event Dates</span>
        <span className="text-sm text-gray-500">
          {upcomingOccurrences.length} upcoming
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                resetFormWithDefaults()
                setIsAddModalOpen(true)
              }}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Occurrence
            </button>
          </div>

          {upcomingOccurrences.length > 0 && (
            <div className="space-y-2 mb-4">
              <div className="text-xs font-medium text-gray-500 uppercase mb-2">Upcoming</div>
              {upcomingOccurrences.map((occ) => (
                <div
                  key={occ.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">
                      {formatDateRange(occ.start_date, occ.end_date)}
                    </span>
                    <span className="text-gray-500">
                      {occ.times_of_day.map(formatTimeDisplay).join(', ')}
                    </span>
                    <div className="flex items-center gap-1">
                      {renderChannelIcons(occ.channels)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(occ)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(occ)}
                      className="text-gray-600 hover:text-gray-800 text-xs"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOccurrence(occ)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pastOccurrences.length > 0 && (
            <details className="mt-4">
              <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                Show past ({pastOccurrences.length})
              </summary>
              <div className="mt-2 space-y-2">
                {pastOccurrences.map((occ) => (
                  <div
                    key={occ.id}
                    className="flex items-center justify-between p-2 bg-gray-100 rounded text-sm text-gray-400"
                  >
                    <div className="flex items-center gap-3">
                      <span>{formatDateRange(occ.start_date, occ.end_date)}</span>
                    <span>{occ.times_of_day.map(formatTimeDisplay).join(', ')}</span>
                    <div className="flex items-center gap-1">
                      {renderChannelIcons(occ.channels)}
                    </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(occ)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOccurrence(occ)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {occurrences.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-4">
              No event dates yet. Add your first occurrence to get started.
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Single Occurrence Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          resetForm()
        }}
        title={isEditing ? 'Edit Occurrence' : 'Add Occurrence'}
      >
        <div className="space-y-4">
          <FormField label="Date Type">
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!isDateRange}
                  onChange={() => setIsDateRange(false)}
                  className="mr-2"
                />
                Single Date
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={isDateRange}
                  onChange={() => setIsDateRange(true)}
                  className="mr-2"
                />
                Date Range
              </label>
            </div>
          </FormField>

          <FormField label={isDateRange ? 'Start Date' : 'Date'} required>
            <input
              id="specificDate"
              name="specificDate"
              ref={startDateInputRef}
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            />
          </FormField>

          {isDateRange && (
            <FormField label="End Date" required>
              <input
                id="specificEndDate"
                name="specificEndDate"
                ref={endDateInputRef}
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              />
            </FormField>
          )}

          <FormField label="Times of Day" required>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={newTimeInput}
                  onChange={(e) => setNewTimeInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAddTime}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Add
                </button>
              </div>
              {timesOfDay.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {timesOfDay.map((time) => (
                    <span
                      key={time}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                    >
                      {time}
                      <button
                        type="button"
                        onClick={() => handleRemoveTime(time)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          <FormField label="Channels" required>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((ch) => (
                <label key={ch.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={channels.includes(ch.value)}
                    onChange={() => toggleChannel(ch.value)}
                    className="mr-2"
                  />
                  {ch.label}
                </label>
              ))}
            </div>
          </FormField>

          <FormField label="Occurrence details">
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Starts with the main subcategory description. Edit this if you want to customise details for this specific date or promo."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              rows={3}
            />
          </FormField>

          <FormField label="URL">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </FormField>

          <FormField label="Timezone">
            <TimezoneSelect
              value={timezone}
              onChange={setTimezone}
              placeholder="Select a timezone"
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false)
                resetForm()
              }}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSingle}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {isEditing ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Add Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => {
          setIsBulkModalOpen(false)
          setBulkInput('')
        }}
        title="Add Multiple Dates"
      >
        <div className="space-y-4">
          <FormField label="Dates (one per line)" required>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={`2026-04-12
2026-07-06 to 2026-07-21
2026-09-28 to 2026-10-13
2026-12-13 to 2027-01-28`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: Single date (YYYY-MM-DD) or range (YYYY-MM-DD to YYYY-MM-DD)
            </p>
          </FormField>

          <FormField label="Default Times of Day" required>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={bulkNewTimeInput}
                  onChange={(e) => setBulkNewTimeInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleBulkAddTime}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Add
                </button>
              </div>
              {bulkTimesOfDay.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {bulkTimesOfDay.map((time) => (
                    <span
                      key={time}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                    >
                      {time}
                      <button
                        type="button"
                        onClick={() => handleBulkRemoveTime(time)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          <FormField label="Default Channels" required>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((ch) => (
                <label key={ch.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={bulkChannels.includes(ch.value)}
                    onChange={() => toggleBulkChannel(ch.value)}
                    className="mr-2"
                  />
                  {ch.label}
                </label>
              ))}
            </div>
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsBulkModalOpen(false)
                setBulkInput('')
              }}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add All
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

