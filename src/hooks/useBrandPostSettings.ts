import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'

export type CopyLength = 'short' | 'medium' | 'long'

export interface BrandPostSettings {
  defaultPostTime: string // Format: "HH:MM" (e.g., "10:00") - always non-null with fallback
  defaultCopyLength: CopyLength // Always non-null with fallback
  isLoading: boolean
  error: Error | null
}

/**
 * Hook to fetch brand posting settings from brand_post_information table
 * @param brandId - The brand ID to fetch settings for
 * @returns BrandPostSettings with defaults applied
 */
export function useBrandPostSettings(brandId: string): BrandPostSettings {
  // Initialize with fallback values so components always get non-null defaults
  const [defaultPostTime, setDefaultPostTime] = useState<string>('10:00') // Fallback: 10:00 AM
  const [defaultCopyLength, setDefaultCopyLength] = useState<CopyLength>('medium') // Fallback: medium
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!brandId) {
      setIsLoading(false)
      return
    }

    const fetchSettings = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('brand_post_information')
          .select('default_post_time, default_copy_length')
          .eq('brand_id', brandId)
          .maybeSingle()

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 is "not found" which is fine - we'll use defaults
          throw fetchError
        }

        // Parse default_post_time: if it exists, extract HH:MM format, otherwise use 10:00 fallback
        if (data?.default_post_time) {
          const timeStr = typeof data.default_post_time === 'string' 
            ? data.default_post_time.substring(0, 5) // Extract "HH:MM" from "HH:MM:SS"
            : '10:00' // Fallback
          setDefaultPostTime(timeStr)
        } else {
          setDefaultPostTime('10:00') // Fallback to 10:00 AM when null/missing
        }

        // Parse default_copy_length: validate it's one of the allowed values, otherwise use 'medium'
        if (data?.default_copy_length && ['short', 'medium', 'long'].includes(data.default_copy_length)) {
          setDefaultCopyLength(data.default_copy_length as CopyLength)
        } else {
          setDefaultCopyLength('medium') // Fallback to 'medium' when null/missing
        }
      } catch (err) {
        console.error('Error fetching brand post settings:', err)
        setError(err instanceof Error ? err : new Error('Failed to load settings'))
        // Use defaults on error - ensure non-null values
        setDefaultPostTime('10:00')
        setDefaultCopyLength('medium')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [brandId])

  return {
    defaultPostTime, // Always non-null: either from DB or '10:00' fallback
    defaultCopyLength, // Always non-null: either from DB or 'medium' fallback
    isLoading,
    error,
  }
}

