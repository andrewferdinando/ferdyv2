import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

export interface Group {
  id: string
  name: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string
  price_per_brand_cents: number
  currency: string
  created_at: string
}

export interface GroupMembership {
  id: string
  group_id: string
  user_id: string
  role: 'super_admin' | 'admin' | 'member'
  created_at: string
}

export function useUserGroup() {
  const [group, setGroup] = useState<Group | null>(null)
  const [membership, setMembership] = useState<GroupMembership | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function loadGroup() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // Get user's group memberships
        const { data: memberships, error: memberError } = await supabase
          .from('group_memberships')
          .select('*, groups(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        if (memberError) throw memberError

        if (memberships && memberships.length > 0) {
          // Use first group (oldest) as default
          const firstMembership = memberships[0]
          setMembership(firstMembership as any)
          setGroup((firstMembership as any).groups)
        }

        setLoading(false)
      } catch (err) {
        console.error('Error loading user group:', err)
        setError(err as Error)
        setLoading(false)
      }
    }

    loadGroup()
  }, [supabase])

  const refetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { data: memberships, error: memberError } = await supabase
        .from('group_memberships')
        .select('*, groups(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (memberError) throw memberError

      if (memberships && memberships.length > 0) {
        const firstMembership = memberships[0]
        setMembership(firstMembership as any)
        setGroup((firstMembership as any).groups)
      }
    } catch (err: any) {
      console.error('Error refetching group:', err)
    }
  }

  return {
    group,
    membership,
    loading,
    error,
    isAdmin: membership?.role === 'admin' || membership?.role === 'super_admin',
    canManageBilling: membership?.role === 'admin' || membership?.role === 'super_admin',
    refetch,
  }
}
