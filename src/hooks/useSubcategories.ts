'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'

export interface Subcategory {
  id: string
  brand_id: string
  category_id: string
  name: string
  detail?: string
  url?: string
  hashtags: string[]
  created_at: string
  updated_at: string
}

export function useSubcategories(brandId: string, categoryId: string | null) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!brandId || !categoryId) {
      setSubcategories([])
      setLoading(false)
      return
    }

    const fetchSubcategories = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('subcategories')
          .select('*')
          .eq('brand_id', brandId)
          .eq('category_id', categoryId)
          .order('name', { ascending: true })

        if (error) {
          setError(error.message)
          return
        }

        setSubcategories(data || [])
      } catch (err) {
        setError('Failed to fetch subcategories')
        console.error('Error fetching subcategories:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSubcategories()
  }, [brandId, categoryId])

  const createSubcategory = async (subcategoryData: Omit<Subcategory, 'id' | 'brand_id' | 'category_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .insert({
          ...subcategoryData,
          brand_id: brandId,
          category_id: categoryId!,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      setSubcategories(prev => [...prev, data])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subcategory')
      throw err
    }
  }

  const updateSubcategory = async (id: string, updates: Partial<Subcategory>) => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setSubcategories(prev => 
        prev.map(sub => sub.id === id ? data : sub)
      )
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subcategory')
      throw err
    }
  }

  const deleteSubcategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSubcategories(prev => prev.filter(sub => sub.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete subcategory')
      throw err
    }
  }

  return {
    subcategories,
    loading,
    error,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory
  }
}
