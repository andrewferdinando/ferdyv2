'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase-browser'
import Modal from '@/components/ui/Modal'
import { FormField } from '@/components/ui/Form'
import { Input } from '@/components/ui/Input'

interface EventOccurrence {
  id: string
  frequency: 'date' | 'date_range'
  start_date: string
  end_date: string | null
  times_of_day: string[]
  channels: string[]
  timezone: string
  is_active: boolean
}

interface EventOccurrencesManagerProps {
  brandId: string
  subcategoryId: string | null  // null for new subcategories
  brandTimezone: string
  onOccurrencesChanged?: () => void
  onOccurrencesChange?: (occurrences: EventOccurrence[]) => void  // Callback to pass occurrences to parent
}

export function EventOccurrencesManager({
  brandId,
  subcategoryId,
  brandTimezone,
  onOccurrencesChanged,
  onOccurrencesChange
}: EventOccurrencesManagerProps) {
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

  // Bulk add state
  const [bulkInput, setBulkInput] = useState('')
  const [bulkTimesOfDay, setBulkTimesOfDay] = useState<string[]>([])
  const [bulkNewTimeInput, setBulkNewTimeInput] = useState('')
  const [bulkChannels, setBulkChannels] = useState<string[]>([])

  const CHANNELS = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'x', label: 'X (Twitter)' }
  ]

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

  // Clear invalid dates when minDate changes (e.g., when locked months load)
  // Use Date objects at noon UTC for proper comparison
  useEffect(() => {
    if (lockedMonthsLoaded && minDate) {
      if (startDate) {
        const startDateObj = toDateAtNoonUTC(startDate)
        const minDateObj = toDateAtNoonUTC(minDate)
        if (startDateObj < minDateObj) {
          console.log('Clearing invalid startDate (before minDate):', startDate, 'minDate:', minDate)
          setStartDate('')
          if (startDateInputRef.current) {
            startDateInputRef.current.value = ''
          }
        }
      }
      if (endDate) {
        const endDateObj = toDateAtNoonUTC(endDate)
        const minDateObj = toDateAtNoonUTC(minDate)
        if (endDateObj < minDateObj) {
          console.log('Clearing invalid endDate (before minDate):', endDate, 'minDate:', minDate)
          setEndDate('')
          if (endDateInputRef.current) {
            endDateInputRef.current.value = ''
          }
        }
      }
    }
  }, [minDate, lockedMonthsLoaded, startDate, endDate])

  // Validate startDate whenever it changes (backup validation)
  useEffect(() => {
    if (startDate && lockedMonthsLoaded && lockedMonths.length > 0) {
      console.log('Validating startDate:', startDate, 'isDateLocked:', isDateLocked(startDate), 'minDate:', minDate)
      
      // Check if date is before minDate (which is the first day after latest locked month)
      if (minDate && startDate < minDate) {
        console.log('Blocked via useEffect: Date is before minDate (before first unlocked month)')
        alert(`This date is in a locked month. The first available date is ${new Date(minDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`)
        setStartDate('')
        if (startDateInputRef.current) {
          startDateInputRef.current.value = ''
        }
        return
      }
      
      // Also check if date is in any locked month (double-check)
      if (isDateLocked(startDate)) {
        console.log('Blocked via useEffect: Date is in locked month')
        alert(`This date is in a locked month (${startDate.substring(0, 7)}). Please select a date from an unlocked month.`)
        setStartDate('')
        if (startDateInputRef.current) {
          startDateInputRef.current.value = ''
        }
      }
    }
  }, [startDate, lockedMonths, minDate, lockedMonthsLoaded])

  // Validate endDate whenever it changes (backup validation)
  useEffect(() => {
    if (endDate && lockedMonthsLoaded && lockedMonths.length > 0) {
      console.log('Validating endDate:', endDate, 'isDateLocked:', isDateLocked(endDate), 'minDate:', minDate)
      
      // Check if date is before minDate (which is the first day after latest locked month)
      if (minDate && endDate < minDate) {
        console.log('Blocked via useEffect: End date is before minDate (before first unlocked month)')
        alert(`This date is in a locked month. The first available date is ${new Date(minDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`)
        setEndDate('')
        if (endDateInputRef.current) {
          endDateInputRef.current.value = ''
        }
        return
      }
      
      // Also check if date is in any locked month (double-check)
      if (isDateLocked(endDate)) {
        console.log('Blocked via useEffect: End date is in locked month')
        alert(`This date is in a locked month (${endDate.substring(0, 7)}). Please select a date from an unlocked month.`)
        setEndDate('')
        if (endDateInputRef.current) {
          endDateInputRef.current.value = ''
        }
      }
    }
  }, [endDate, lockedMonths, minDate, lockedMonthsLoaded])

  // Notify parent when occurrences change
  useEffect(() => {
    onOccurrencesChange?.(occurrences)
  }, [occurrences, onOccurrencesChange])

  const fetchOccurrences = async () => {
    if (!subcategoryId) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('schedule_rules')
        .select('*')
        .eq('brand_id', brandId)
        .eq('subcategory_id', subcategoryId)
        .eq('frequency', 'specific')
        .order('start_date', { ascending: true })

      if (error) throw error

      const mapped = (data || []).map((rule): EventOccurrence => ({
        id: rule.id,
        frequency: (rule.end_date && rule.end_date !== rule.start_date ? 'date_range' : 'date') as 'date' | 'date_range',
        start_date: rule.start_date,
        end_date: rule.end_date,
        times_of_day: Array.isArray(rule.time_of_day) ? rule.time_of_day : (rule.time_of_day ? [rule.time_of_day] : []),
        channels: rule.channels || [],
        timezone: rule.timezone || brandTimezone,
        is_active: rule.is_active ?? true
      }))

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

  // Check if a date is in a locked month
  const isDateLocked = (dateStr: string): boolean => {
    if (!dateStr) return false
    const [year, month] = dateStr.split('-').map(Number)
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const isLocked = lockedMonths.includes(monthStr)
    console.log('isDateLocked check:', { dateStr, year, month, monthStr, lockedMonths, isLocked })
    return isLocked
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
    }
    // Default URL from subcategory
    if (subcategoryUrl) {
      setUrl(subcategoryUrl)
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
          // Validate dates are not in locked months
          if (isDateLocked(start)) {
            throw new Error(`Start date ${start} is in a locked month`)
          }
          if (isDateLocked(end)) {
            throw new Error(`End date ${end} is in a locked month`)
          }
          return { frequency: 'date_range' as const, start, end }
        }
        
        // Match single date: "2026-04-12"
        const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})$/)
        if (dateMatch) {
          const start = dateMatch[1]
          // Validate date is not in locked month
          if (isDateLocked(start)) {
            throw new Error(`Date ${start} is in a locked month`)
          }
          return { frequency: 'date' as const, start }
        }
        
        throw new Error(`Unrecognized line: ${line}`)
      })
  }

  const handleSaveSingle = async () => {
    // Server-side validation: reject any date before minDate (using noon UTC to avoid TZ rollbacks)
    if (lockedMonthsLoaded && minDate) {
      if (startDate) {
        const startDateObj = toDateAtNoonUTC(startDate)
        const minDateObj = toDateAtNoonUTC(minDate)
        if (startDateObj < minDateObj) {
          alert(`Invalid date: ${startDate} is before the first available date (${new Date(minDate + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}).`)
          return
        }
        if (isDateLocked(startDate)) {
          alert(`Invalid date: ${startDate} is in a locked month.`)
          return
        }
      }
      if (endDate) {
        const endDateObj = toDateAtNoonUTC(endDate)
        const minDateObj = toDateAtNoonUTC(minDate)
        if (endDateObj < minDateObj) {
          alert(`Invalid date: ${endDate} is before the first available date (${new Date(minDate + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}).`)
          return
        }
        if (isDateLocked(endDate)) {
          alert(`Invalid date: ${endDate} is in a locked month.`)
          return
        }
      }
    }
    if (!startDate || timesOfDay.length === 0 || channels.length === 0) {
      alert('Please fill in all required fields')
      return
    }

    // Validate that dates are not in locked months
    if (isDateLocked(startDate)) {
      alert('Start date cannot be in a month that has already been pushed to drafts')
      return
    }

    if (isDateRange) {
      if (!endDate || endDate < startDate) {
      alert('End date must be after start date')
      return
      }
      if (isDateLocked(endDate)) {
        alert('End date cannot be in a month that has already been pushed to drafts')
        return
      }
    }

    try {
      // Create timestamptz strings - use UTC explicitly to preserve the date correctly
      // Date inputs are in YYYY-MM-DD format, we store as UTC midnight to avoid timezone conversion issues
      let startDateTz = ''
      let endDateTz: string | null = null
      
      if (startDate) {
        // Store as UTC midnight to preserve the exact date
        // The timezone field in the rule will be used when scheduling/generating posts
        startDateTz = `${startDate}T00:00:00Z`
      }
      
      if (isDateRange && endDate) {
        endDateTz = `${endDate}T23:59:59Z`
      } else if (!isDateRange && startDate) {
        // For single-day events, set end_date to start_date to satisfy database constraint
        endDateTz = startDateTz
      }
      
      const occurrence: EventOccurrence = {
        id: isEditing?.id || `draft-${Date.now()}-${Math.random()}`,
        frequency: isDateRange ? 'date_range' : 'date',
        start_date: startDateTz,
        end_date: endDateTz,
        times_of_day: timesOfDay,
        channels,
        timezone,
        is_active: true
      }

      if (subcategoryId) {
        // Save to database if subcategoryId exists
        const payload = {
          brand_id: brandId,
          subcategory_id: subcategoryId,
          frequency: 'specific',
          start_date: occurrence.start_date,
          end_date: occurrence.end_date,
          time_of_day: occurrence.times_of_day,
          channels: occurrence.channels,
          timezone: occurrence.timezone,
          is_active: true,
          days_before: [], // Empty array for specific frequency
          days_during: null // null is fine when end_date is set
        }

        if (isEditing) {
          const { error: updateError } = await supabase
            .from('schedule_rules')
            .update(payload)
            .eq('id', isEditing.id)
          
          if (updateError) {
            console.error('Error updating occurrence:', updateError)
            throw updateError
          }
        } else {
          const { error: insertError } = await supabase
            .from('schedule_rules')
            .insert(payload)
          
          if (insertError) {
            console.error('Error inserting occurrence:', insertError)
            throw insertError
          }
        }
        await fetchOccurrences()
        onOccurrencesChanged?.()
      } else {
        // For new subcategories, just update local state
        if (isEditing) {
          setOccurrences(prev => prev.map(o => o.id === isEditing.id ? occurrence : o))
        } else {
          setOccurrences(prev => [...prev, occurrence])
        }
      }

      resetForm()
      setIsAddModalOpen(false)
    } catch (err) {
      console.error('Error saving occurrence:', err)
      alert('Failed to save occurrence')
    }
  }

  const handleBulkSave = async () => {
    if (!bulkInput.trim()) {
      alert('Please enter at least one date or date range')
      return
    }

    if (bulkTimesOfDay.length === 0 || bulkChannels.length === 0) {
      alert('Please provide default times and channels for all occurrences')
      return
    }

    try {
      const parsed = parseBulkLines(bulkInput)
      
      if (subcategoryId) {
        // Save to database if subcategoryId exists
        // Create timestamps that represent midnight in UTC to preserve the date correctly
        const inserts = parsed.map(p => ({
          brand_id: brandId,
          subcategory_id: subcategoryId,
          frequency: 'specific',
          start_date: `${p.start}T00:00:00Z`, // Use UTC explicitly
          end_date: p.frequency === 'date_range' && p.end ? `${p.end}T23:59:59Z` : null, // Use UTC explicitly
          time_of_day: bulkTimesOfDay.length > 0 ? bulkTimesOfDay : null,
          channels: bulkChannels,
          timezone: brandTimezone,
          is_active: true
        }))

        await supabase
          .from('schedule_rules')
          .insert(inserts)

        await fetchOccurrences()
        onOccurrencesChanged?.()
      } else {
        // For new subcategories, just update local state
        const newOccurrences: EventOccurrence[] = parsed.map((p, idx) => ({
          id: `draft-${Date.now()}-${idx}-${Math.random()}`,
          frequency: p.frequency,
          start_date: `${p.start}T00:00:00Z`, // Use UTC explicitly
          end_date: p.frequency === 'date_range' && p.end ? `${p.end}T23:59:59Z` : null, // Use UTC explicitly
          times_of_day: bulkTimesOfDay,
          channels: bulkChannels,
          timezone: brandTimezone,
          is_active: true
        }))
        setOccurrences(prev => [...prev, ...newOccurrences])
      }

      setBulkInput('')
      setBulkTimesOfDay([])
      setBulkChannels([])
      setIsBulkModalOpen(false)
    } catch (err) {
      console.error('Error bulk saving:', err)
      alert(err instanceof Error ? err.message : 'Failed to bulk save occurrences')
    }
  }

  const handleEdit = (occurrence: EventOccurrence) => {
    setIsEditing(occurrence)
    setIsDateRange(occurrence.frequency === 'date_range')
    // Normalize date strings to UTC format before parsing
    const normalizeToUTC = (dateStr: string): string => {
      if (dateStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
        return dateStr
      }
      return dateStr.endsWith('Z') ? dateStr : dateStr + 'Z'
    }
    
    // Extract date part from timestamptz, ensuring UTC parsing
    // Use UTC methods to avoid timezone conversion issues
    let startDatePart = ''
    let endDatePart = ''
    
    if (occurrence.start_date) {
      const normalized = normalizeToUTC(occurrence.start_date)
      const startDateObj = new Date(normalized)
      const year = startDateObj.getUTCFullYear()
      const month = String(startDateObj.getUTCMonth() + 1).padStart(2, '0')
      const day = String(startDateObj.getUTCDate()).padStart(2, '0')
      startDatePart = `${year}-${month}-${day}`
    }
    
    if (occurrence.end_date) {
      const normalized = normalizeToUTC(occurrence.end_date)
      const endDateObj = new Date(normalized)
      const year = endDateObj.getUTCFullYear()
      const month = String(endDateObj.getUTCMonth() + 1).padStart(2, '0')
      const day = String(endDateObj.getUTCDate()).padStart(2, '0')
      endDatePart = `${year}-${month}-${day}`
    }
    
    setStartDate(startDatePart)
    setEndDate(endDatePart)
    setTimesOfDay(occurrence.times_of_day)
    setChannels(occurrence.channels)
    setTimezone(occurrence.timezone)
    // URL is not stored per occurrence, so we'll use subcategory URL
    if (subcategoryUrl) {
      setUrl(subcategoryUrl)
    }
    setIsAddModalOpen(true)
  }

  const handleDuplicate = async (occurrence: EventOccurrence) => {
    try {
      const duplicated: EventOccurrence = {
        ...occurrence,
        id: `draft-${Date.now()}-${Math.random()}`
      }

      if (subcategoryId) {
        await supabase
          .from('schedule_rules')
          .insert({
            brand_id: brandId,
            subcategory_id: subcategoryId,
            frequency: 'specific',
            start_date: occurrence.start_date,
            end_date: occurrence.end_date,
            time_of_day: occurrence.times_of_day,
            channels: occurrence.channels,
            timezone: occurrence.timezone,
            is_active: true
          })
        await fetchOccurrences()
        onOccurrencesChanged?.()
      } else {
        setOccurrences(prev => [...prev, duplicated])
      }
    } catch (err) {
      console.error('Error duplicating occurrence:', err)
      alert('Failed to duplicate occurrence')
    }
  }

  const handleArchive = async (occurrence: EventOccurrence) => {
    if (!confirm(`Archive this occurrence?`)) return

    try {
      if (subcategoryId && !occurrence.id.startsWith('draft-')) {
        // Only update in database if it's a saved occurrence
        await supabase
          .from('schedule_rules')
          .update({ is_active: false })
          .eq('id', occurrence.id)
        await fetchOccurrences()
        onOccurrencesChanged?.()
      } else {
        // For draft occurrences, just remove from local state
        setOccurrences(prev => prev.filter(o => o.id !== occurrence.id))
      }
    } catch (err) {
      console.error('Error archiving occurrence:', err)
      alert('Failed to archive occurrence')
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
            <button
              type="button"
              onClick={() => {
                // Default bulk form to first occurrence's values if any exist
                if (occurrences.length > 0) {
                  const firstOccurrence = occurrences[0]
                  setBulkTimesOfDay([...firstOccurrence.times_of_day])
                  setBulkChannels([...firstOccurrence.channels])
                } else {
                  setBulkTimesOfDay([])
                  setBulkChannels([])
                }
                setBulkInput('')
                setBulkNewTimeInput('')
                setIsBulkModalOpen(true)
              }}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Add Multiple Dates
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
                      {occ.times_of_day.join(', ')}
                    </span>
                    <span className="text-gray-500">
                      {occ.channels.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join('+')}
                    </span>
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
                      onClick={() => handleArchive(occ)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Archive
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
                      <span>{occ.times_of_day.join(', ')}</span>
                      <span>{occ.channels.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join('+')}</span>
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
                        onClick={() => handleArchive(occ)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Archive
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
            {!lockedMonthsLoaded ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Loading date restrictions...
              </div>
            ) : minDate ? (
              <input
                id="specificDate"
                name="specificDate"
                ref={startDateInputRef}
                type="date"
                min={minDate}
                value={startDate}
                onChange={(e) => {
                  const selectedDate = e.target.value
                  console.log('onChange fired! Date selected:', selectedDate, 'minDate:', minDate)
                  
                  if (!selectedDate) {
                    setStartDate('')
                    return
                  }
                  
                  // STRICT validation using Date objects at noon UTC
                  const selectedDateObj = toDateAtNoonUTC(selectedDate)
                  const minDateObj = toDateAtNoonUTC(minDate)
                  
                  if (selectedDateObj < minDateObj) {
                    console.log('BLOCKED: Date is before minDate', selectedDate, '<', minDate)
                    alert(`This date is in a locked month. The first available date is ${new Date(minDate + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`)
                    e.target.value = ''
                    setStartDate('')
                    e.target.blur()
                    return
                  }
                  
                  if (isDateLocked(selectedDate)) {
                    console.log('BLOCKED: Date is in locked month')
                    alert(`This date is in a locked month (${selectedDate.substring(0, 7)}). Please select a date from an unlocked month.`)
                    e.target.value = ''
                    setStartDate('')
                    e.target.blur()
                    return
                  }
                  
                  console.log('Date ACCEPTED:', selectedDate)
                  setStartDate(selectedDate)
                }}
                onKeyDown={(e) => {
                  // Prevent typing when locked months exist
                  if (lockedMonths.length > 0 && minDate && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete')) {
                    e.preventDefault()
                    alert(`Please use the date picker. The first available date is ${new Date(minDate + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`)
                  }
                }}
                onPaste={(e) => {
                  // Prevent pasting when locked months exist
                  if (lockedMonths.length > 0 && minDate) {
                    e.preventDefault()
                    alert(`Please use the date picker. The first available date is ${new Date(minDate + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              />
            ) : (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-amber-50 text-amber-700">
                All upcoming months are already scheduled. Push a future month or contact an admin.
              </div>
            )}
            {lockedMonthsLoaded && lockedMonths.length > 0 && minDate && (
              <p className="text-xs text-gray-500 mt-1">
                Months with framework drafts are disabled: {lockedMonths.join(', ')}. First available date: {new Date(minDate + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </FormField>

          {isDateRange && (
            <FormField label="End Date" required>
              {!lockedMonthsLoaded ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  Loading date restrictions...
                </div>
              ) : minDate ? (
                <input
                  id="specificEndDate"
                  name="specificEndDate"
                  ref={endDateInputRef}
                  type="date"
                  min={startDate || minDate}
                  value={endDate}
                  onChange={(e) => {
                    const selectedDate = e.target.value
                    console.log('End date onChange fired! Date:', selectedDate, 'minDate:', minDate)
                    
                    if (!selectedDate) {
                      setEndDate('')
                      return
                    }
                    
                    // IMMEDIATE validation using Date objects at noon UTC
                    const minAllowed = startDate || minDate
                    if (minAllowed) {
                      const selectedDateObj = toDateAtNoonUTC(selectedDate)
                      const minAllowedObj = toDateAtNoonUTC(minAllowed)
                      if (selectedDateObj < minAllowedObj) {
                        console.log('BLOCKED: End date is before minAllowed')
                        alert(`End date must be on or after ${startDate ? 'start date' : new Date(minDate + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`)
                        e.target.value = ''
                        setEndDate('')
                        e.target.blur()
                        return
                      }
                    }
                    
                    if (isDateLocked(selectedDate)) {
                      console.log('BLOCKED: End date is in locked month')
                      alert(`This date is in a locked month (${selectedDate.substring(0, 7)}). Please select a date from an unlocked month.`)
                      e.target.value = ''
                      setEndDate('')
                      e.target.blur()
                      return
                    }
                    
                    console.log('End date ACCEPTED:', selectedDate)
                    setEndDate(selectedDate)
                  }}
                  onKeyDown={(e) => {
                    if (lockedMonths.length > 0 && minDate && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete')) {
                      e.preventDefault()
                    }
                  }}
                  onPaste={(e) => {
                    if (lockedMonths.length > 0 && minDate) {
                      e.preventDefault()
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                />
              ) : (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-amber-50 text-amber-700">
                  All upcoming months are already scheduled.
                </div>
              )}
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

          <FormField label="URL">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </FormField>

          <FormField label="Timezone">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="Pacific/Auckland">Pacific/Auckland (NZ)</option>
              <option value="Pacific/Sydney">Pacific/Sydney (AEST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            </select>
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
            {lockedMonths.length > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Note: Dates in locked months ({lockedMonths.join(', ')}) will be rejected.
              </p>
            )}
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

