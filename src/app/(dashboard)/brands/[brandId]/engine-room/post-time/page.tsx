'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { supabase } from '@/lib/supabase-browser'
import { useBrandPostSettings } from '@/hooks/useBrandPostSettings'

export default function EngineRoomPostTimePage() {
  const params = useParams()
  const brandId = params.brandId as string

  const { defaultPostTime: defaultPostTimeFromHook, isLoading: settingsLoading } = useBrandPostSettings(brandId)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [defaultPostTime, setDefaultPostTime] = useState('10:00') // Local state for form input

  useEffect(() => {
    if (!settingsLoading) {
      // Sync local state with hook value (hook ensures this is always non-null with fallback)
      setDefaultPostTime(defaultPostTimeFromHook)
      setLoading(false)
    }
  }, [settingsLoading, defaultPostTimeFromHook])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const timeValue = defaultPostTime && defaultPostTime !== '10:00' ? `${defaultPostTime}:00` : (defaultPostTime === '10:00' ? '10:00:00' : null)
      
      // Upsert into brand_post_information with onConflict: 'brand_id'
      const { error: updateError } = await supabase
        .from('brand_post_information')
        .upsert(
          {
            brand_id: brandId,
            default_post_time: timeValue,
          },
          {
            onConflict: 'brand_id',
          }
        )

      if (updateError) throw updateError

      setSuccess('Default post time updated successfully.')
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
                      placeholder="10:00"
                    />
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">
                      Automatically sets a default time for posts within new Categories. You can override the time for individual Categories by editing the category. Leave this blank to remove the default. Any new Categories will inherit the time set here.
                    </p>
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

              {/* Best Times to Post Guide */}
              <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Best Times to Post on Social Media (by Industry)</h2>
                <p className="text-sm text-gray-600 mb-4">
                  All times shown are local time. These are averages based on large datasets, not guarantees.
                </p>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best Days</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best Time Windows</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Retail & Ecommerce</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Tue–Thu</td>
                        <td className="px-4 py-3 text-sm text-gray-600">9am–11am, 1pm–3pm</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Strong engagement during browsing & lunch breaks</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Hospitality (Cafes, Restaurants, Bars)</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Wed–Sun</td>
                        <td className="px-4 py-3 text-sm text-gray-600">11am–1pm, 5pm–7pm</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Meal decision windows perform best</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Health & Fitness</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Mon–Fri</td>
                        <td className="px-4 py-3 text-sm text-gray-600">6am–8am, 6pm–8pm</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Before & after work workouts</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Professional Services (B2B)</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Tue–Thu</td>
                        <td className="px-4 py-3 text-sm text-gray-600">8am–10am, 12pm–1pm</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Avoid late afternoons</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Education & Training</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Tue–Thu</td>
                        <td className="px-4 py-3 text-sm text-gray-600">9am–12pm</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Parents & professionals browsing mid-morning</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Technology & SaaS</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Tue–Wed</td>
                        <td className="px-4 py-3 text-sm text-gray-600">9am–11am</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Early-week intent is strongest</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Entertainment & Events</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Thu–Sun</td>
                        <td className="px-4 py-3 text-sm text-gray-600">6pm–9pm</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Planning leisure time</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Real Estate</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Tue–Thu</td>
                        <td className="px-4 py-3 text-sm text-gray-600">8am–10am, 6pm–8pm</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Commute & evening browsing</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Non-Profit & Community</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Tue–Thu</td>
                        <td className="px-4 py-3 text-sm text-gray-600">9am–12pm</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Story-led content performs best</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Travel & Tourism</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Wed–Fri</td>
                        <td className="px-4 py-3 text-sm text-gray-600">12pm–2pm, 7pm–9pm</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Dreaming & planning windows</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attribution Box */}
              <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Data Sources</h3>
                <p className="text-xs leading-relaxed text-blue-800">
                  Based on aggregated insights from Sprout Social, Hootsuite, HubSpot, Buffer, and Later, summarised by AI to highlight typical high-engagement posting windows by industry.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}

