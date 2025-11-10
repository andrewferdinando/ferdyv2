'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { finalizeInvite } from '../callback/actions'

export default function ExistingInvitePage() {
  const [statusMessage, setStatusMessage] = useState('Finalising your invite…')

  useEffect(() => {
    const complete = async () => {
      if (typeof window === 'undefined') {
        return
      }

      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken || !refreshToken) {
        setStatusMessage('This invite link is missing information. Please request a new invite.')
        return
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (setSessionError) {
        console.error('ExistingInvite: setSession error', setSessionError)
        setStatusMessage('We were unable to validate this link. Please request a new invite.')
        return
      }

      let resolvedBrandId: string | null = null
      const currentUrl = new URL(window.location.href)
      resolvedBrandId = currentUrl.searchParams.get('brand_id')

      if (!resolvedBrandId) {
        const {
          data: { user },
        } = await supabase.auth.getUser(accessToken)
        resolvedBrandId =
          (user?.user_metadata?.brand_id as string | undefined) ??
          (user?.user_metadata?.brandId as string | undefined) ??
          (user?.user_metadata?.brandID as string | undefined) ??
          null
      }

      try {
        const result = await finalizeInvite({
          accessToken,
          brandId: resolvedBrandId,
        })

        try {
          localStorage.setItem('selectedBrandId', result.brandId)
          localStorage.setItem('selectedBrandName', result.brandName)
          localStorage.setItem('welcomeBrandName', result.brandName)
        } catch (storageError) {
          console.warn('ExistingInvite: unable to persist brand state', storageError)
        }

        window.location.replace(`/brands/${result.brandId}/schedule?welcome=1`)
      } catch (error) {
        console.error('ExistingInvite: finalize error', error)
        setStatusMessage('We could not complete this invite. Please try signing in manually.')
        window.location.replace('/auth/sign-in?message=Please sign in to continue')
      }
    }

    complete()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#6366F1] mx-auto" />
        <p className="text-sm text-gray-600">{statusMessage}</p>
      </div>
    </div>
  )
}


