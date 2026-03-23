'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'

export function useGroupRole(brandId: string) {
  const [groupRole, setGroupRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!brandId) {
      setLoading(false)
      return
    }

    const fetchGroupRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // Get the brand's group_id
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('group_id')
          .eq('id', brandId)
          .single()

        if (brandError || !brandData?.group_id) {
          setLoading(false)
          return
        }

        // Get user's role in that group
        const { data: membership, error: membershipError } = await supabase
          .from('group_memberships')
          .select('role')
          .eq('group_id', brandData.group_id)
          .eq('user_id', user.id)
          .single()

        if (membershipError) {
          console.error('Error fetching group role:', membershipError)
          setLoading(false)
          return
        }

        setGroupRole(membership?.role || null)
      } catch (error) {
        console.error('Error fetching group role:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGroupRole()
  }, [brandId])

  const isGroupAdmin = groupRole === 'owner' || groupRole === 'admin' || groupRole === 'super_admin'

  return {
    groupRole,
    isGroupAdmin,
    loading,
  }
}
