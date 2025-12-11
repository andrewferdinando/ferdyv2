'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Form } from '@/components/ui/Form'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'An error occurred. Please try again.')
        return
      }

      setSuccess(true)
      setEmail('')
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="mt-8 space-y-6">
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
              <p className="font-medium mb-2">Check your email!</p>
              <p className="text-sm">
                If an account exists with that email, you will receive a password reset link shortly.
              </p>
            </div>
            <div className="text-center">
              <a
                href="/auth/sign-in"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Back to sign in
              </a>
            </div>
          </div>
        ) : (
          <Form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

              <div className="text-center">
                <a
                  href="/auth/sign-in"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Back to sign in
                </a>
              </div>
            </div>
          </Form>
        )}
      </div>
    </div>
  )
}
