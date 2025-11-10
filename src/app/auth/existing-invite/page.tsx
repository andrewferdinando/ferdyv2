'use client'

import { useEffect, useState } from 'react'

export default function ExistingInvitePage() {
  const [statusMessage, setStatusMessage] = useState('Preparing your sign-in…')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const url = new URL(window.location.href)
    const brandId = url.searchParams.get('brand_id')
    const email = url.searchParams.get('email')

    if (!brandId || !email) {
      setStatusMessage('This invite link is missing information. Please request a new invite.')
      return
    }

    const searchParams = new URLSearchParams()
    searchParams.set('message', 'Sign in to accept your invite.')
    searchParams.set('invite', '1')
    searchParams.set('invite_brand', brandId)
    searchParams.set('invite_email', email)

    const signInUrl = `/auth/sign-in?${searchParams.toString()}`

    // Redirect to sign-in without preserving the hash fragment.
    window.location.replace(signInUrl)
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


