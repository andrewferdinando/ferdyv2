'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'

export interface Tag {
  id: string
  brand_id: string
  name: string
  kind: 'subcategory' | 'custom'
  is_active: boolean
  created_at: string
}

export function useTags(brandId: string) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTags = async () => {
    if (!brandId) {
      setTags([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('tags')
        .select('*')
        .eq('brand_id', brandId)
        .eq('is_active', true)
        .order('kind', { ascending: true }) // subcategory first, then custom
        .order('name', { ascending: true })

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      setTags(data || [])
    } catch (err) {
      setError('Failed to fetch tags')
      console.error('Error fetching tags:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTags()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId])

  const createCustomTag = async (name: string) => {
    try {
      const { data, error: createError } = await supabase
        .from('tags')
        .insert({
          brand_id: brandId,
          name: name.trim(),
          kind: 'custom',
          is_active: true
        })
        .select()
        .single()

      if (createError) throw createError

      // Refresh tags list
      await fetchTags()
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag')
      throw err
    }
  }

  return {
    tags,
    loading,
    error,
    refetch: fetchTags,
    createCustomTag
  }
}

