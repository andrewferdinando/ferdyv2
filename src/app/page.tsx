'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // User is authenticated, redirect to brands selection page
          router.push('/brands')
        } else {
          // User is not authenticated, redirect to sign-in
          router.push('/auth/sign-in')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        // On error, redirect to sign-in
        router.push('/auth/sign-in')
      }
    }

    checkAuthAndRedirect()
  }, [router])

  // Show loading while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
