'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
import AssetUploadMenu from '@/components/assets/AssetUploadMenu'
import { useFileUpload } from '@/hooks/assets/useFileUpload'
import SortableAssetGrid, { type AssetUsageInfo } from '@/components/assets/SortableAssetGrid'
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

const ChevronDownIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
  { number: 4, name: 'Media' },
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

// Stop words to filter when deriving hashtags from URL summary title
const HASHTAG_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
  'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'too', 'very', 'just', 'about', 'up',
  'out', 'all', 'also', 'as', 'its', 'it', 'this', 'that', 'these', 'those', 'my', 'your',
  'his', 'her', 'our', 'their', 'we', 'they', 'he', 'she', 'you', 'me', 'him', 'us', 'them',
  'get', 'got', 'go', 'going', 'come', 'coming', 'make', 'made', 'take', 'took', 'give',
  'new', 'old', 'big', 'top', 'best', 'most', 'more', 'less', 'per', 'each', 'every',
  'over', 'under', 'near', 'next', 'last', 'first', 'any', 'some', 'only', 'own', 'same',
  'now', 'here', 'there', 'when', 'where', 'how', 'what', 'which', 'who', 'why',
  'back', 'well', 'way', 'even', 'still', 'into', 'after', 'before', 'between',
  'find', 'see', 'look', 'like', 'want', 'need', 'try', 'let', 'keep', 'start',
  'book', 'save', 'free', 'open', 'join', 'sign', 'click', 'view', 'read', 'learn',
])

/**
 * Clean raw summary text from URL extraction.
 * Strips HTML artifacts, fixes concatenated words from missing whitespace,
 * and adds line breaks at section boundaries for readability.
 * Keeps full text — more context means better AI-generated copy.
 */
function cleanSummaryText(raw: string): string {
  const text = raw
    // Strip HTML tags (iframes, script tags, etc.)
    .replace(/<[^>]+>/g, ' ')
    // --- Section breaks: line breaks at major transitions ---
    // lowercase followed by 3+ ALLCAPS chars (new heading): "electricSAVE" → "electric\nSAVE"
    .replace(/([a-z])([A-Z]{3,})/g, '$1\n$2')
    // ALLCAPS → Capitalized word (heading→body): "TRACKGet" → "TRACK\nGet"
    .replace(/(?<=[A-Z])(?=[A-Z][a-z])/g, '\n')
    // Sentence-ending punctuation → new sentence: "time.Ages" → "time.\nAges"
    .replace(/([.!?])\s*([A-Z][a-z])/g, '$1\n$2')
    // --- Word breaks: spaces at minor transitions ---
    // lowercase → single Uppercase: "heightSingle" → "height Single"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // ALLCAPS → lowercase: "PERSONup" → "PERSON up"
    .replace(/(?<=[A-Z]{2})(?=[a-z])/g, ' ')
    // Punctuation/symbol → letter: "+Adult" → "+ Adult", ":Adults" → ": Adults"
    .replace(/([;:,+\-])([A-Za-z])/g, '$1 $2')
    // Digit → uppercase: "49PER" → "49 PER"
    .replace(/(\d)([A-Z])/g, '$1 $2')
    // Word → digit: "now2" → "now 2"
    .replace(/([a-z]{2,})(\d)/g, '$1 $2')
    // Digits → word: "$19book" → "$19 book"
    .replace(/(\d{2,})([a-z]{3,})/g, '$1 $2')
    // --- Clean up each line ---
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0)
    .join('\n')

  return text
}

/** Patterns that indicate a line is web noise rather than useful content */
const NOISE_LINE_PATTERNS = [
  /^no items found/i,
  /^\s*\d+\s*$/,                                         // Just a number
  /\b(book|buy|shop|order|grab|sign up|subscribe)\s*(now|today|here)\s*[.!]*$/i,
  /^(BEST VALUE|NEW|SALE|FREE|HOT DEAL|POPULAR|SPECIAL)\s*[!.\s]*$/i,
  /^save\s+\$\d/i,                                       // "Save $19"
  /^Nbook/i,                                              // Garbled artifact from "PERSONbook"
]

/**
 * Format cleaned text as bullet points, filtering out web noise.
 * Each meaningful line becomes a bullet point for easy scanning and editing.
 */
function formatAsBullets(text: string): string {
  const lines = text.split('\n')
  const bullets: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length < 8) continue
    if (NOISE_LINE_PATTERNS.some(p => p.test(trimmed))) continue
    bullets.push('• ' + trimmed)
  }

  // Drop the last bullet if it looks truncated (API caps summary at ~900 chars)
  if (bullets.length > 1) {
    const last = bullets[bullets.length - 1]
    if (!/[.!?:)"']$/.test(last)) {
      bullets.pop()
    }
  }

  return bullets.join('\n')
}

/**
 * Build a clean description from the URL summary response.
 * Formats as bullet points for readability — easy to scan, edit, and gives
 * the AI structured context for copy generation.
 */
function buildDescriptionFromSummary(details: Record<string, unknown>, rawSummary: string): string {
  // Primary: use the full summary text, cleaned up and formatted as bullets
  if (rawSummary && rawSummary.trim().length > 30) {
    const bulleted = formatAsBullets(cleanSummaryText(rawSummary))
    if (bulleted) return bulleted
    // formatAsBullets stripped everything — use raw summary as plain text
    return rawSummary.trim()
  }

  // Fallback: compose from key_points if available
  if (Array.isArray(details.key_points) && details.key_points.length >= 2) {
    const points = details.key_points
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      .slice(0, 8)
    if (points.length >= 2) {
      return points.map(p => '• ' + p.trim()).join('\n')
    }
  }

  // Sparse fallback: rawSnippet (lowered threshold from 60 to 20)
  if (typeof details.rawSnippet === 'string' && details.rawSnippet.trim().length > 20) {
    return details.rawSnippet.trim()
  }

  // Last resort: use title + subtitle if available
  const title = typeof details.title === 'string' ? details.title.trim() : ''
  const subtitle = typeof details.subtitle === 'string' ? details.subtitle.trim() : ''
  if (title && subtitle) return `${title}\n${subtitle}`
  if (title && title.length > 10) return title

  return ''
}

/**
 * Derive hashtags from the structured details returned by extract-url-summary.
 * Prioritises compound names (venue, competition, hosts) over individual title words.
 */
function deriveHashtagsFromSummary(details: Record<string, unknown>): string[] {
  const candidates: string[] = []

  // Add venue name as a compound hashtag (e.g. "GameOver")
  if (typeof details.venueName === 'string' && details.venueName) {
    candidates.push(details.venueName.replace(/[^a-zA-Z0-9]/g, ''))
  }

  // Add competition/series as a compound hashtag
  if (typeof details.competitionOrSeries === 'string' && details.competitionOrSeries) {
    candidates.push(details.competitionOrSeries.replace(/[^a-zA-Z0-9]/g, ''))
  }

  // Add hosts as compound hashtags
  if (Array.isArray(details.hosts)) {
    for (const host of details.hosts) {
      if (typeof host === 'string' && host) {
        candidates.push(host.replace(/[^a-zA-Z0-9]/g, ''))
      }
    }
  }

  // Add location if present
  if (typeof details.locationText === 'string' && details.locationText) {
    // Take just the city/region (first word or two)
    const location = details.locationText.replace(/[^a-zA-Z0-9]/g, '')
    if (location.length > 2) {
      candidates.push(location)
    }
  }

  // Fill remaining slots from title keywords (filtered heavily)
  if (typeof details.title === 'string' && details.title) {
    const words = details.title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !HASHTAG_STOP_WORDS.has(w.toLowerCase()))
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    candidates.push(...words)
  }

  // Deduplicate (case-insensitive) and limit to 5
  const seen = new Set<string>()
  const result: string[] = []
  for (const tag of candidates) {
    if (!tag || tag.length < 2 || tag.length > 30) continue
    const lower = tag.toLowerCase()
    if (seen.has(lower)) continue
    seen.add(lower)
    result.push(tag)
    if (result.length >= 5) break
  }

  return result
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
  name?: string // Optional label e.g. "Round 1 - Blues v Chiefs"
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
    name?: string | null
    starts_at: string
    end_at?: string | null
    url?: string | null
    notes?: string | null
    summary?: any
  }>
  assets?: string[] // Asset IDs (shared mode)
  perOccurrenceAssets?: Record<string, string[]> // occurrence name → asset IDs (per-occurrence mode)
  eventOccurrenceType?: 'single' | 'range'
  setup_complete?: boolean
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
  
  // Set initial timeOfDay from brand defaults when they load (create mode only).
  // Uses a ref to ensure this only runs once — after that, the user's changes are preserved.
  const timeInitializedRef = useRef(false)
  useEffect(() => {
    if (mode === 'create' && !timeInitializedRef.current) {
      const timeToUse = details.post_time || defaultPostTime || ''
      if (timeToUse) {
        timeInitializedRef.current = true
        setSchedule(prev => ({ ...prev, timeOfDay: timeToUse }))
      }
    }
  }, [defaultPostTime, details.post_time, mode])
  
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
            const timeStr = `${String(startsAtDate.getHours()).padStart(2, '0')}:${String(startsAtDate.getMinutes()).padStart(2, '0')}` // HH:mm
            
            occurrences.push({
              id: occ.id,
              name: occ.name || undefined,
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
              name: occ.name || undefined,
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
  // Track which occurrence cards are expanded (by index). In edit mode, all start collapsed.
  const [expandedOccurrences, setExpandedOccurrences] = useState<Set<number>>(() => {
    if (mode === 'edit') return new Set()
    // In create mode, expand all existing occurrences
    const initial = new Set<number>()
    if (initialData?.eventOccurrences) {
      initialData.eventOccurrences.forEach((_, idx) => initial.add(idx))
    }
    return initial
  })

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
  // Accordion state for edit mode
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set<string>()
  )
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  // URL auto-fill state
  const [urlFetching, setUrlFetching] = useState(false)
  const [urlAutoFilled, setUrlAutoFilled] = useState<{ description: boolean; hashtags: boolean }>({
    description: false,
    hashtags: false,
  })
  const urlAutoFilledRef = useRef(urlAutoFilled)
  urlAutoFilledRef.current = urlAutoFilled

  // Debounced URL fetch effect: auto-fill description and hashtags from URL
  useEffect(() => {
    const url = details.url.trim()
    if (!url || !url.startsWith('http')) return

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setUrlFetching(true)
      try {
        const res = await fetch(`/api/extract-url-summary?url=${encodeURIComponent(url)}`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json()
        const autoFilled = urlAutoFilledRef.current

        setDetails(prev => {
          const updates: Partial<WizardDetails> = {}
          let descAutoFilled = false
          let hashAutoFilled = false

          // Auto-fill description if empty or was previously auto-filled
          const description = buildDescriptionFromSummary(data.details || {}, data.summary || '')
          if (description && (!prev.detail.trim() || autoFilled.description)) {
            updates.detail = description
            descAutoFilled = true
          }

          // Auto-fill hashtags if empty or was previously auto-filled
          if (!prev.defaultHashtags.length || autoFilled.hashtags) {
            const hashtags = deriveHashtagsFromSummary(data.details || {})
            if (hashtags.length > 0) {
              updates.defaultHashtags = hashtags
              hashAutoFilled = true
            }
          }

          if (descAutoFilled || hashAutoFilled) {
            setUrlAutoFilled({
              description: descAutoFilled || autoFilled.description,
              hashtags: hashAutoFilled || autoFilled.hashtags,
            })
          }

          if (Object.keys(updates).length === 0) return prev
          return { ...prev, ...updates }
        })
      } catch {
        // Silently ignore errors — user can still write manually
      } finally {
        setUrlFetching(false)
      }
    }, 800)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.url])

  const [isSaving, setIsSaving] = useState(false)
  const isNavigatingRef = useRef(false) // Synchronous lock to prevent double-click on Next/Finish
  const [finishStep, setFinishStep] = useState<'linking' | 'preparing' | 'generating' | 'done'>('linking')
  const [editSaveStep, setEditSaveStep] = useState<'saving' | 'generating' | 'done'>('saving')
  const [savedSubcategoryId, setSavedSubcategoryId] = useState<string | null>(
    mode === 'edit' && initialData?.subcategory?.id ? initialData.subcategory.id : null
  )
  // Initialize selectedAssetIds from initialData in edit mode
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(
    mode === 'edit' && initialData?.assets ? initialData.assets : []
  )
  // Per-occurrence media mode (only for event_series with multiple occurrences)
  const [eventImageMode, setEventImageMode] = useState<'shared' | 'per_occurrence'>(() => {
    if (mode === 'edit' && initialData?.subcategory?.settings?.image_mode === 'per_occurrence') {
      return 'per_occurrence'
    }
    return 'shared'
  })
  // Per-occurrence asset selection (keyed by occurrence index)
  const [perOccurrenceAssetIds, setPerOccurrenceAssetIds] = useState<Record<number, string[]>>(() => {
    if (mode === 'edit' && initialData?.perOccurrenceAssets && initialData?.eventOccurrences) {
      const result: Record<number, string[]> = {}
      initialData.eventOccurrences.forEach((occ, idx) => {
        const name = occ.name || ''
        if (name && initialData.perOccurrenceAssets?.[name]) {
          result[idx] = initialData.perOccurrenceAssets[name]
        }
      })
      return result
    }
    return {}
  })
  // Which occurrence is currently being managed in per-occurrence mode
  const [activeOccurrenceIndex, setActiveOccurrenceIndex] = useState(0)
  const [imageMode, setImageMode] = useState<'upload' | 'existing'>(() => {
    // Always default to 'upload' mode
    return 'upload'
  })

  // Pagination for media grids
  const MEDIA_PAGE_SIZE = 12
  const [libraryVisibleCount, setLibraryVisibleCount] = useState(MEDIA_PAGE_SIZE)
  const [selectedVisibleCount, setSelectedVisibleCount] = useState(MEDIA_PAGE_SIZE)

  const { assets, loading: assetsLoading, refetch: refetchAssets } = useAssets(brandId)

  const resolvedAssets = assets

  // Asset usage data (edit mode only): tracks how many times each asset has been published or is queued.
  // NOTE: Only drafts with asset_ids populated are counted. Historical drafts created before
  // reliable asset selection was implemented may have empty asset_ids and won't appear in counts.
  const [assetUsage, setAssetUsage] = useState<Map<string, AssetUsageInfo>>(new Map())

  // Full-page drag-and-drop for the wizard
  const wizardDragCounterRef = useRef(0)
  const [wizardDragOver, setWizardDragOver] = useState(false)

  const handleWizardUploadSuccess = useCallback((assetIds: string[]) => {
    setSelectedAssetIds(prev => [...prev, ...assetIds])
    refetchAssets()
    showToast({
      title: 'Upload complete',
      message: `${assetIds.length} file${assetIds.length === 1 ? '' : 's'} uploaded`,
      type: 'success',
    })
  }, [refetchAssets, showToast])

  const handleWizardUploadError = useCallback((error: string) => {
    showToast({
      title: 'Upload failed',
      message: error,
      type: 'error',
      duration: 6000,
    })
  }, [showToast])

  const {
    processFiles: processWizardFiles,
    uploading: wizardPageUploading,
  } = useFileUpload({
    brandId,
    onSuccess: handleWizardUploadSuccess,
    onError: handleWizardUploadError,
  })

  const handleWizardDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    wizardDragCounterRef.current++
    if (wizardDragCounterRef.current === 1) {
      setWizardDragOver(true)
    }
  }, [])

  const handleWizardDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleWizardDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    wizardDragCounterRef.current--
    if (wizardDragCounterRef.current === 0) {
      setWizardDragOver(false)
    }
  }, [])

  const handleWizardDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    wizardDragCounterRef.current = 0
    setWizardDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      processWizardFiles(e.dataTransfer.files)
    }
  }, [processWizardFiles])

  useEffect(() => {
    if (mode !== 'edit' || !savedSubcategoryId) return

    const fetchUsage = async () => {
      // Query all non-deleted drafts for this subcategory (any schedule_source)
      const { data: drafts, error } = await supabase
        .from('drafts')
        .select('asset_ids, status')
        .eq('subcategory_id', savedSubcategoryId)
        .not('status', 'in', '("deleted")')

      if (error || !drafts) return

      const usage = new Map<string, AssetUsageInfo>()
      let emptyAssetCount = 0

      for (const draft of drafts) {
        if (!draft.asset_ids || !Array.isArray(draft.asset_ids) || draft.asset_ids.length === 0) {
          emptyAssetCount++
          continue
        }
        const assetId = draft.asset_ids[0] as string | undefined
        if (!assetId) continue

        const entry = usage.get(assetId) || { usedCount: 0, queuedCount: 0 }

        if (draft.status === 'published' || draft.status === 'partially_published') {
          entry.usedCount++
        } else if (draft.status === 'scheduled') {
          // Approved and waiting to publish
          entry.queuedCount++
        }
        // 'draft' status = unapproved, don't count as queued

        usage.set(assetId, entry)
      }

      if (emptyAssetCount > 0) {
        console.log(`[Wizard] ${emptyAssetCount} drafts have no asset_ids (pre-rotation historical data)`)
      }

      setAssetUsage(usage)
    }

    fetchUsage()
  }, [mode, savedSubcategoryId])

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
    setUrlAutoFilled({ description: false, hashtags: false })

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

  // Today's date string for min date validation on occurrence inputs
  const todayDateStr = React.useMemo(() => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  }, [])

  // Helper to check if an occurrence date is in the past
  const isOccurrencePast = React.useCallback((occurrence: EventOccurrenceInput): boolean => {
    // Only consider complete dates (4-digit year) — while the user is typing
    // a year like "2026", partial values like "0002" should not be treated as past
    const isCompleteDate = (d: string) => /^\d{4}-/.test(d) && parseInt(d.slice(0, 4), 10) >= 1900
    if (eventOccurrenceType === 'single') {
      if (!occurrence.date || !isCompleteDate(occurrence.date)) return false
      return occurrence.date < todayDateStr
    } else {
      const endDate = occurrence.end_date || occurrence.start_date
      if (!endDate || !isCompleteDate(endDate)) return false
      return endDate < todayDateStr
    }
  }, [eventOccurrenceType, todayDateStr])

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

  // Detect overlapping post dates across event occurrences
  const eventDateOverlaps = useMemo(() => {
    if (subcategoryType !== 'event_series' || eventScheduling.occurrences.length < 2 || eventScheduling.daysBefore.length === 0) {
      return []
    }

    // Build map of date -> list of occurrence names that produce a post on that date
    const dateToOccurrences = new Map<string, string[]>()

    for (const occ of eventScheduling.occurrences) {
      if (!occ.date) continue
      const occName = occ.name || occ.date
      const eventDate = new Date(occ.date + 'T00:00:00')

      for (const daysBefore of eventScheduling.daysBefore) {
        const postDate = new Date(eventDate)
        postDate.setDate(postDate.getDate() - daysBefore)
        const dateKey = postDate.toISOString().split('T')[0]

        if (!dateToOccurrences.has(dateKey)) {
          dateToOccurrences.set(dateKey, [])
        }
        dateToOccurrences.get(dateKey)!.push(occName)
      }
    }

    // Find dates with multiple occurrences
    const overlaps: Array<{ date: string; occurrences: string[] }> = []
    for (const [date, occs] of dateToOccurrences) {
      if (occs.length > 1) {
        overlaps.push({ date, occurrences: occs })
      }
    }

    return overlaps.sort((a, b) => a.date.localeCompare(b.date))
  }, [subcategoryType, eventScheduling.occurrences, eventScheduling.daysBefore])

  const isStep3Valid = (): boolean => {
    // Specific frequency uses event-style validation (for all types)
    if (schedule.frequency === 'specific') {
      // Must have at least one occurrence with valid data
      if (eventScheduling.occurrences.length === 0) {
        return false
      }

      // Check for duplicate occurrence names (they become tag names, must be unique)
      const occNames = eventScheduling.occurrences
        .map(occ => (occ.name || '').trim().toLowerCase())
        .filter(n => n.length > 0)
      if (occNames.length !== new Set(occNames).size) {
        return false
      }

      // Validate based on occurrence type
      if (eventOccurrenceType === 'single') {
        // Single mode: date + time required, new occurrences must not be in the past
        return eventScheduling.occurrences.every(occ => {
          if (!occ.date || !occ.date.trim() || !occ.time || !occ.time.trim()) return false
          // Allow past dates only for existing occurrences (already in DB)
          if (!occ.id && occ.date < todayDateStr) return false
          return true
        })
      } else {
        // Range mode: start_date + end_date required, plus a time, new occurrences must not be in the past
        const hasValidDates = eventScheduling.occurrences.every(occ => {
          if (!occ.start_date || !occ.start_date.trim() || !occ.end_date || !occ.end_date.trim()) return false
          // Allow past dates only for existing occurrences (already in DB)
          if (!occ.id && occ.end_date < todayDateStr) return false
          // Start date must not be after end date
          if (occ.start_date > occ.end_date) return false
          return true
        })
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

  // Collapsed summaries for accordion sections (edit mode)
  const detailsSummary = React.useMemo(() => {
    const parts: string[] = []
    if (details.name.trim()) parts.push(details.name.trim())
    if (details.channels.length > 0) {
      const channelLabels = details.channels.map(ch => CHANNELS.find(c => c.value === ch)?.label || ch)
      parts.push(channelLabels.join(', '))
    }
    if (details.default_copy_length) parts.push(`${details.default_copy_length} posts`)
    return parts.join(' \u00b7 ')
  }, [details.name, details.channels, details.default_copy_length])

  const scheduleSummary = React.useMemo(() => {
    if (schedule.frequency === 'specific') {
      const count = eventScheduling.occurrences.length
      return count === 1 ? '1 event date' : `${count} event dates`
    }
    const parts: string[] = []
    if (schedule.frequency) {
      parts.push(FREQUENCY_LABELS[schedule.frequency]?.label || schedule.frequency)
    }
    if (schedule.frequency === 'weekly' && schedule.daysOfWeek.length > 0) {
      const dayLabels = schedule.daysOfWeek.map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.label || d)
      parts.push(dayLabels.join(', '))
    }
    if (schedule.timeOfDay) parts.push(`at ${schedule.timeOfDay}`)
    return parts.join(' \u00b7 ')
  }, [schedule.frequency, schedule.daysOfWeek, schedule.timeOfDay, eventScheduling.occurrences.length])

  const imagesSummary = React.useMemo(() => {
    const isPerOcc = eventImageMode === 'per_occurrence' && subcategoryType === 'event_series' && eventScheduling.occurrences.length > 1
    if (isPerOcc) {
      const totalCount = Object.values(perOccurrenceAssetIds).reduce((sum, ids) => sum + ids.length, 0)
      const occCount = Object.values(perOccurrenceAssetIds).filter(ids => ids.length > 0).length
      if (totalCount === 0) return 'No images selected (per-event)'
      return `${totalCount} images across ${occCount} events`
    }
    const count = selectedAssetIds.length
    if (count === 0) return 'No images selected'
    return count === 1 ? '1 image selected' : `${count} images selected`
  }, [selectedAssetIds.length, eventImageMode, subcategoryType, eventScheduling.occurrences.length, perOccurrenceAssetIds])

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
              const pastDates = eventScheduling.occurrences.filter(occ => !occ.id && occ.date && occ.date < todayDateStr)
              if (missingDates.length > 0) {
                newErrors.occurrences = 'All dates must have a date.'
              } else if (missingTimes.length > 0) {
                newErrors.occurrences = 'All dates must have a time.'
              } else if (pastDates.length > 0) {
                newErrors.occurrences = 'Event dates cannot be in the past.'
              }
            } else {
              // Range mode
              const missingStartDates = eventScheduling.occurrences.filter(occ => !occ.start_date || !occ.start_date.trim())
              const missingEndDates = eventScheduling.occurrences.filter(occ => !occ.end_date || !occ.end_date.trim())
              const pastDates = eventScheduling.occurrences.filter(occ => !occ.id && occ.end_date && occ.end_date < todayDateStr)
              const missingTime = !schedule.timeOfDay || !schedule.timeOfDay.trim()
              if (missingStartDates.length > 0) {
                newErrors.occurrences = 'All date ranges must have a start date.'
              } else if (missingEndDates.length > 0) {
                newErrors.occurrences = 'All date ranges must have an end date.'
              } else if (pastDates.length > 0) {
                newErrors.occurrences = 'Event dates cannot be in the past.'
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

    // Don't set isSaving here - modal should only show in handleFinish() (Step 4)
    // This allows Step 3 â†’ Step 4 to happen without showing the modal
    // Note: isSaving is managed in handleFinish() where the modal is shown

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
        settings: buildSubcategorySettings(details, subcategoryType, eventScheduling, eventOccurrenceType),
        setup_complete: false
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

      // Handle Events: Create one schedule_rules row PER occurrence + event_occurrences rows
      if (subcategoryType === 'event_series') {
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

        // Deactivate any existing rules for this subcategory (clean slate for create mode)
        // Use soft-delete in case post_jobs reference them via FK
        await supabase
          .from('schedule_rules')
          .update({ is_active: false })
          .eq('subcategory_id', subcategoryId)
          .eq('brand_id', brandId)

        // Shared fields for all schedule_rules rows
        const sharedRuleFields: Record<string, unknown> = {
          brand_id: brandId,
          subcategory_id: subcategoryId,
          category_id: null,
          name: `${details.name.trim()} – Specific Events`,
          frequency: 'specific',
          channels: normalizedChannels,
          is_active: true,
          tone: null,
          hashtag_rule: null,
          image_tag_rule: null,
          timezone: brand?.timezone || 'Pacific/Auckland'
        }

        // Create one schedule_rules row per occurrence AND one event_occurrences row per occurrence
        const rulesToInsert: Record<string, unknown>[] = []
        const occurrencesToInsert: Record<string, unknown>[] = []

        await Promise.all(
          eventScheduling.occurrences.map(async (occurrence) => {
            // --- Build schedule_rules row for this occurrence ---
            const ruleData = { ...sharedRuleFields }
            const times: string[] = []

            if (eventOccurrenceType === 'single' && occurrence.date) {
              ruleData.start_date = occurrence.date.trim()
              ruleData.end_date = occurrence.date.trim()
              if (occurrence.time?.trim()) {
                times.push(occurrence.time.trim())
              }
            } else if (eventOccurrenceType === 'range' && occurrence.start_date && occurrence.end_date) {
              ruleData.start_date = occurrence.start_date.trim()
              ruleData.end_date = occurrence.end_date.trim()
              if (schedule.timeOfDay?.trim()) {
                times.push(schedule.timeOfDay.trim())
              }
            }

            setTimeFields(ruleData, times.length > 0 ? times : null)

            // Constraint satisfaction: need (start_date + time) OR (days_before OR days_during)
            const ruleHasTime = ruleData.start_date &&
              ((ruleData.time_of_day && Array.isArray(ruleData.time_of_day) && ruleData.time_of_day.length > 0) ||
               (ruleData.times_of_day && Array.isArray(ruleData.times_of_day) && ruleData.times_of_day.length > 0))

            if (!ruleHasTime) {
              ruleData.days_before = eventScheduling.daysBefore.length > 0
                ? eventScheduling.daysBefore
                : [0]
            } else {
              ruleData.days_before = eventScheduling.daysBefore.length > 0
                ? eventScheduling.daysBefore
                : null
            }

            const isRange = eventOccurrenceType === 'range' && occurrence.start_date && occurrence.end_date &&
              occurrence.start_date.trim() !== occurrence.end_date.trim()
            ruleData.days_during = isRange && eventScheduling.daysDuring.length > 0
              ? eventScheduling.daysDuring
              : null

            rulesToInsert.push(ruleData)

            // --- Build event_occurrences row for this occurrence ---
            let startsAt: string
            let endAt: string | null = null

            if (eventOccurrenceType === 'single') {
              const dateStr = occurrence.date!.trim()
              const timeStr = occurrence.time!.trim()
              startsAt = new Date(`${dateStr}T${timeStr}:00`).toISOString()
            } else {
              const startDateStr = occurrence.start_date!.trim()
              const endDateStr = occurrence.end_date!.trim()
              startsAt = new Date(`${startDateStr}T00:00:00`).toISOString()
              endAt = new Date(`${endDateStr}T23:59:59`).toISOString()
            }

            const finalUrl = occurrence.url?.trim() || details.url.trim() || null

            let summary: any = null
            if (finalUrl) {
              try {
                const summaryResponse = await fetch(`/api/extract-url-summary?url=${encodeURIComponent(finalUrl)}`)
                if (summaryResponse.ok) {
                  summary = await summaryResponse.json()
                }
              } catch (err) {
                console.error('[Wizard] Error extracting URL summary for occurrence:', err)
              }
            }

            occurrencesToInsert.push({
              subcategory_id: subcategoryId,
              name: occurrence.name?.trim() || null,
              starts_at: startsAt,
              end_at: endAt,
              url: finalUrl,
              notes: occurrence.notes?.trim() || null,
              summary: summary ? JSON.stringify(summary) : null
            })
          })
        )

        // Insert all schedule_rules rows (one per occurrence)
        if (rulesToInsert.length > 0) {
          const { error: rulesError } = await supabase
            .from('schedule_rules')
            .insert(rulesToInsert)

          if (rulesError) {
            console.error('[Wizard] Schedule rules insert error for Events:', rulesError)
            throw new Error(`Failed to create schedule rules: ${rulesError.message}`)
          }
        }

        // Insert all event_occurrences rows
        if (occurrencesToInsert.length > 0) {
          const { error: occurrencesError } = await supabase
            .from('event_occurrences')
            .insert(occurrencesToInsert)

          if (occurrencesError) {
            console.error('[Wizard] Event occurrences insert error:', occurrencesError)
            throw new Error(`Failed to create event occurrences: ${occurrencesError.message}`)
          }
        }
      }

      // Create schedule rule if needed (based on type + frequency rules) - for non-Events
      // ALWAYS create a schedule_rule for all subcategory types if frequency is set
      const shouldCreateRule = subcategoryType !== 'event_series' && !!schedule.frequency

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
        console.error('[Wizard] âš ï¸ CRITICAL: No active schedule_rule found after save!')
        throw new Error('Failed to create schedule rule: No active schedule rule exists for this category. This should never happen.')
      }

      // DRAFT GENERATION TRIGGER POINT
      // 
      // According to docs (category_creation_flow.md, draft_lifecycle.md), draft generation
      // should be triggered immediately after subcategory + schedule_rule are successfully saved.
      // This happens here: after ensureSubcategorySaved() completes successfully.
      // NOTE: Draft generation is NOT triggered here because images are not yet linked.
      // Draft generation happens in handleFinish() AFTER images are linked to the tag.
      // This ensures the RPC function can find the correct assets for the subcategory.

      return { subcategoryId }
    } catch (error) {
      console.error('[Wizard] Error saving category:', error)
      showToast({
        title: 'Failed to create category',
        message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        type: 'error'
      })
      return null
    }
    // Note: No finally block here - isSaving is not set in this function
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
        if (mode === 'edit') {
          setExpandedSections(prev => new Set([...prev, 'details']))
        } else {
          setCurrentStep(2)
        }
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
              const pastDates = eventScheduling.occurrences.filter(occ => !occ.id && occ.date && occ.date < todayDateStr)
              if (missingDates.length > 0) {
                newErrors.occurrences = 'All occurrences must have a date.'
              } else if (missingTimes.length > 0) {
                newErrors.occurrences = 'All occurrences must have a time.'
              } else if (pastDates.length > 0) {
                newErrors.occurrences = 'Event dates cannot be in the past.'
              }
            } else {
              const missingStartDates = eventScheduling.occurrences.filter(occ => !occ.start_date || !occ.start_date.trim())
              const missingEndDates = eventScheduling.occurrences.filter(occ => !occ.end_date || !occ.end_date.trim())
              const pastDates = eventScheduling.occurrences.filter(occ => !occ.id && occ.end_date && occ.end_date < todayDateStr)
              if (missingStartDates.length > 0) {
                newErrors.occurrences = 'All occurrences must have a start date.'
              } else if (missingEndDates.length > 0) {
                newErrors.occurrences = 'All occurrences must have an end date.'
              } else if (pastDates.length > 0) {
                newErrors.occurrences = 'Event dates cannot be in the past.'
              }
            }
          }
          setEventErrors(newErrors)
          if (mode === 'edit') setExpandedSections(prev => new Set([...prev, 'schedule']))
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
        if (mode === 'edit') setExpandedSections(prev => new Set([...prev, 'schedule']))
        return false
      }
      return false
    }

    // Note: isSaving is managed by handleFinish(), not here
    try {
      const subcategoryId = savedSubcategoryId

      // 1. Update subcategory
      // Normalize hashtags (already an array)
      const normalizedHashtags = normalizeHashtags(details.defaultHashtags)

      // Normalize channels for consistent storage
      const normalizeChannelForSave = (ch: string): string => {
        if (ch === 'instagram') return 'instagram_feed'
        if (ch === 'linkedin') return 'linkedin_profile'
        return ch
      }
      const normalizedChannels = details.channels.length > 0
        ? details.channels.map(normalizeChannelForSave)
        : null

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
          channels: normalizedChannels,
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
        // Events: create one schedule_rules row PER occurrence + upsert event_occurrences
        // Shared fields for all schedule_rules rows
        const sharedRuleFields: Record<string, unknown> = {
          brand_id: brandId,
          subcategory_id: subcategoryId,
          category_id: null,
          name: `${details.name.trim()} – Specific Events`,
          frequency: 'specific',
          channels: normalizedChannels,
          is_active: true,
          tone: null,
          hashtag_rule: null,
          image_tag_rule: null,
          timezone: brand?.timezone || 'Pacific/Auckland'
        }

        // Load existing schedule rules and occurrences for reconciliation
        const { data: existingEventRules } = await supabase
          .from('schedule_rules')
          .select('id')
          .eq('subcategory_id', subcategoryId)
          .eq('brand_id', brandId)
          .eq('frequency', 'specific')

        const { data: existingOccurrences } = await supabase
          .from('event_occurrences')
          .select('id')
          .eq('subcategory_id', subcategoryId)

        const existingOccurrenceIds = new Set(existingOccurrences?.map((occ: any) => occ.id) || [])

        // Deactivate all existing schedule rules for this event subcategory
        // (we recreate one per occurrence below)
        // We use soft-delete (is_active=false) rather than hard delete because
        // existing post_jobs may reference these rules via schedule_rule_id FK.
        if (existingEventRules && existingEventRules.length > 0) {
          const { error: deactivateRulesError } = await supabase
            .from('schedule_rules')
            .update({ is_active: false })
            .eq('subcategory_id', subcategoryId)
            .eq('brand_id', brandId)
            .eq('frequency', 'specific')

          if (deactivateRulesError) {
            console.error('[Wizard] Error deactivating old event schedule rules:', deactivateRulesError)
            throw new Error(`Failed to deactivate old schedule rules: ${deactivateRulesError.message}`)
          }
        }

        // Build new schedule_rules and event_occurrences from wizard state
        const rulesToInsert: Record<string, unknown>[] = []
        const occurrencesToUpsert: Array<Record<string, unknown> & { _wizardId?: string }> = []

        await Promise.all(
          eventScheduling.occurrences.map(async (occurrence) => {
            // --- Build schedule_rules row for this occurrence ---
            const ruleData = { ...sharedRuleFields }
            const times: string[] = []

            if (eventOccurrenceType === 'single' && occurrence.date) {
              ruleData.start_date = occurrence.date.trim()
              ruleData.end_date = occurrence.date.trim()
              if (occurrence.time?.trim()) {
                times.push(occurrence.time.trim())
              }
            } else if (eventOccurrenceType === 'range' && occurrence.start_date && occurrence.end_date) {
              ruleData.start_date = occurrence.start_date.trim()
              ruleData.end_date = occurrence.end_date.trim()
              if (schedule.timeOfDay?.trim()) {
                times.push(schedule.timeOfDay.trim())
              }
            }

            setTimeFields(ruleData, times.length > 0 ? times : null)

            const ruleHasTime = ruleData.start_date &&
              ((ruleData.time_of_day && Array.isArray(ruleData.time_of_day) && ruleData.time_of_day.length > 0) ||
               (ruleData.times_of_day && Array.isArray(ruleData.times_of_day) && ruleData.times_of_day.length > 0))

            if (!ruleHasTime) {
              ruleData.days_before = eventScheduling.daysBefore.length > 0
                ? eventScheduling.daysBefore
                : [0]
            } else {
              ruleData.days_before = eventScheduling.daysBefore.length > 0
                ? eventScheduling.daysBefore
                : null
            }

            const isRange = eventOccurrenceType === 'range' && occurrence.start_date && occurrence.end_date &&
              occurrence.start_date.trim() !== occurrence.end_date.trim()
            ruleData.days_during = isRange && eventScheduling.daysDuring.length > 0
              ? eventScheduling.daysDuring
              : null

            rulesToInsert.push(ruleData)

            // --- Build event_occurrences row for this occurrence ---
            let startsAt: string
            let endAt: string | null = null

            if (eventOccurrenceType === 'single') {
              const dateStr = occurrence.date!.trim()
              const timeStr = occurrence.time!.trim()
              startsAt = new Date(`${dateStr}T${timeStr}:00`).toISOString()
            } else {
              const startDateStr = occurrence.start_date!.trim()
              const endDateStr = occurrence.end_date!.trim()
              startsAt = new Date(`${startDateStr}T00:00:00`).toISOString()
              endAt = new Date(`${endDateStr}T23:59:59`).toISOString()
            }

            const finalUrl = occurrence.url?.trim() || details.url.trim() || null

            // Handle summary: keep existing if available, otherwise extract for new occurrences
            let summary: any = null
            if (occurrence.summary) {
              summary = occurrence.summary
            } else if (finalUrl && !occurrence.id) {
              try {
                const summaryResponse = await fetch(`/api/extract-url-summary?url=${encodeURIComponent(finalUrl)}`)
                if (summaryResponse.ok) {
                  summary = await summaryResponse.json()
                }
              } catch (err) {
                console.error('[Wizard] Error extracting URL summary for occurrence:', err)
              }
            }

            occurrencesToUpsert.push({
              id: occurrence.id,
              subcategory_id: subcategoryId,
              name: occurrence.name?.trim() || null,
              starts_at: startsAt,
              end_at: endAt,
              url: finalUrl,
              notes: occurrence.notes?.trim() || null,
              summary: summary ? JSON.stringify(summary) : null
            })
          })
        )

        // Insert all schedule_rules rows (one per occurrence)
        if (rulesToInsert.length > 0) {
          const { error: rulesError } = await supabase
            .from('schedule_rules')
            .insert(rulesToInsert)

          if (rulesError) {
            console.error('[Wizard] Schedule rules insert error for Events:', rulesError)
            throw new Error(`Failed to create schedule rules: ${rulesError.message}`)
          }
        }

        // Upsert event_occurrences (update existing, insert new, delete removed)
        for (const occurrence of occurrencesToUpsert) {
          const { id, ...data } = occurrence
          if (id && existingOccurrenceIds.has(id as string)) {
            const { error: updateError } = await supabase
              .from('event_occurrences')
              .update(data)
              .eq('id', id)

            if (updateError) {
              console.error('[Wizard] Error updating event occurrence:', updateError)
              throw new Error(`Failed to update event occurrence: ${updateError.message}`)
            }
          } else {
            const { error: insertError } = await supabase
              .from('event_occurrences')
              .insert(data)

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
            channels: normalizedChannels,
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
          console.error('[Wizard] âš ï¸ CRITICAL: schedule.frequency is not set, but validation should have prevented this!')
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
        console.error('[Wizard] âš ï¸ CRITICAL: No active schedule_rule found after update!')
        throw new Error('Failed to ensure schedule rule exists: No active schedule rule exists for this category. This should never happen.')
      }

      // 4. Update asset associations
      // Save image_mode setting — fetch fresh settings from DB to avoid overwriting the merge done above
      const isPerOccurrence = eventImageMode === 'per_occurrence' && subcategoryType === 'event_series' && eventScheduling.occurrences.length > 1
      const previousImageMode = initialData?.subcategory?.settings?.image_mode
      if (isPerOccurrence !== (previousImageMode === 'per_occurrence')) {
        const { data: freshSubcat } = await supabase
          .from('subcategories')
          .select('settings')
          .eq('id', subcategoryId)
          .single()
        const freshSettings = freshSubcat?.settings || {}
        const updatedSettings = { ...freshSettings, image_mode: isPerOccurrence ? 'per_occurrence' : 'shared' }
        await supabase.from('subcategories').update({ settings: updatedSettings }).eq('id', subcategoryId)
      }

      if (isPerOccurrence) {
        // PER-OCCURRENCE MODE: create/update occurrence-specific tags
        const categoryName = details.name.trim()

        // Clean up old occurrence tags that no longer apply
        const { data: oldOccTags } = await supabase
          .from('tags')
          .select('id, name')
          .eq('brand_id', brandId)
          .eq('kind', 'occurrence')
          .eq('is_active', true)
          .like('name', `${categoryName} :: %`)

        // Build set of current occurrence tag names
        const currentOccTagNames = new Set<string>()
        for (let idx = 0; idx < eventScheduling.occurrences.length; idx++) {
          const occName = (eventScheduling.occurrences[idx].name || '').trim()
          if (occName) currentOccTagNames.add(`${categoryName} :: ${occName}`)
        }

        // Deactivate old occurrence tags that are no longer in the list
        if (oldOccTags) {
          for (const oldTag of oldOccTags) {
            if (!currentOccTagNames.has(oldTag.name)) {
              await supabase.from('asset_tags').delete().eq('tag_id', oldTag.id)
              await supabase.from('tags').update({ is_active: false }).eq('id', oldTag.id)
            }
          }
        }

        // Create/update tags for each occurrence
        for (let idx = 0; idx < eventScheduling.occurrences.length; idx++) {
          const occ = eventScheduling.occurrences[idx]
          const occAssets = perOccurrenceAssetIds[idx] || []
          const occName = (occ.name || '').trim()
          if (!occName) continue

          const occTagName = `${categoryName} :: ${occName}`

          let occTagId: string | null = null

          // First try to find an active tag
          const { data: existingOccTag } = await supabase
            .from('tags')
            .select('id')
            .eq('brand_id', brandId)
            .eq('name', occTagName)
            .eq('kind', 'occurrence')
            .eq('is_active', true)
            .maybeSingle()

          if (existingOccTag) {
            occTagId = existingOccTag.id
          } else {
            // Check for an inactive tag with the same name and reactivate it
            const { data: inactiveTag } = await supabase
              .from('tags')
              .select('id')
              .eq('brand_id', brandId)
              .eq('name', occTagName)
              .eq('kind', 'occurrence')
              .eq('is_active', false)
              .maybeSingle()

            if (inactiveTag) {
              await supabase.from('tags').update({ is_active: true }).eq('id', inactiveTag.id)
              occTagId = inactiveTag.id
            } else {
              const { data: newOccTag } = await supabase
                .from('tags')
                .insert({ brand_id: brandId, name: occTagName, kind: 'occurrence', is_active: true })
                .select('id')
                .single()
              if (newOccTag) occTagId = newOccTag.id
            }
          }

          if (occTagId && occAssets.length > 0) {
            await supabase.from('asset_tags').delete().eq('tag_id', occTagId)
            const inserts = occAssets.map((assetId, position) => ({
              asset_id: assetId,
              tag_id: occTagId!,
              position
            }))
            await supabase.from('asset_tags').insert(inserts)
          }
        }

        // Also clear category-level tag assets (switching from shared to per-occurrence)
        const { data: subcategoryTag } = await supabase
          .from('tags')
          .select('id')
          .eq('brand_id', brandId)
          .eq('name', categoryName)
          .eq('kind', 'subcategory')
          .eq('is_active', true)
          .maybeSingle()
        if (subcategoryTag) {
          await supabase.from('asset_tags').delete().eq('tag_id', subcategoryTag.id)
        }
      } else {
        // SHARED MODE: existing behavior
        // If switching from per-occurrence to shared, clean up occurrence tags
        if (previousImageMode === 'per_occurrence') {
          const categoryName = details.name.trim()
          const { data: occTags } = await supabase
            .from('tags')
            .select('id')
            .eq('brand_id', brandId)
            .eq('kind', 'occurrence')
            .eq('is_active', true)
            .like('name', `${categoryName} :: %`)
          if (occTags) {
            for (const tag of occTags) {
              await supabase.from('asset_tags').delete().eq('tag_id', tag.id)
              await supabase.from('tags').update({ is_active: false }).eq('id', tag.id)
            }
          }
        }

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
          const { error: deleteError } = await supabase
            .from('asset_tags')
            .delete()
            .eq('tag_id', tagId)

          if (deleteError) {
            console.error('[Wizard] Error clearing asset associations:', deleteError)
            throw new Error(`Failed to update image associations: ${deleteError.message}`)
          }

          if (selectedAssetIds.length > 0) {
            const assetTagInserts = selectedAssetIds.map((assetId, index) => ({
              asset_id: assetId,
              tag_id: tagId,
              position: index
            }))

            const { error: insertError } = await supabase
              .from('asset_tags')
              .insert(assetTagInserts)

            if (insertError) {
              console.error('[Wizard] Error adding asset associations:', insertError)
              throw new Error(`Failed to update image associations: ${insertError.message}`)
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
            const assetTagInserts = selectedAssetIds.map((assetId, index) => ({
              asset_id: assetId,
              tag_id: newTag.id,
              position: index
            }))

            const { error: linkError } = await supabase
              .from('asset_tags')
              .insert(assetTagInserts)

            if (linkError) {
              // Don't throw - asset associations are optional
            }
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
    }
  }

  const handleNext = async () => {
    // Prevent double-click: if already navigating or saving, ignore
    if (isNavigatingRef.current || isSaving) return
    isNavigatingRef.current = true

    try {
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
    } finally {
      isNavigatingRef.current = false
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
    // Prevent double-click: if already navigating or saving, ignore
    if (isNavigatingRef.current || isSaving) return
    isNavigatingRef.current = true

    // In edit mode, update existing records
    if (mode === 'edit') {
      setEditSaveStep('saving')
      setIsSaving(true)
      try {
        const success = await ensureSubcategoryUpdated()
        if (!success) {
          // Error toast already shown by ensureSubcategoryUpdated
          return
        }

        // If setup was incomplete (user abandoned wizard at Step 4), generate first drafts
        const needsFirstDraftGeneration = initialData?.setup_complete === false

        // Delay to ensure asset_tags from ensureSubcategoryUpdated are committed
        await new Promise(resolve => setTimeout(resolve, 1500))

        setEditSaveStep('generating')

        if (needsFirstDraftGeneration && savedSubcategoryId) {
          // Mark setup as complete BEFORE triggering draft generation.
          // The draft generator skips categories with setup_complete=false.
          const { error: setupCompleteError } = await supabase
            .from('subcategories')
            .update({ setup_complete: true })
            .eq('id', savedSubcategoryId)

          if (setupCompleteError) {
            console.error('[Wizard] Failed to set setup_complete:', setupCompleteError)
          }
        }

        // Generate/regenerate drafts for all edit saves
        try {
          const response = await fetch('/api/drafts/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('[draftGeneration] Failed to generate drafts:', errorData.error || 'Unknown error')
          } else {
            const result = await response.json()
            console.log('[draftGeneration] Drafts created successfully:', result)
          }
        } catch (err) {
          console.error('[draftGeneration] Failed to generate drafts:', err)
        }

        setEditSaveStep('done')

        if (needsFirstDraftGeneration && savedSubcategoryId) {
          showToast({
            title: 'Category updated',
            message: 'Your changes have been saved and drafts have been generated.',
            type: 'success'
          })
          router.push(`/brands/${brandId}/schedule?tab=drafts`)
        } else {
          showToast({
            title: 'Category updated',
            message: 'Your changes have been saved and drafts have been updated.',
            type: 'success'
          })
          router.push(`/brands/${brandId}/engine-room/categories`)
        }
      } catch (error) {
        console.error('[Wizard] Unexpected error in edit mode:', error)
        showToast({
          title: 'Failed to update category',
          message: 'An unexpected error occurred. Please try again.',
          type: 'error'
        })
      } finally {
        setIsSaving(false)
        isNavigatingRef.current = false
      }
      return
    }

    // Ensure subcategory is saved (defensive check)
    const saveResult = await ensureSubcategorySaved()
    if (!saveResult) {
      isNavigatingRef.current = false
      return // Error already shown by ensureSubcategorySaved
    }

    const subcategoryId = saveResult.subcategoryId

    setFinishStep('linking')
    setIsSaving(true)

    try {
      // Save image_mode setting if using per-occurrence
      if (eventImageMode === 'per_occurrence' && subcategoryType === 'event_series' && eventScheduling.occurrences.length > 1) {
        // Fetch current settings from DB to avoid overwriting settings saved by ensureSubcategorySaved
        const { data: currentSubcat } = await supabase
          .from('subcategories')
          .select('settings')
          .eq('id', subcategoryId)
          .single()
        const currentSettings = currentSubcat?.settings || {}
        await supabase
          .from('subcategories')
          .update({ settings: { ...currentSettings, image_mode: 'per_occurrence' } })
          .eq('id', subcategoryId)
      }

      // Save images - either shared or per-occurrence
      if (eventImageMode === 'per_occurrence' && subcategoryType === 'event_series' && eventScheduling.occurrences.length > 1) {
        // PER-OCCURRENCE MODE: create occurrence-specific tags and link assets
        const categoryName = details.name.trim()
        for (let idx = 0; idx < eventScheduling.occurrences.length; idx++) {
          const occ = eventScheduling.occurrences[idx]
          const occAssets = perOccurrenceAssetIds[idx] || []
          const occName = (occ.name || '').trim()
          if (!occName || occAssets.length === 0) continue

          const occTagName = `${categoryName} :: ${occName}`

          // Find or create the occurrence tag
          let occTagId: string | null = null
          const { data: existingOccTag } = await supabase
            .from('tags')
            .select('id')
            .eq('brand_id', brandId)
            .eq('name', occTagName)
            .eq('kind', 'occurrence')
            .eq('is_active', true)
            .maybeSingle()

          if (existingOccTag) {
            occTagId = existingOccTag.id
          } else {
            // Check for inactive tag and reactivate
            const { data: inactiveTag } = await supabase
              .from('tags')
              .select('id')
              .eq('brand_id', brandId)
              .eq('name', occTagName)
              .eq('kind', 'occurrence')
              .eq('is_active', false)
              .maybeSingle()

            if (inactiveTag) {
              await supabase.from('tags').update({ is_active: true }).eq('id', inactiveTag.id)
              occTagId = inactiveTag.id
            } else {
              const { data: newOccTag, error: tagCreateErr } = await supabase
                .from('tags')
                .insert({
                  brand_id: brandId,
                  name: occTagName,
                  kind: 'occurrence',
                  is_active: true
                })
                .select('id')
                .single()
              if (tagCreateErr) console.error(`[Wizard] Error creating occurrence tag "${occTagName}":`, tagCreateErr)
              if (newOccTag) occTagId = newOccTag.id
            }
          }

          if (occTagId) {
            // Clear existing and insert new
            await supabase.from('asset_tags').delete().eq('tag_id', occTagId)
            const inserts = occAssets.map((assetId, position) => ({
              asset_id: assetId,
              tag_id: occTagId!,
              position
            }))
            const { error: linkErr } = await supabase.from('asset_tags').insert(inserts)
            if (linkErr) console.error(`[Wizard] Error linking assets to occurrence tag ${occName}:`, linkErr)
          }
        }
      } else if (selectedAssetIds.length > 0) {
        // SHARED MODE: existing behavior
        // Find the subcategory's tag (should exist due to triggers, but handle gracefully if not)
        let tagId: string | null = null

        const { data: subcategoryTag, error: tagError } = await supabase
          .from('tags')
          .select('id')
          .eq('brand_id', brandId)
          .eq('name', details.name.trim())
          .eq('kind', 'subcategory')
          .eq('is_active', true)
          .maybeSingle()

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
          const { error: clearError } = await supabase
            .from('asset_tags')
            .delete()
            .eq('tag_id', tagId)

          if (clearError) {
            console.error('[Wizard] Error clearing existing asset_tags:', clearError)
          }

          const assetTagInserts = selectedAssetIds.map((assetId, index) => ({
            asset_id: assetId,
            tag_id: tagId,
            position: index
          }))

          const { error: linkError } = await supabase
            .from('asset_tags')
            .insert(assetTagInserts)

          if (linkError) {
            console.error('[Wizard] Error linking assets to tag:', linkError)
            throw new Error(`Failed to link images: ${linkError.message}`)
          }
        } else {
          throw new Error('Failed to find or create subcategory tag')
        }
      }

      // Delay to ensure asset_tags are fully committed and visible to RPC queries
      // This ensures rpc_pick_asset_for_rule can find the correctly tagged assets
      setFinishStep('preparing')
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Mark setup as complete BEFORE triggering draft generation.
      // The draft generator skips categories with setup_complete=false to prevent
      // premature draft creation during wizard setup.
      const { error: setupCompleteError } = await supabase
        .from('subcategories')
        .update({ setup_complete: true })
        .eq('id', subcategoryId)

      if (setupCompleteError) {
        console.error('[Wizard] Failed to set setup_complete:', setupCompleteError)
        // Non-fatal — continue with draft generation anyway
      }

      // Trigger draft generation and wait for it to complete (shows in modal)
      setFinishStep('generating')
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

      setFinishStep('done')

      // Show success message and redirect to Schedule page (Drafts tab)
      showToast({
        title: 'Category created successfully',
        message: 'Drafts have been generated. Go to the Schedule page (Drafts tab) to view and approve them for publication.',
        type: 'success'
      })

      // Redirect to Schedule page (Drafts tab)
      router.push(`/brands/${brandId}/schedule?tab=drafts`)
    } catch (error) {
      console.error('[Wizard] Error linking images:', error)
      showToast({
        title: 'Category created',
        message: error instanceof Error ? `Images were uploaded but couldn't be linked: ${error.message}. You can manage images from the Content Library.` : 'Images were uploaded but couldn\'t be linked. You can manage images from the Content Library.',
        type: 'error'
      })
      
      // Still redirect even if image linking failed
      router.push(`/brands/${brandId}/engine-room/categories`)
    } finally {
      setIsSaving(false)
      isNavigatingRef.current = false
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

  // --- Render functions for step content (shared by wizard and accordion) ---

  const renderDetailsContent = () => (
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
            if (detailsErrors.name) {
              setDetailsErrors(prev => ({ ...prev, name: undefined }))
            }
          }}
          placeholder="Short, clear name"
          error={detailsErrors.name}
        />
      </FormField>

      {/* URL (moved above Description so auto-fill can populate fields below) */}
      <FormField label="URL (optional)">
        <Input
          type="url"
          value={details.url}
          onChange={(e) => setDetails(prev => ({ ...prev, url: e.target.value }))}
          placeholder="Link for Ferdy to pull extra details"
        />
      </FormField>

      {/* Description */}
      <FormField label="Description" required>
        <Textarea
          value={details.detail}
          onChange={(e) => {
            setDetails(prev => ({ ...prev, detail: e.target.value }))
            if (urlAutoFilled.description) {
              setUrlAutoFilled(prev => ({ ...prev, description: false }))
            }
            if (detailsErrors.detail) {
              setDetailsErrors(prev => ({ ...prev, detail: undefined }))
            }
          }}
          placeholder="What should Ferdy mention?"
          rows={4}
          error={detailsErrors.detail}
        />
        {urlFetching && (
          <p className="mt-1 text-xs text-gray-400 animate-pulse">Fetching page details...</p>
        )}
        {!urlFetching && urlAutoFilled.description && (
          <p className="mt-1 text-xs text-gray-400">Auto-filled from URL — feel free to edit</p>
        )}
      </FormField>

      {/* Default Hashtags */}
      <FormField label="Default hashtags (optional)">
        <HashtagInput
          value={details.defaultHashtags}
          onChange={(hashtags) => {
            setDetails(prev => ({ ...prev, defaultHashtags: hashtags }))
            if (urlAutoFilled.hashtags) {
              setUrlAutoFilled(prev => ({ ...prev, hashtags: false }))
            }
          }}
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
            { value: 'short', label: 'Short', description: '1 sentence' },
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
  )

  const renderScheduleContent = () => (
    <>
      {/* Specific frequency: Show occurrences manager (for all types) */}
      {schedule.frequency === 'specific' ? (
        <div className="space-y-6">
          {/* Occurrences List */}
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Add each event with its own URL and details. For example, a sports team could add one entry per match day.
            </p>

            {(() => {
              // Split occurrences into upcoming and past
              const upcomingIndices: number[] = []
              const pastIndices: number[] = []
              eventScheduling.occurrences.forEach((occ, idx) => {
                if (isOccurrencePast(occ)) {
                  pastIndices.push(idx)
                } else {
                  upcomingIndices.push(idx)
                }
              })

              if (eventScheduling.occurrences.length === 0) {
                return (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center mb-4">
                    <p className="text-sm text-gray-600">
                      No dates added yet.
                    </p>
                  </div>
                )
              }

              const renderOccurrenceCard = (occurrence: EventOccurrenceInput, index: number, isPast: boolean) => {
                const isExpanded = expandedOccurrences.has(index)
                const toggleExpanded = () => {
                  setExpandedOccurrences(prev => {
                    const next = new Set(prev)
                    if (next.has(index)) next.delete(index)
                    else next.add(index)
                    return next
                  })
                }

                // Summary line for collapsed state
                const displayName = occurrence.name?.trim()
                  ? occurrence.name.trim()
                  : (eventOccurrenceType === 'single' ? `Event ${index + 1}` : `Range ${index + 1}`)
                const displayDate = eventOccurrenceType === 'single'
                  ? occurrence.date || ''
                  : [occurrence.start_date, occurrence.end_date].filter(Boolean).join(' – ')
                const displayTime = eventOccurrenceType === 'single' ? (occurrence.time || '') : ''

                return (
                  <div
                    key={occurrence.id || index}
                    ref={(el) => {
                      if (el) {
                        occurrenceRefs.current.set(index, el)
                      } else {
                        occurrenceRefs.current.delete(index)
                      }
                    }}
                    className={isPast
                      ? "bg-gray-100 border border-gray-200 rounded-lg opacity-60"
                      : "bg-gray-50 border border-gray-200 rounded-lg"
                    }
                  >
                    {/* Collapsed header — always visible */}
                    <button
                      type="button"
                      onClick={toggleExpanded}
                      className="w-full flex items-center justify-between p-3 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ChevronRightIcon className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        <span className="text-sm font-medium text-gray-900 truncate">{displayName}</span>
                        {isPast && <span className="text-xs font-normal text-gray-400 flex-shrink-0">(past)</span>}
                        {!isExpanded && displayDate && (
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {displayDate}{displayTime ? ` at ${displayTime}` : ''}
                          </span>
                        )}
                      </div>
                      {!isPast && isExpanded && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedOccurrences(prev => { const next = new Set(prev); next.delete(index); return next })
                            // Realign per-occurrence asset indices when removing an occurrence
                            setPerOccurrenceAssetIds(prev => {
                              const updated: Record<number, string[]> = {}
                              Object.keys(prev).forEach(key => {
                                const k = Number(key)
                                if (k < index) updated[k] = prev[k]
                                else if (k > index) updated[k - 1] = prev[k]
                                // k === index is the deleted one, skip it
                              })
                              return updated
                            })
                            setEventScheduling(prev => ({
                              ...prev,
                              occurrences: prev.occurrences.filter((_, i) => i !== index)
                            }))
                          }}
                          className="text-red-600 hover:text-red-700 p-1 flex-shrink-0"
                          title="Remove"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-3 border-t border-gray-200 pt-3">
                        <FormField label="Name (optional)">
                          <Input
                            type="text"
                            value={occurrence.name || ''}
                            disabled={isPast}
                            onChange={(e) => {
                              const updated = [...eventScheduling.occurrences]
                              updated[index] = { ...updated[index], name: e.target.value }
                              setEventScheduling(prev => ({ ...prev, occurrences: updated }))
                            }}
                            placeholder="e.g. Round 1 - Blues v Chiefs"
                            error={
                              occurrence.name?.trim() &&
                              eventScheduling.occurrences.some((other, i) =>
                                i !== index && (other.name || '').trim().toLowerCase() === occurrence.name!.trim().toLowerCase()
                              )
                                ? 'Duplicate name — each occurrence must have a unique name'
                                : undefined
                            }
                          />
                        </FormField>

                        {eventOccurrenceType === 'single' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Date" required>
                              <Input
                                type="date"
                                value={occurrence.date || ''}
                                min={!isPast ? todayDateStr : undefined}
                                disabled={isPast}
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
                            <FormField label="Time" required>
                              <Input
                                type="time"
                                value={occurrence.time || ''}
                                disabled={isPast}
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
                            <FormField label="Start Date" required>
                              <Input
                                type="date"
                                value={occurrence.start_date || ''}
                                min={!isPast ? todayDateStr : undefined}
                                disabled={isPast}
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
                            <FormField label="End Date" required>
                              <Input
                                type="date"
                                value={occurrence.end_date || ''}
                                min={!isPast ? (occurrence.start_date || todayDateStr) : undefined}
                                disabled={isPast}
                                onChange={(e) => {
                                  const updated = [...eventScheduling.occurrences]
                                  updated[index] = { ...updated[index], end_date: e.target.value }
                                  setEventScheduling(prev => ({ ...prev, occurrences: updated }))
                                  if (eventErrors.occurrences) {
                                    setEventErrors(prev => ({ ...prev, occurrences: undefined }))
                                  }
                                }}
                                error={
                                  occurrence.start_date && occurrence.end_date && occurrence.start_date > occurrence.end_date
                                    ? 'End date must be after start date'
                                    : eventErrors.occurrences && (!occurrence.end_date || !occurrence.end_date.trim())
                                      ? 'End date is required'
                                      : undefined
                                }
                              />
                            </FormField>
                          </div>
                        )}

                        <FormField label="URL (optional)">
                          <Input
                            type="url"
                            value={occurrence.url || ''}
                            disabled={isPast}
                            onChange={(e) => {
                              const updated = [...eventScheduling.occurrences]
                              updated[index] = { ...updated[index], url: e.target.value }
                              setEventScheduling(prev => ({ ...prev, occurrences: updated }))
                            }}
                            placeholder="https://example.com/event"
                          />
                        </FormField>

                        <FormField label="Notes (optional)">
                          <Textarea
                            value={occurrence.notes || ''}
                            disabled={isPast}
                            onChange={(e) => {
                              const updated = [...eventScheduling.occurrences]
                              updated[index] = { ...updated[index], notes: e.target.value }
                              setEventScheduling(prev => ({ ...prev, occurrences: updated }))
                            }}
                            placeholder="Add event details here (opponent, venue, pricing, time, etc.) — especially important if the URL is a ticketing site where info can't be auto-extracted"
                            rows={2}
                          />
                        </FormField>
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <>
                  {/* Upcoming occurrences */}
                  <div className="space-y-3">
                    {upcomingIndices.map(idx => renderOccurrenceCard(eventScheduling.occurrences[idx], idx, false))}
                  </div>

                  {/* Past occurrences - collapsed by default */}
                  {pastIndices.length > 0 && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 py-2">
                        <ChevronRightIcon className="w-4 h-4 transition-transform details-open:rotate-90" />
                        Past events ({pastIndices.length})
                      </summary>
                      <div className="mt-2 space-y-3">
                        {pastIndices.map(idx => renderOccurrenceCard(eventScheduling.occurrences[idx], idx, true))}
                      </div>
                    </details>
                  )}
                </>
              )
            })()}

            <button
              type="button"
              onClick={() => {
                const newOccurrence: EventOccurrenceInput = eventOccurrenceType === 'single'
                  ? { name: '', date: '', time: '', url: '', notes: '' }
                  : { name: '', start_date: '', end_date: '', url: '', notes: '' }
                const newIndex = eventScheduling.occurrences.length
                setEventScheduling(prev => ({
                  ...prev,
                  occurrences: [...prev.occurrences, newOccurrence]
                }))
                // Auto-expand the new occurrence
                setExpandedOccurrences(prev => new Set([...prev, newIndex]))
                if (eventErrors.occurrences) {
                  setEventErrors(prev => ({ ...prev, occurrences: undefined }))
                }
                setTimeout(() => {
                  const cardRef = occurrenceRefs.current.get(newIndex)
                  if (cardRef) {
                    cardRef.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                    const dateInput = cardRef.querySelector<HTMLInputElement>('input[type="date"]')
                    if (dateInput) dateInput.focus()
                  }
                }, 100)
              }}
              className="mt-4 px-4 py-2 text-sm font-medium text-[#6366F1] bg-white border border-[#6366F1] rounded-lg hover:bg-blue-50 transition-colors"
            >
              {eventOccurrenceType === 'single' ? '+ Add event' : '+ Add range'}
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
              Ferdy will create a post for each event at these intervals before it happens. Enter the number of days separated by commas.
            </p>
            <FormField label="Days before">
              <Input
                type="text"
                value={leadTimesInput}
                onChange={(e) => {
                  const value = e.target.value
                  setLeadTimesInput(value)
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

            {eventDateOverlaps.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-1">Some post dates overlap across occurrences</p>
                <ul className="text-sm text-amber-700 list-disc list-inside space-y-0.5">
                  {eventDateOverlaps.map(({ date, occurrences }) => {
                    const formatted = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    return (
                      <li key={date}>
                        <span className="font-medium">{formatted}</span>: {occurrences.join(' & ')}
                      </li>
                    )
                  })}
                </ul>
                <p className="text-xs text-amber-600 mt-2">
                  Posts will still be created for each occurrence. You can adjust their dates and times on the Schedule page.
                </p>
              </div>
            )}

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
                          daysOfWeek: freq !== 'weekly' ? [] : prev.daysOfWeek,
                          dayOfMonth: freq !== 'monthly' ? null : prev.dayOfMonth,
                        }))
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
                      const dayOrder: Record<string, number> = { 'mon': 0, 'tue': 1, 'wed': 2, 'thu': 3, 'fri': 4, 'sat': 5, 'sun': 6 }
                      const sortedDays = newDays.sort((a, b) => (dayOrder[a] || 99) - (dayOrder[b] || 99))
                      setSchedule(prev => ({ ...prev, daysOfWeek: sortedDays }))
                      if (scheduleErrors.daysOfWeek) {
                        setScheduleErrors(prev => ({ ...prev, daysOfWeek: undefined }))
                      }
                    }}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-sm font-medium transition-colors ${
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
                          const newDays = isSelected
                            ? schedule.daysOfMonth.filter(d => d !== day)
                            : [...schedule.daysOfMonth, day].sort((a, b) => a - b)
                          setSchedule(prev => ({
                            ...prev,
                            daysOfMonth: newDays,
                            nthWeek: null,
                            weekday: null,
                            dayOfMonth: newDays.length > 0 ? newDays[0] : null
                          }))
                          if (scheduleErrors.dayOfMonth) {
                            setScheduleErrors(prev => ({ ...prev, dayOfMonth: undefined }))
                          }
                        }}
                        className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-sm font-medium transition-colors ${
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
    </>
  )

  // Helper: check if per-occurrence mode is relevant (event_series with >1 occurrence)
  const showPerOccurrenceToggle = subcategoryType === 'event_series' && eventScheduling.occurrences.length > 1
  // Helper: whether all occurrences in per-occurrence mode have names
  const allOccurrencesNamed = eventScheduling.occurrences.every(occ => (occ.name || '').trim().length > 0)
  // Helper: get asset IDs for the active context
  const getActiveAssetIdsForOccurrence = (idx: number) => perOccurrenceAssetIds[idx] || []
  const setActiveAssetIdsForOccurrence = (idx: number, ids: string[]) => {
    setPerOccurrenceAssetIds(prev => ({ ...prev, [idx]: ids }))
  }
  // Helper: check if all non-past occurrences have media in per-occurrence mode
  const allOccurrencesHaveMedia = eventScheduling.occurrences.every((occ, idx) => {
    const occDate = eventOccurrenceType === 'single' ? occ.date : occ.start_date
    if (occDate && occDate < todayDateStr) return true // past occurrences don't need media
    return (perOccurrenceAssetIds[idx] || []).length > 0
  })
  // Overall media validation
  const hasRequiredMedia = eventImageMode === 'per_occurrence' && subcategoryType === 'event_series' && eventScheduling.occurrences.length > 1
    ? allOccurrencesHaveMedia
    : selectedAssetIds.length > 0

  const renderImagesContent = () => (
    <>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          Choose media
        </h3>
      </div>

      {/* Per-occurrence toggle - only for event_series with multiple occurrences */}
      {showPerOccurrenceToggle && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-3">
            Use the same images for all events?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEventImageMode('shared')}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                eventImageMode === 'shared'
                  ? 'bg-[#6366F1] text-white border-[#6366F1]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Yes, same images
            </button>
            <button
              type="button"
              onClick={() => {
                if (!allOccurrencesNamed) {
                  showToast({
                    title: 'Names required',
                    message: 'Please add a name to each occurrence in Step 3 before using per-event images.',
                    type: 'error'
                  })
                  return
                }
                setEventImageMode('per_occurrence')
                // Auto-select first non-past occurrence
                const firstUpcoming = eventScheduling.occurrences.findIndex(occ => {
                  const d = eventOccurrenceType === 'single' ? occ.date : occ.start_date
                  return !d || d >= todayDateStr
                })
                if (firstUpcoming >= 0) setActiveOccurrenceIndex(firstUpcoming)
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                eventImageMode === 'per_occurrence'
                  ? 'bg-[#6366F1] text-white border-[#6366F1]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              No, different images
            </button>
          </div>
          {eventImageMode === 'per_occurrence' && (
            <p className="text-xs text-gray-500 mt-2">
              Each event occurrence will have its own set of images for round-robin rotation.
            </p>
          )}
        </div>
      )}

      {/* ===== PER-OCCURRENCE MODE ===== */}
      {eventImageMode === 'per_occurrence' && showPerOccurrenceToggle ? (
        <>
          {/* Occurrence selector tabs */}
          <div className="mb-4 flex flex-wrap gap-2">
            {eventScheduling.occurrences.map((occ, idx) => {
              const occDate = eventOccurrenceType === 'single' ? occ.date : occ.start_date
              const isPast = occDate && /^\d{4}-/.test(occDate) && parseInt(occDate.slice(0, 4), 10) >= 1900 ? occDate < todayDateStr : false
              const occAssetCount = (perOccurrenceAssetIds[idx] || []).length
              const isActive = activeOccurrenceIndex === idx
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { if (!isPast) setActiveOccurrenceIndex(idx) }}
                  disabled={isPast}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    isPast
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                      : isActive
                        ? 'bg-[#6366F1] text-white border-[#6366F1]'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {occ.name || `Event ${idx + 1}`}
                  {isPast && <span className="ml-1 text-xs">(past)</span>}
                  <span className={`ml-1.5 text-xs ${isPast ? 'text-gray-400' : isActive ? 'text-white/70' : 'text-gray-400'}`}>
                    ({occAssetCount})
                  </span>
                </button>
              )
            })}
          </div>

          {/* Active occurrence media section */}
          {(() => {
            const activeOcc = eventScheduling.occurrences[activeOccurrenceIndex]
            if (!activeOcc) return null
            const activeIds = perOccurrenceAssetIds[activeOccurrenceIndex] || []

            return (
              <>
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

                {/* Selected Media for active occurrence */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Selected Media for &ldquo;{activeOcc.name || `Event ${activeOccurrenceIndex + 1}`}&rdquo; ({activeIds.length})
                  </h4>
                  <SortableAssetGrid
                    assets={resolvedAssets}
                    selectedIds={activeIds}
                    onReorder={(newOrder) => setActiveAssetIdsForOccurrence(activeOccurrenceIndex, newOrder)}
                    onRemove={(id) => setActiveAssetIdsForOccurrence(activeOccurrenceIndex, activeIds.filter(x => x !== id))}
                    assetUsage={mode === 'edit' ? assetUsage : undefined}
                  />
                </div>

                {/* Upload Mode */}
                {imageMode === 'upload' && (
                  <div className="space-y-4">
                    <AssetUploadMenu
                      brandId={brandId}
                      onUploadSuccess={async (assetIds) => {
                        setActiveAssetIdsForOccurrence(activeOccurrenceIndex, [...activeIds, ...assetIds])
                        refetchAssets()
                      }}
                      onUploadError={(error) => {
                        showToast({ title: 'Upload failed', message: error, type: 'error' })
                      }}
                    />
                  </div>
                )}

                {/* Existing Images Mode */}
                {imageMode === 'existing' && (
                  <div className="space-y-4">
                    {assetsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
                      </div>
                    ) : assets.length === 0 ? (
                      <p className="text-sm text-gray-500 py-8 text-center">
                        No media available yet. Upload some images or videos to get started.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {resolvedAssets.slice(0, libraryVisibleCount).map(asset => {
                            const isSelected = activeIds.includes(asset.id)
                            const isVideo = asset.asset_type === 'video'
                            const thumbUrl = asset.thumbnail_signed_url || asset.signed_url
                            return (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setActiveAssetIdsForOccurrence(activeOccurrenceIndex, activeIds.filter(id => id !== asset.id))
                                  } else {
                                    setActiveAssetIdsForOccurrence(activeOccurrenceIndex, [...activeIds, asset.id])
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
                                {thumbUrl ? (
                                  <>
                                    <img src={thumbUrl} alt={asset.title} loading="lazy" className="w-full h-32 object-cover" />
                                    {isVideo && (
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                                          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                    {isVideo ? (
                                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                                    ) : 'Loading...'}
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
                        {assets.length > libraryVisibleCount && (
                          <div className="mt-4 flex justify-center">
                            <button
                              type="button"
                              onClick={() => setLibraryVisibleCount(prev => prev + MEDIA_PAGE_SIZE)}
                              className="px-6 py-2 text-sm font-medium text-[#6366F1] border border-[#6366F1] rounded-lg hover:bg-[#EEF2FF] transition-colors"
                            >
                              Load more ({assets.length - libraryVisibleCount} remaining)
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )
          })()}
        </>
      ) : (
        /* ===== SHARED MODE (default) ===== */
        <>
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

          {/* Selected Media - Always visible */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Selected Media ({selectedAssetIds.length})
            </h4>
            <SortableAssetGrid
              assets={resolvedAssets}
              selectedIds={selectedAssetIds}
              onReorder={(newOrder) => setSelectedAssetIds(newOrder)}
              onRemove={(id) => setSelectedAssetIds(prev => prev.filter(x => x !== id))}
              assetUsage={mode === 'edit' ? assetUsage : undefined}
            />
          </div>

          {/* Upload Mode */}
          {imageMode === 'upload' && (
            <div className="space-y-4">
              <AssetUploadMenu
                brandId={brandId}
                onUploadSuccess={async (assetIds) => {
                  setSelectedAssetIds(prev => [...prev, ...assetIds])
                  refetchAssets()

                  // Auto-tag uploaded assets with the category name
                  const categoryName = details.name.trim()
                  if (!categoryName || assetIds.length === 0) return

                  try {
                    // Find or create the tag for this category
                    let tagId: string | null = null
                    const { data: existingTag } = await supabase
                      .from('tags')
                      .select('id')
                      .eq('brand_id', brandId)
                      .eq('name', categoryName)
                      .eq('kind', 'subcategory')
                      .eq('is_active', true)
                      .maybeSingle()

                    if (existingTag) {
                      tagId = existingTag.id
                    } else {
                      // Create the tag (this handles create mode where trigger hasn't fired yet)
                      const { data: newTag } = await supabase
                        .from('tags')
                        .insert({
                          brand_id: brandId,
                          name: categoryName,
                          kind: 'subcategory',
                          is_active: true,
                        })
                        .select('id')
                        .single()
                      if (newTag) tagId = newTag.id
                    }

                    if (tagId) {
                      // Get existing asset_tags count for position ordering
                      const { count } = await supabase
                        .from('asset_tags')
                        .select('*', { count: 'exact', head: true })
                        .eq('tag_id', tagId)

                      const startPosition = count ?? 0

                      const assetTagInserts = assetIds.map((assetId, index) => ({
                        asset_id: assetId,
                        tag_id: tagId!,
                        position: startPosition + index,
                      }))

                      const { error: insertError } = await supabase
                        .from('asset_tags')
                        .insert(assetTagInserts)

                      if (insertError) {
                        console.error('[Wizard] Error auto-tagging uploaded assets:', insertError)
                      }
                    }
                  } catch (err) {
                    console.error('[Wizard] Error auto-tagging uploaded assets:', err)
                  }
                }}
                onUploadError={(error) => {
                  showToast({
                    title: 'Upload failed',
                    message: error,
                    type: 'error'
                  })
                }}
              />
            </div>
          )}

          {/* Existing Images Mode */}
          {imageMode === 'existing' && (
            <div className="space-y-4">
              {assetsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
                </div>
              ) : assets.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  No media available yet. Upload some images or videos to get started.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {resolvedAssets.slice(0, libraryVisibleCount).map(asset => {
                      const isSelected = selectedAssetIds.includes(asset.id)
                      const isVideo = asset.asset_type === 'video'
                      const thumbUrl = asset.thumbnail_signed_url || asset.signed_url
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
                          {thumbUrl ? (
                            <>
                              <img
                                src={thumbUrl}
                                alt={asset.title}
                                loading="lazy"
                                className="w-full h-32 object-cover"
                              />
                              {isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                              {isVideo ? (
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                              ) : 'Loading...'}
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-[#6366F1] text-white rounded-full flex items-center justify-center">
                              <CheckIcon className="w-4 h-4" />
                            </div>
                          )}
                          {mode === 'edit' && (() => {
                            const u = assetUsage.get(asset.id)
                            if (!u || (u.usedCount === 0 && u.queuedCount === 0)) return null
                            return (
                              <div className="absolute bottom-7 left-0 flex items-center gap-1 p-1.5">
                                {u.usedCount > 0 && (
                                  <span className="text-[10px] font-medium leading-none px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                    Used {u.usedCount}x
                                  </span>
                                )}
                                {u.queuedCount > 0 && (
                                  <span className="text-[10px] font-medium leading-none px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                    Queued
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
                            {asset.title}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {assets.length > libraryVisibleCount && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setLibraryVisibleCount(prev => prev + MEDIA_PAGE_SIZE)}
                        className="px-6 py-2 text-sm font-medium text-[#6366F1] border border-[#6366F1] rounded-lg hover:bg-[#EEF2FF] transition-colors"
                      >
                        Load more ({assets.length - libraryVisibleCount} remaining)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  )

  // Accordion section helper for edit mode
  const renderAccordionSection = (
    key: string,
    title: string,
    summary: string,
    renderContent: () => React.ReactNode
  ) => {
    const isExpanded = expandedSections.has(key)
    return (
      <div key={key} className="bg-white border border-gray-200 rounded-lg">
        <button
          type="button"
          onClick={() => toggleSection(key)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {!isExpanded && summary && (
              <p className="text-sm text-gray-500 mt-1 truncate">{summary}</p>
            )}
          </div>
          <ChevronDownIcon
            className={`w-5 h-5 text-gray-400 flex-shrink-0 ml-4 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
        {isExpanded && (
          <div className="px-6 pb-6 border-t border-gray-200 pt-4">
            {renderContent()}
          </div>
        )}
      </div>
    )
  }

  return (
    <RequireAuth>
      <AppLayout>
        <div
          className="flex-1 overflow-auto relative"
          onDragEnter={handleWizardDragEnter}
          onDragOver={handleWizardDragOver}
          onDragLeave={handleWizardDragLeave}
          onDrop={handleWizardDrop}
        >
          {/* Full-page drop overlay */}
          {wizardDragOver && !wizardPageUploading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#6366F1]/10 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-[#6366F1] bg-white/90 px-12 py-10 shadow-lg">
                <svg className="h-12 w-12 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-lg font-semibold text-[#6366F1]">Drop files to upload</span>
                <span className="text-sm text-gray-500">Images and videos, up to 10 files</span>
              </div>
            </div>
          )}

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

          {/* Progress Header — create mode only */}
          {mode === 'create' && (
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
                          w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all
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
                          mt-2 text-xs font-medium hidden sm:block
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
          )}

          {/* Content */}
          <div className="px-4 sm:px-6 lg:px-10 py-6">
            <div className="max-w-4xl">

              {/* ========== EDIT MODE: Accordion layout ========== */}
              {mode === 'edit' && (
                <>
                  {/* Type badge — static, non-editable */}
                  <div className="mb-4 flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {subcategoryType ? TYPE_LABEL_MAP[subcategoryType] : 'Unknown type'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {renderAccordionSection('details', 'Details', detailsSummary, renderDetailsContent)}
                    {renderAccordionSection(
                      'schedule',
                      schedule.frequency === 'specific' ? 'Event dates' : 'Schedule',
                      scheduleSummary,
                      renderScheduleContent
                    )}
                    {renderAccordionSection('images', 'Media', imagesSummary, renderImagesContent)}
                  </div>

                  {/* Edit mode: Cancel / Save buttons */}
                  <div className="mt-6 flex items-center justify-between">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFinish}
                      disabled={isSaving || !hasRequiredMedia}
                      className={`
                        inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                        ${
                          !isSaving && hasRequiredMedia
                            ? 'bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white hover:from-[#4F46E5] hover:to-[#4338CA]'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      {initialData?.setup_complete === false ? 'Save & generate drafts' : 'Save & update drafts'}
                    </button>
                    {!hasRequiredMedia && !isSaving && (
                      <p className="text-xs text-amber-600 mt-1 text-right">Add at least one image to save</p>
                    )}
                  </div>
                </>
              )}

              {/* ========== CREATE MODE: Wizard layout ========== */}
              {mode === 'create' && (
              <>
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
                              // Prevent selecting Schedules type (temporarily disabled)
                              if (option.value === 'dynamic_schedule') return
                              setSubcategoryType(option.value)
                            }}
                            disabled={option.value === 'dynamic_schedule'}
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
                    {renderDetailsContent()}
                  </div>
                )}

                {currentStep === 3 && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-6">
                      Step 3: {schedule.frequency === 'specific' ? 'Event dates' : 'Schedule'}
                    </h2>
                    {renderScheduleContent()}
                  </div>
                )}


                {currentStep === 4 && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-6">
                      Step 4: Media
                    </h2>
                    {renderImagesContent()}
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-3">
                  {currentStep > 1 && (
                    <button
                      onClick={handleBack}
                      className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
                        inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
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
                        inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
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
                          Next: Media
                          <ChevronRightIcon className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleFinish}
                      disabled={isSaving || !hasRequiredMedia}
                      className={`
                        inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                        ${
                          !isSaving && hasRequiredMedia
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
                          Finish and Generate Drafts
                          <ChevronRightIcon className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </button>
                  )}
                  {currentStep === 4 && !hasRequiredMedia && !isSaving && (
                    <p className="text-xs text-amber-600 mt-1">Add at least one image to generate drafts</p>
                  )}
                </div>
              </div>
              </>
              )}
            </div>
          </div>
        </div>

        {/* Loading Modal - Only shows during handleFinish (create mode Step 4) */}
        <Modal
          isOpen={mode === 'create' && isSaving && currentStep === 4}
          onClose={() => {}} // Prevent closing during save
          title="Creating category…"
          showCloseButton={false}
        >
          <WizardFinishProgress finishStep={finishStep} />
        </Modal>

        {/* Loading Modal - Shows during edit mode save */}
        <Modal
          isOpen={mode === 'edit' && isSaving}
          onClose={() => {}} // Prevent closing during save
          title={initialData?.setup_complete === false ? 'Saving & generating drafts…' : 'Saving changes…'}
          showCloseButton={false}
        >
          <EditSaveProgress editSaveStep={editSaveStep} />
        </Modal>
        
      </AppLayout>
    </RequireAuth>
  )
}

/**
 * Animated progress indicator for the wizard finish modal.
 * During the 'generating' step the bar creeps smoothly from 60 → 90 %
 * so the UI never looks frozen during the long API call.
 */
function WizardFinishProgress({ finishStep }: { finishStep: 'linking' | 'preparing' | 'generating' | 'done' }) {
  const stepConfig = {
    linking:    { base: 15,  label: 'Linking images to category…' },
    preparing:  { base: 30,  label: 'Preparing draft generation…' },
    generating: { base: 60,  label: 'Generating drafts and writing copy…' },
    done:       { base: 100, label: 'Done! Redirecting…' },
  }

  const { base, label } = stepConfig[finishStep]

  // Smoothly animate from `base` toward 90% during the generating step
  const [pct, setPct] = React.useState(base)

  React.useEffect(() => {
    if (finishStep !== 'generating') {
      setPct(base)
      return
    }

    setPct(base)
    const start = Date.now()
    const estimatedMs = 120_000 // 2 minutes

    const id = setInterval(() => {
      const elapsed = Date.now() - start
      const t = Math.min(elapsed / estimatedMs, 1)
      const eased = 1 - Math.pow(1 - t, 2) // easeOutQuad
      setPct(Math.min(90, base + Math.floor(eased * (90 - base))))
    }, 400)

    return () => clearInterval(id)
  }, [finishStep, base])

  const isDone = finishStep === 'done'

  return (
    <div className="flex flex-col items-center justify-center py-8 px-2">
      {/* Progress bar */}
      <div className="w-full max-w-sm mb-5">
        <div className="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full bg-[#6366F1] transition-all duration-700 ease-in-out${!isDone ? ' animate-pulse' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Spinner + label */}
      <div className="flex items-center gap-2 mb-1">
        {!isDone && (
          <svg className="animate-spin h-4 w-4 text-[#6366F1]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        <p className="text-sm font-medium text-gray-900 text-center">
          {label}
        </p>
      </div>
      <p className="text-xs text-gray-500 text-center">
        {isDone ? 'Taking you to the Schedule page…' : 'This can take up to 2 minutes — please don\'t close this page.'}
      </p>
    </div>
  )
}

/**
 * Animated progress indicator for the edit-mode save modal.
 * During 'generating' the bar creeps smoothly from 40 → 90 %.
 */
function EditSaveProgress({ editSaveStep }: { editSaveStep: 'saving' | 'generating' | 'done' }) {
  const stepConfig = {
    saving:     { base: 20,  label: 'Saving category changes…' },
    generating: { base: 40,  label: 'Generating drafts…' },
    done:       { base: 100, label: 'Done! Redirecting…' },
  }

  const { base, label } = stepConfig[editSaveStep]

  const [pct, setPct] = React.useState(base)

  React.useEffect(() => {
    if (editSaveStep !== 'generating') {
      setPct(base)
      return
    }

    setPct(base)
    const start = Date.now()
    const estimatedMs = 120_000

    const id = setInterval(() => {
      const elapsed = Date.now() - start
      const t = Math.min(elapsed / estimatedMs, 1)
      const eased = 1 - Math.pow(1 - t, 2)
      setPct(Math.min(90, base + Math.floor(eased * (90 - base))))
    }, 400)

    return () => clearInterval(id)
  }, [editSaveStep, base])

  const isDone = editSaveStep === 'done'

  return (
    <div className="flex flex-col items-center justify-center py-8 px-2">
      <div className="w-full max-w-sm mb-5">
        <div className="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full bg-[#6366F1] transition-all duration-700 ease-in-out${!isDone ? ' animate-pulse' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-1">
        {!isDone && (
          <svg className="animate-spin h-4 w-4 text-[#6366F1]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        <p className="text-sm font-medium text-gray-900 text-center">
          {label}
        </p>
      </div>
      <p className="text-xs text-gray-500 text-center">
        {isDone ? 'Redirecting…' : 'This can take up to 2 minutes — please don\'t close this page.'}
      </p>
    </div>
  )
}

// Default export for Next.js page - no custom props allowed
