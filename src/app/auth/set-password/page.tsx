'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form } from '@/components/ui/Form'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase-browser'
import { finalizeInvite } from '../callback/actions'

export default function SetPasswordPage() {
  const router = useRouter()
  const [isPreparing, setIsPreparing] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [brandId, setBrandId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  const passwordStrengthHint = useMemo(
    () => 'Use at least 8 characters, including a mix of letters, numbers, and symbols.',
    [],
  )

  useEffect(() => {
    const prepareFromHash = async () => {
      if (typeof window === 'undefined') {
        return
      }

      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const access = params.get('access_token')
      const refresh = params.get('refresh_token')
      const emailFromHash = params.get('email')

      const currentUrl = new URL(window.location.href)
      const pendingBrandId = currentUrl.searchParams.get('brand_id')

      if (!access || !refresh) {
        setError('This invite link is invalid or has expired. Please request a new invitation.')
        setIsPreparing(false)
        return
      }

      setBrandId(pendingBrandId)
      setEmail(emailFromHash)

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: access,
        refresh_token: refresh,
      })

      if (setSessionError) {
        console.error('SetPasswordPage: failed to set session', setSessionError)
        setError('We could not validate this invite. Please request a new invitation.')
        setIsPreparing(false)
        return
      }

      setAccessToken(access)
      setIsPreparing(false)
    }

    prepareFromHash()
  }, [])

  const handleSubmit = async (event: React.FormEvent<Element>) => {
    event.preventDefault()

    if (!accessToken) {
      setError('Missing access token for this invite. Please use the link from your email again.')
      return
    }

    if (password.trim().length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter them.')
      return
    }

    setSubmitLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        console.error('SetPasswordPage: updateUser error', updateError)
        setError(updateError.message || 'Unable to set password. Please try again.')
        setSubmitLoading(false)
        return
      }

      const result = await finalizeInvite({
        accessToken,
        brandId,
      })

      try {
        localStorage.setItem('selectedBrandId', result.brandId)
        localStorage.setItem('selectedBrandName', result.brandName)
        localStorage.setItem('welcomeBrandName', result.brandName)
      } catch (storageError) {
        console.warn('SetPasswordPage: failed to persist brand context', storageError)
      }

      router.replace(`/brands/${result.brandId}/schedule?welcome=1`)
    } catch (inviteError) {
      console.error('SetPasswordPage: finalize invite error', inviteError)
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : 'We could not complete your invite. Please try again.',
      )
    } finally {
      setSubmitLoading(false)
    }
  }

  const helperLine = email
    ? `Set a password for ${email}`
    : 'Set a password to activate your account.'

  if (isPreparing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#6366F1] mx-auto" />
          <p className="text-sm text-gray-600">Preparing your invite…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 text-center">Set your password</h1>
          <p className="mt-2 text-sm text-gray-600 text-center">{helperLine}</p>
        </div>

        <Form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New password</label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                placeholder="Enter your password"
              />
              <p className="mt-2 text-xs text-gray-500">{passwordStrengthHint}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm new password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
                placeholder="Re-enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitLoading}
            className="w-full h-12 bg-[#6366F1] text-white rounded-lg font-semibold shadow-sm transition-all duration-200 hover:bg-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6366F1] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitLoading ? 'Saving…' : 'Save password and continue'}
          </button>
        </Form>
      </div>
    </div>
  )
}


