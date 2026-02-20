'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import RequireAuth from '@/components/auth/RequireAuth'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/lib/supabase-browser'

/**
 * Group-level /account/team/[userId] — redirects to brand-scoped version.
 */
export default function TeamMemberRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  useEffect(() => {
    const redirect = async () => {
      const storedBrandId = typeof window !== 'undefined'
        ? localStorage.getItem('selectedBrandId')
        : null

      if (storedBrandId) {
        router.replace(`/brands/${storedBrandId}/account/team/${userId}`)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/auth/sign-in')
          return
        }

        const { data: memberships } = await supabase
          .from('brand_memberships')
          .select('brand_id')
          .eq('user_id', user.id)
          .limit(1)

        if (memberships && memberships.length > 0) {
          router.replace(`/brands/${memberships[0].brand_id}/account/team/${userId}`)
        } else {
          router.replace('/brands')
        }
      } catch {
        router.replace('/brands')
      }
    }

    redirect()
  }, [router, userId])

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1]"></div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}
