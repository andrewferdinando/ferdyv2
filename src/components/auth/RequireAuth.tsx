'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'

interface RequireAuthProps {
  children: React.ReactNode
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.debug('[RequireAuth] Initial session check', { pathname, hasSession: !!session, error })

        if (!session) {
          const next = encodeURIComponent(pathname)
          console.debug('[RequireAuth] No session found, redirecting', { next })
          router.push(`/auth/sign-in?next=${next}`)
          return
        }

        setUser(session.user)
        setLoading(false)
      } catch (authError) {
        console.error('[RequireAuth] Failed to get session', authError)
        const next = encodeURIComponent(pathname)
        router.push(`/auth/sign-in?next=${next}`)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.debug('[RequireAuth] Auth state change', { event, hasSession: !!session })
        if (event === 'SIGNED_OUT' || !session) {
          const next = encodeURIComponent(pathname)
          router.push(`/auth/sign-in?next=${next}`)
        } else if (session) {
          setUser(session.user)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
