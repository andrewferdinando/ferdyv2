'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

const INTEGRATIONS_PATH_REGEX = /^\/brands\/[^/]+\/engine-room\/integrations/

export default function DashboardAuthGate() {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const checkedRef = useRef(false)

  useEffect(() => {
    let active = true
    if (!supabase) {
      return
    }

    const isIntegrationsPath = INTEGRATIONS_PATH_REGEX.test(pathname)

    const redirectToSignIn = () => {
      if (!active || isIntegrationsPath) {
        return
      }
      const next = encodeURIComponent(pathname || '/')
      router.replace(`/auth/sign-in?next=${next}`)
    }

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!active) return
        if (data.session) {
          checkedRef.current = true
          return
        }

        // No session found – only redirect immediately if not on integrations page
        redirectToSignIn()
      } catch (error) {
        console.error('[DashboardAuthGate] session check failed', error)
        redirectToSignIn()
      }
    }

    void checkSession()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (session) {
        checkedRef.current = true
      } else {
        redirectToSignIn()
      }
    })

    return () => {
      active = false
      subscription?.subscription.unsubscribe()
    }
  }, [pathname, router])

  return null
}


