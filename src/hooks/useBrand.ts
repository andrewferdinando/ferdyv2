'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { Brand } from './useBrands'

/**
 * Hook to fetch a single brand by ID, including timezone info
 */
export function useBrand(brandId: string | null) {
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!brandId) {
      setBrand(null)
      setLoading(false)
      return
    }

    const fetchBrand = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('brands')
          .select('*')
          .eq('id', brandId)
          .eq('status', 'active')
          .single()

        if (fetchError) {
          throw fetchError
        }

        setBrand(data)
      } catch (err) {
        console.error('Error fetching brand:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch brand')
        setBrand(null)
      } finally {
        setLoading(false)
      }
    }

    fetchBrand()
  }, [brandId])

  return {
    brand,
    loading,
    error,
  }
}

