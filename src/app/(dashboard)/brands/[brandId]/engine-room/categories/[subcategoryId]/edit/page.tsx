'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { supabase } from '@/lib/supabase-browser'
import NewFrameworkItemWizard from '../../../framework/new/page'
import type { WizardInitialData } from '../../../framework/new/page'
import { SubcategoryType } from '@/types/subcategories'

export default function EditCategoryPage() {
  const params = useParams()
  const brandId = params.brandId as string
  const subcategoryId = params.subcategoryId as string
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<WizardInitialData | null>(null)

  useEffect(() => {
    const loadCategoryData = async () => {
      if (!subcategoryId || !brandId) {
        setError('Missing subcategory ID or brand ID')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // 1. Fetch subcategory
        const { data: subcategory, error: subcatError } = await supabase
          .from('subcategories')
          .select('*')
          .eq('id', subcategoryId)
          .eq('brand_id', brandId)
          .single()

        if (subcatError) throw subcatError
        if (!subcategory) {
          setError('Subcategory not found')
          setLoading(false)
          return
        }

        // 2. Fetch schedule_rules for this subcategory
        const { data: scheduleRules, error: rulesError } = await supabase
          .from('schedule_rules')
          .select('*')
          .eq('subcategory_id', subcategoryId)
          .eq('brand_id', brandId)

        if (rulesError) throw rulesError

        // Get the first schedule rule (there should typically be one for Events)
        const scheduleRule = scheduleRules && scheduleRules.length > 0 ? scheduleRules[0] : null

        // 3. Fetch event_occurrences if this is an Events type
        let eventOccurrences: any[] | undefined = undefined
        let eventOccurrenceType: 'single' | 'range' | undefined = undefined
        
        if (subcategory.subcategory_type === 'event_series' && scheduleRule?.frequency === 'specific') {
          const { data: occurrences, error: occurrencesError } = await supabase
            .from('event_occurrences')
            .select('*')
            .eq('subcategory_id', subcategoryId)
            .order('starts_at', { ascending: true })

          if (occurrencesError) throw occurrencesError

          eventOccurrences = occurrences || []

          // Determine occurrence type: if any occurrence has end_at, assume range mode
          // Otherwise, assume single mode
          if (eventOccurrences.length > 0) {
            eventOccurrenceType = eventOccurrences.some(occ => occ.end_at) ? 'range' : 'single'
          } else {
            eventOccurrenceType = 'single' // Default to single if no occurrences yet
          }
        }

        // 4. Fetch associated assets via tags
        let assetIds: string[] = []
        
        // Get tag for this subcategory
        const { data: tag, error: tagError } = await supabase
          .from('tags')
          .select('id')
          .eq('subcategory_id', subcategoryId)
          .eq('kind', 'subcategory')
          .maybeSingle()

        if (!tagError && tag) {
          // Get asset_ids via asset_tags
          const { data: assetTags, error: assetTagsError } = await supabase
            .from('asset_tags')
            .select('asset_id')
            .eq('tag_id', tag.id)

          if (!assetTagsError && assetTags) {
            assetIds = assetTags.map((at: any) => at.asset_id)
          }
        }

        // Shape the data for the wizard
        const wizardData: WizardInitialData = {
          subcategory: {
            id: subcategory.id,
            name: subcategory.name,
            detail: subcategory.detail || '',
            url: subcategory.url || '',
            default_hashtags: subcategory.default_hashtags || [],
            channels: subcategory.channels || [],
            subcategory_type: (subcategory.subcategory_type as SubcategoryType) || 'other',
            settings: subcategory.settings || {}
          },
          assets: assetIds,
          eventOccurrenceType: eventOccurrenceType
        }

        // Add schedule rule data if available
        if (scheduleRule) {
          wizardData.scheduleRule = {
            frequency: scheduleRule.frequency as any,
            time_of_day: scheduleRule.time_of_day,
            days_of_week: scheduleRule.days_of_week,
            day_of_month: scheduleRule.day_of_month,
            nth_week: scheduleRule.nth_week,
            weekday: scheduleRule.weekday,
            timezone: scheduleRule.timezone || 'Pacific/Auckland',
            days_before: scheduleRule.days_before,
            days_during: scheduleRule.days_during,
            start_date: scheduleRule.start_date,
            end_date: scheduleRule.end_date
          }
        }

        // Add event occurrences if available
        if (eventOccurrences && eventOccurrences.length > 0) {
          wizardData.eventOccurrences = eventOccurrences.map(occ => ({
            id: occ.id,
            starts_at: occ.starts_at,
            end_at: occ.end_at,
            url: occ.url,
            notes: occ.notes,
            summary: occ.summary ? (typeof occ.summary === 'string' ? JSON.parse(occ.summary) : occ.summary) : null
          }))
        }

        setInitialData(wizardData)
      } catch (err: any) {
        console.error('Error loading category data:', err)
        setError(err.message || 'Failed to load category data')
      } finally {
        setLoading(false)
      }
    }

    loadCategoryData()
  }, [subcategoryId, brandId])

  if (loading) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Loading category data...</p>
            </div>
          </div>
        </AppLayout>
      </RequireAuth>
    )
  }

  if (error || !initialData) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-4">Error</h1>
              <p className="text-red-600">{error || 'Failed to load category data'}</p>
            </div>
          </div>
        </AppLayout>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <NewFrameworkItemWizard mode="edit" initialData={initialData} />
    </RequireAuth>
  )
}
