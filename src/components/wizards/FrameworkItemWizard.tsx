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

// Export the interface and types for reuse
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
    frequency: 'daily' | 'weekly' | 'monthly' | 'specific'
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

// This will be populated by copying the wizard component code
export default function FrameworkItemWizard(props: WizardProps = {}) {
  const { mode = 'create', initialData } = props
  // Component logic will go here
  return null
}

