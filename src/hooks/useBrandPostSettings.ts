import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'

export type CopyLength = 'short' | 'medium' | 'long'

export interface BrandPostSettings {
  defaultPostTime: string | null // Format: "HH:MM" (e.g., "10:00") or null
  defaultCopyLength: CopyLength
  isLoading: boolean
  error: Error | null
}

/**
 * Hook to fetch brand posting settings from brand_post_information table
 * @param brandId - The brand ID to fetch settings for
 * @returns BrandPostSettings with defaults applied
 */
export function useBrandPostSettings(brandId: string): BrandPostSettings {
  const [defaultPostTime, setDefaultPostTime] = useState<string | null>(null)
  const [defaultCopyLength, setDefaultCopyLength] = useState<CopyLength>('medium')
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

        // Parse default_post_time: if it exists, extract HH:MM format
        if (data?.default_post_time) {
          const timeStr = typeof data.default_post_time === 'string' 
            ? data.default_post_time.substring(0, 5) // Extract "HH:MM" from "HH:MM:SS"
            : null
          setDefaultPostTime(timeStr)
        } else {
          setDefaultPostTime(null) // Will use fallback "10:00" in UI
        }

        // Parse default_copy_length: validate it's one of the allowed values
        if (data?.default_copy_length && ['short', 'medium', 'long'].includes(data.default_copy_length)) {
          setDefaultCopyLength(data.default_copy_length as CopyLength)
        } else {
          setDefaultCopyLength('medium') // Fallback
        }
      } catch (err) {
        console.error('Error fetching brand post settings:', err)
        setError(err instanceof Error ? err : new Error('Failed to load settings'))
        // Use defaults on error
        setDefaultPostTime(null)
        setDefaultCopyLength('medium')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [brandId])

  return {
    defaultPostTime,
    defaultCopyLength,
    isLoading,
    error,
  }
}

