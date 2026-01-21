'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { supabase } from '@/lib/supabase-browser'
import { useBrandPostSettings, CopyLength } from '@/hooks/useBrandPostSettings'

export default function EngineRoomCopyLengthPage() {
  const params = useParams()
  const brandId = params.brandId as string

  const { defaultCopyLength: defaultCopyLengthFromHook, isLoading: settingsLoading } = useBrandPostSettings(brandId)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [defaultCopyLength, setDefaultCopyLength] = useState<CopyLength>('medium') // Fallback to medium

  useEffect(() => {
    if (!settingsLoading) {
      // Use the value from hook, or fallback to medium
      setDefaultCopyLength(defaultCopyLengthFromHook)
      setLoading(false)
    }
  }, [settingsLoading, defaultCopyLengthFromHook])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Upsert into brand_post_information with onConflict: 'brand_id'
      const { error: updateError } = await supabase
        .from('brand_post_information')
        .upsert(
          {
            brand_id: brandId,
            default_copy_length: defaultCopyLength,
          },
          {
            onConflict: 'brand_id',
          }
        )

      if (updateError) throw updateError

      setSuccess('Default copy length updated successfully.')
      setTimeout(() => setSuccess(''), 2500)
    } catch (submitError) {
      console.error('EngineRoomCopyLengthPage: error updating default copy length', submitError)
      setError('Unable to update the default copy length. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex-1 flex items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-indigo-600" />
          </div>
        </AppLayout>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold leading-[1.2] text-gray-950">
              Default Copy Length
            </h1>
          </div>

          <div className="p-4 sm:p-6 lg:p-10">
            <div className="mx-auto max-w-3xl">
              <form
                onSubmit={handleSubmit}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                {error && (
                  <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-600">
                    {success}
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Default copy length
                    </label>
                    <div className="mt-2 space-y-3">
                      {([
                        { value: 'short', label: 'Short', description: '1 sentence' },
                        { value: 'medium', label: 'Medium', description: '3–5 sentences' },
                        { value: 'long', label: 'Long', description: '6–8 sentences' },
                      ] as const).map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            defaultCopyLength === option.value
                              ? 'border-[#6366F1] bg-[#EEF2FF]'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="copyLength"
                            value={option.value}
                            checked={defaultCopyLength === option.value}
                            onChange={(e) => setDefaultCopyLength(e.target.value as CopyLength)}
                            className="mt-0.5 w-4 h-4 text-[#6366F1] focus:ring-[#6366F1] focus:ring-2"
                          />
                          <div className="ml-3">
                            <span className="text-sm font-medium text-gray-900">
                              {option.label}
                            </span>
                            <span className="ml-2 text-sm text-gray-500">
                              — {option.description}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end border-t border-gray-200 pt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-gradient-to-r from-[#6366F1] to-[#4F46E5] px-6 py-2 text-sm font-semibold text-white transition hover:from-[#4F46E5] hover:to-[#4338CA] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>

              <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">How It Works</h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  This copy length auto-populates new categories so your automation stays consistent. You can still override the
                  copy length for individual categories when needed.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  Changing this default only affects new categories created after you save. Existing categories keep their current
                  copy length settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}

