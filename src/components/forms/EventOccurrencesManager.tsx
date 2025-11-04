'use client'

import { useState, useEffect } from 'react'
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

  // Form state for single occurrence
  const [isDateRange, setIsDateRange] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [timesOfDay, setTimesOfDay] = useState<string[]>([])
  const [newTimeInput, setNewTimeInput] = useState('')
  const [channels, setChannels] = useState<string[]>([])
  const [timezone, setTimezone] = useState(brandTimezone)

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
    } else {
      // For new subcategories, just clear occurrences and set loading to false
      setOccurrences([])
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, subcategoryId])

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

  const resetForm = () => {
    setIsDateRange(false)
    setStartDate('')
    setEndDate('')
    setTimesOfDay([])
    setNewTimeInput('')
    setChannels([])
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
          return { frequency: 'date_range' as const, start: rangeMatch[1], end: rangeMatch[2] }
        }
        
        // Match single date: "2026-04-12"
        const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})$/)
        if (dateMatch) {
          return { frequency: 'date' as const, start: dateMatch[1] }
        }
        
        throw new Error(`Unrecognized line: ${line}`)
      })
  }

  const handleSaveSingle = async () => {
    if (!startDate || timesOfDay.length === 0 || channels.length === 0) {
      alert('Please fill in all required fields')
      return
    }

    if (isDateRange && (!endDate || endDate < startDate)) {
      alert('End date must be after start date')
      return
    }

    try {
      const occurrence: EventOccurrence = {
        id: isEditing?.id || `draft-${Date.now()}-${Math.random()}`,
        frequency: isDateRange ? 'date_range' : 'date',
        start_date: startDate ? `${startDate}T00:00:00` : '',
        end_date: isDateRange && endDate ? `${endDate}T23:59:59` : null,
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
          is_active: true
        }

        if (isEditing) {
          await supabase
            .from('schedule_rules')
            .update(payload)
            .eq('id', isEditing.id)
        } else {
          await supabase
            .from('schedule_rules')
            .insert(payload)
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
        const inserts = parsed.map(p => ({
          brand_id: brandId,
          subcategory_id: subcategoryId,
          frequency: 'specific',
          start_date: `${p.start}T00:00:00`,
          end_date: p.frequency === 'date_range' && p.end ? `${p.end}T23:59:59` : null,
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
          start_date: `${p.start}T00:00:00`,
          end_date: p.frequency === 'date_range' && p.end ? `${p.end}T23:59:59` : null,
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
    // Extract date part from timestamptz (YYYY-MM-DDTHH:MM:SS -> YYYY-MM-DD)
    const startDatePart = occurrence.start_date.split('T')[0]
    const endDatePart = occurrence.end_date ? occurrence.end_date.split('T')[0] : ''
    setStartDate(startDatePart)
    setEndDate(endDatePart)
    setTimesOfDay(occurrence.times_of_day)
    setChannels(occurrence.channels)
    setTimezone(occurrence.timezone)
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
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </FormField>

          {isDateRange && (
            <FormField label="End Date" required>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
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

