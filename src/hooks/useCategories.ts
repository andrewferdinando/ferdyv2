'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'

export interface Category {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
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
          .select('id, name, is_active, created_at, updated_at')
          .eq('is_active', true)
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
