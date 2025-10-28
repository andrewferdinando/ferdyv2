'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'

export interface Category {
  id: string
  brand_id: string
  name: string
  created_at: string
}

export function useCategories(brandId: string) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!brandId) {
      setCategories([])
      setLoading(false)
      return
    }

    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch brand-specific categories
        const { data, error } = await supabase
          .from('categories')
          .select('id, brand_id, name, created_at')
          .eq('brand_id', brandId)
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
  }, [brandId])

  const createCategory = async (name: string, brandId: string) => {
    try {
      setError(null)

      if (!name || !name.trim()) {
        throw new Error('Category name is required')
      }

      if (!brandId) {
        throw new Error('Brand ID is required')
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: name.trim(),
          brand_id: brandId
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Add to local state
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category'
      setError(errorMessage)
      throw err
    }
  }

  const refetch = async () => {
    if (!brandId) {
      setCategories([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('categories')
        .select('id, brand_id, name, created_at')
        .eq('brand_id', brandId)
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

  return {
    categories,
    loading,
    error,
    createCategory,
    refetch
  }
}
