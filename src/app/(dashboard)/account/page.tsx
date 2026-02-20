'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RequireAuth from '@/components/auth/RequireAuth'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/lib/supabase-browser'

/**
 * Group-level /account page — redirects to the brand-scoped version.
 * We need brand context to show correct group data, so this page
 * resolves the user's current brand and redirects.
 */
export default function AccountRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const redirect = async () => {
      // Try localStorage first (set by sidebar brand selector)
      const storedBrandId = typeof window !== 'undefined'
        ? localStorage.getItem('selectedBrandId')
        : null

      if (storedBrandId) {
        router.replace(`/brands/${storedBrandId}/account`)
        return
      }

      // Fall back to first brand the user has access to
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
          router.replace(`/brands/${memberships[0].brand_id}/account`)
        } else {
          router.replace('/brands')
        }
      } catch {
        router.replace('/brands')
      }
    }

    redirect()
  }, [router])

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
