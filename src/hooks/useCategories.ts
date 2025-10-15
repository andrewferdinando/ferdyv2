'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'

export interface Category {
  id: string
  brand_id: string
  name: string
  type: 'deal' | 'offering'
  post_frequency: string
  created_at: string
  updated_at: string
}

export function useCategories(brandId: string) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!brandId) return

    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false })

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

  const createCategory = async (categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          ...categoryData,
          brand_id: brandId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      setCategories(prev => [data, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
      throw err
    }
  }

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setCategories(prev => 
        prev.map(cat => cat.id === id ? data : cat)
      )
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category')
      throw err
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error

      setCategories(prev => prev.filter(cat => cat.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
      throw err
    }
  }

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory
  }
}
