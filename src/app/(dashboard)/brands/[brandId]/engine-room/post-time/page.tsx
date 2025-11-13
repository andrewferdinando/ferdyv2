'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { supabase } from '@/lib/supabase-browser'
import { Brand } from '@/hooks/useBrands'

export default function EngineRoomPostTimePage() {
  const params = useParams()
  const brandId = params.brandId as string

  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [defaultPostTime, setDefaultPostTime] = useState('')

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const { data, error } = await supabase.from('brands').select('*').eq('id', brandId).single()
        if (error) throw error

        setBrand(data)

        if (data.default_post_time) {
          const timeStr =
            typeof data.default_post_time === 'string'
              ? data.default_post_time.substring(0, 5)
              : ''
          setDefaultPostTime(timeStr)
        } else {
          setDefaultPostTime('')
        }
      } catch (fetchError) {
        console.error('EngineRoomPostTimePage: error fetching brand', fetchError)
        setError('Failed to load default post time.')
      } finally {
        setLoading(false)
      }
    }

    fetchBrand()
  }, [brandId])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const timeValue = defaultPostTime ? `${defaultPostTime}:00` : null
      const { error: updateError } = await supabase
        .from('brands')
        .update({ default_post_time: timeValue })
        .eq('id', brandId)

      if (updateError) throw updateError

      setSuccess('Default post time updated successfully.')
      if (brand) {
        setBrand({
          ...brand,
          default_post_time: timeValue,
        })
      }
      setTimeout(() => setSuccess(''), 2500)
    } catch (submitError) {
      console.error('EngineRoomPostTimePage: error updating default post time', submitError)
      setError('Unable to update the default post time. Please try again.')
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

  if (!brand) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-red-600">
              <p className="text-lg font-semibold">Unable to load brand details</p>
              <p className="text-sm">Refresh the page or try again later.</p>
            </div>
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
              Default Post Time
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
                      Default post time
                    </label>
                    <input
                      type="time"
                      step="60"
                      value={defaultPostTime}
                      onChange={(event) => setDefaultPostTime(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm transition focus:border-transparent focus:ring-2 focus:ring-[#6366F1]"
                    />
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
                  This time auto-populates new subcategories so your automation stays consistent. You can still override the
                  time for individual subcategories when needed.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  Leave the field blank to remove the default. New subcategories created afterwards will inherit whatever time
                  you set here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}

