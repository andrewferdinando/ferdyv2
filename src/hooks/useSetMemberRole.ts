import { useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

export function useSetMemberRole() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setMemberRole = async (
    brandId: string, 
    userId: string, 
    role: 'admin' | 'editor'
  ) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.rpc('rpc_set_member_role', {
        p_brand_id: brandId,
        p_user_id: userId,
        p_role: role
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update member role'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    setMemberRole,
    loading,
    error,
  }
}
