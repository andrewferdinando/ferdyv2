'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'

export interface Category {
  id: string
  brand_id: string
  name: string
  created_at: string
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch global categories (not brand-specific)
        const { data, error } = await supabase
          .from('categories')
          .select('id, brand_id, name, created_at')
          .order('name', { ascending: true })

        if (error) {
          setError(error.message)
          return
        }

        setCategories(data || [])
      } catch (err) {
        setError('Failed to fetch categories')
        console.error('Error fetching categories:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, []) // Remove brandId dependency since categories are global

  return {
    categories,
    loading,
    error
  }
}
