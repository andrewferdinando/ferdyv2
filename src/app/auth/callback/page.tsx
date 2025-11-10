'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { finalizeInvite } from './actions'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [statusMessage, setStatusMessage] = useState('Finalising your access…')

  useEffect(() => {
    const complete = async () => {
      try {
        const hash = window.location.hash.substring(1)
        const hashParams = new URLSearchParams(hash)
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (!accessToken || !refreshToken) {
          console.error('Auth callback missing tokens', {
            hasAccessToken: Boolean(accessToken),
            hasRefreshToken: Boolean(refreshToken),
            hash: window.location.hash,
            href: window.location.href,
          })
          setStatusMessage('This link has expired. Please request a new invite.')
          window.location.replace('/auth/sign-in?message=Invite link expired')
          return
        }

        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (setSessionError) {
          console.error('Auth callback setSession error', setSessionError)
          throw setSessionError
        }

        const url = new URL(window.location.href)
        const brandId = url.searchParams.get('brand_id')

        const result = await finalizeInvite({
          accessToken,
          brandId,
        })

        try {
          localStorage.setItem('selectedBrandId', result.brandId)
          localStorage.setItem('selectedBrandName', result.brandName)
          localStorage.setItem('welcomeBrandName', result.brandName)
        } catch (storageError) {
          console.warn('Unable to persist brand selection', storageError)
        }

        window.location.replace(`/brands/${result.brandId}?welcome=1`)
        return
      } catch (error) {
        console.error('auth callback error', error)
        setStatusMessage('Something went wrong. Please sign in again.')
        window.location.replace('/auth/sign-in?message=Please sign in to continue')
      }
    }

    complete()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#6366F1] mx-auto" />
        <p className="text-sm text-gray-600">{statusMessage}</p>
      </div>
    </div>
  )
}


