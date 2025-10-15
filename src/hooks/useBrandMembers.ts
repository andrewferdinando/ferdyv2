import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-browser'

export interface BrandMember {
  user_id: string
  email: string
  full_name: string
  role: 'admin' | 'editor'
  joined_at: string
}

export function useBrandMembers(brandId: string) {
  const [members, setMembers] = useState<BrandMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!brandId) return

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.rpc('rpc_list_brand_members', {
        p_brand_id: brandId
      })

      if (error) {
        setError(error.message)
        return
      }

      setMembers(data || [])
    } catch (err) {
      setError('Failed to fetch team members')
      console.error('Error fetching brand members:', err)
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    fetchMembers()
  }, [brandId, fetchMembers])

  return {
    members,
    loading,
    error,
    refetch: fetchMembers
  }
}
