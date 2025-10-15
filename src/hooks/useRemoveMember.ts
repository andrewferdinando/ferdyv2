import { useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

export function useRemoveMember() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const removeMember = async (brandId: string, userId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.rpc('rpc_remove_member', {
        p_brand_id: brandId,
        p_user_id: userId
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove member'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    removeMember,
    loading,
    error,
  }
}
