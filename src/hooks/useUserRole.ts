'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'

export function useUserRole(brandId: string) {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!brandId) {
      setLoading(false)
      return
    }

    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data: membershipData, error } = await supabase
          .from('brand_memberships')
          .select('role')
          .eq('user_id', user.id)
          .eq('brand_id', brandId)
          .single()

        if (error) {
          console.error('Error checking user role:', error)
          setLoading(false)
          return
        }

        setUserRole(membershipData?.role || null)
      } catch (error) {
        console.error('Error checking user role:', error)
      } finally {
        setLoading(false)
      }
    }

    checkUserRole()
  }, [brandId])

  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'owner'
  const isEditor = userRole === 'editor'

  return {
    userRole,
    isAdmin,
    isEditor,
    isSuperAdmin: userRole === 'super_admin',
    loading
  }
}

