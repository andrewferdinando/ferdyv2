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
  hashtags: string[] // Maps to default_hashtags in database
  channels?: string[] // Social media channels
  created_at: string
  updated_at: string
}

export function useSubcategories(brandId: string, categoryId: string | null) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0) // Add trigger for manual refresh

  const fetchSubcategories = async () => {
    if (!brandId || !categoryId) {
      setSubcategories([])
      setLoading(false)
      return
    }

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

      // Map default_hashtags to hashtags and include channels
      const mappedData = (data || []).map((item: {
        id: string;
        brand_id: string;
        category_id: string;
        name: string;
        detail?: string;
        url?: string;
        default_hashtags?: string[];
        channels?: string[];
        created_at: string;
        updated_at: string;
      }) => ({
        ...item,
        hashtags: item.default_hashtags || [],
        channels: item.channels || []
      }))

      setSubcategories(mappedData)
    } catch (err) {
      setError('Failed to fetch subcategories')
      console.error('Error fetching subcategories:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubcategories()
  }, [brandId, categoryId, refreshTrigger])

  const refetch = () => {
    setRefreshTrigger(prev => prev + 1)
  }

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
      setLoading(true) // Set loading to prevent multiple simultaneous deletes
      
      // First, get all schedule_rule_ids for this subcategory
      const { data: scheduleRules, error: fetchRulesError } = await supabase
        .from('schedule_rules')
        .select('id')
        .eq('subcategory_id', id)

      if (fetchRulesError) {
        console.warn('Failed to fetch schedule rules:', fetchRulesError)
      }

      // Delete in order: drafts -> post_jobs -> schedule_rules -> subcategory
      // This ensures foreign key constraints are satisfied
      if (scheduleRules && scheduleRules.length > 0) {
        const ruleIds = scheduleRules.map(r => r.id)
        
        // 1. Delete drafts that reference post_jobs with these schedule_rules
        const { data: postJobs, error: fetchPostJobsError } = await supabase
          .from('post_jobs')
          .select('id')
          .in('schedule_rule_id', ruleIds)

        if (!fetchPostJobsError && postJobs && postJobs.length > 0) {
          const postJobIds = postJobs.map(j => j.id)
          
          // Delete drafts first
          const { error: draftsError } = await supabase
            .from('drafts')
            .delete()
            .in('post_job_id', postJobIds)

          if (draftsError) {
            console.warn('Failed to delete drafts:', draftsError)
            // Continue - some drafts might not exist
          }

          // 2. Delete post_jobs
          const { error: postJobsError } = await supabase
            .from('post_jobs')
            .delete()
            .in('schedule_rule_id', ruleIds)

          if (postJobsError) {
            console.warn('Failed to delete post_jobs:', postJobsError)
            // Continue - some post_jobs might not exist
          }
        }

        // 3. Hard delete all associated schedule_rules
        const { error: scheduleRuleError } = await supabase
          .from('schedule_rules')
          .delete()
          .eq('subcategory_id', id)

        if (scheduleRuleError) {
          console.warn('Failed to delete schedule rules:', scheduleRuleError)
          // Continue with subcategory deletion
        }
      }

      // 4. Delete the subcategory
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id)

      if (error) {
        // If deletion fails, provide more context
        console.error('Failed to delete subcategory:', error)
        throw new Error(`Failed to delete subcategory: ${error.message}. There may be existing references preventing deletion.`)
      }

      // Update local state by filtering out the deleted subcategory
      setSubcategories(prev => {
        const filtered = prev.filter(sub => sub.id !== id)
        return filtered
      })
      
      // Also refetch to ensure consistency
      if (categoryId) {
        const { data, error: fetchError } = await supabase
          .from('subcategories')
          .select('*')
          .eq('brand_id', brandId)
          .eq('category_id', categoryId)
          .order('name', { ascending: true })

        if (!fetchError && data) {
          const mappedData = data.map((item: {
            id: string;
            brand_id: string;
            category_id: string;
            name: string;
            detail?: string;
            url?: string;
            default_hashtags?: string[];
            channels?: string[];
            created_at: string;
            updated_at: string;
          }) => ({
            ...item,
            hashtags: item.default_hashtags || [],
            channels: item.channels || []
          }))
          setSubcategories(mappedData)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete subcategory')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    subcategories,
    loading,
    error,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    refetch
  }
}
