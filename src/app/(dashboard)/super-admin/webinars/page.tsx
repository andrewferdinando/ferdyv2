'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/lib/supabase-browser'

interface Webinar {
  id: string
  slug: string
  name: string
  headline: string
  sub_headline: string
  niche: string
  location: string
  date_label: string
  datetime: string
  duration_minutes: number
  zoom_url: string
  spots: number
  host_name: string
  host_bio: string
  what_you_will_learn: string[]
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  attendance_count: number | null
  onboarding_booked_count: number | null
  registration_count: number
  reminder_2day_sent_at: string | null
  reminder_1day_sent_at: string | null
  reminder_1hour_sent_at: string | null
  created_at: string
  updated_at: string
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  completed: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Completed' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
}

const DEFAULT_HOST_BIO =
  'Founder of Ferdy and Marketing Advisor across NZ & Aus. I help companies save time and become more efficient by using AI and marketing automations.'

export default function WebinarsPage() {
  const [webinars, setWebinars] = useState<Webinar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: '',
    headline: '',
    sub_headline: '',
    niche: 'hospo',
    location: '',
    date_label: '',
    datetime: '',
    duration_minutes: '60',
    zoom_url: '',
    spots: '50',
    host_name: 'Andrew',
    host_bio: DEFAULT_HOST_BIO,
    what_you_will_learn: '',
  })

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }, [])

  const fetchWebinars = useCallback(async () => {
    const token = await getToken()
    if (!token) return

    const res = await fetch('/api/super-admin/webinars', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      setError('Failed to load webinars')
      setLoading(false)
      return
    }

    const data = await res.json()
    setWebinars(data.webinars || [])
    setLoading(false)
  }, [getToken])

  useEffect(() => {
    fetchWebinars()
  }, [fetchWebinars])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const token = await getToken()
    if (!token) return

    const res = await fetch('/api/super-admin/webinars', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...form,
        duration_minutes: parseInt(form.duration_minutes) || 60,
        spots: parseInt(form.spots) || 50,
        what_you_will_learn: form.what_you_will_learn
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create webinar')
      setSaving(false)
      return
    }

    setShowForm(false)
    setForm({
      name: '',
      headline: '',
      sub_headline: '',
      niche: 'hospo',
      location: '',
      date_label: '',
      datetime: '',
      duration_minutes: '60',
      zoom_url: '',
      spots: '50',
      host_name: 'Andrew',
      host_bio: DEFAULT_HOST_BIO,
      what_you_will_learn: '',
    })
    setSaving(false)
    fetchWebinars()
  }

  async function updateWebinar(id: string, updates: Record<string, unknown>) {
    const token = await getToken()
    if (!token) return

    await fetch('/api/super-admin/webinars', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...updates }),
    })

    fetchWebinars()
  }

  function copyUrl(slug: string) {
    const url = `${window.location.origin}/webinar/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  function pct(a: number | null, b: number): string {
    if (!a || !b) return '-'
    return `${Math.round((a / b) * 100)}%`
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-[1.2] text-gray-950 sm:text-3xl lg:text-[32px]">
                Webinars
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create and manage webinar landing pages
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5558E6]"
            >
              {showForm ? 'Cancel' : '+ New Webinar'}
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-10">
          <div className="mx-auto max-w-5xl">
            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Create Form */}
            {showForm && (
              <form
                onSubmit={handleCreate}
                className="mb-8 rounded-xl border border-gray-200 bg-white p-6"
              >
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Create New Webinar
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Name *
                    </label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="The Ferdy System: Melbourne"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Headline *
                    </label>
                    <input
                      required
                      value={form.headline}
                      onChange={(e) => setForm({ ...form, headline: e.target.value })}
                      placeholder="How to Put Your Venue's Social Media on Autopilot"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Sub-headline
                    </label>
                    <input
                      value={form.sub_headline}
                      onChange={(e) =>
                        setForm({ ...form, sub_headline: e.target.value })
                      }
                      placeholder="Stop spending hours on content..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Niche
                    </label>
                    <input
                      value={form.niche}
                      onChange={(e) => setForm({ ...form, niche: e.target.value })}
                      placeholder="hospo"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="sydney"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Date Label * (shown on page)
                    </label>
                    <input
                      required
                      value={form.date_label}
                      onChange={(e) =>
                        setForm({ ...form, date_label: e.target.value })
                      }
                      placeholder="Tuesday, 21 April - 10am AEST - 30 mins + Q&A"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Date & Time * (actual event time)
                    </label>
                    <input
                      required
                      type="datetime-local"
                      value={form.datetime}
                      onChange={(e) => setForm({ ...form, datetime: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={form.duration_minutes}
                      onChange={(e) =>
                        setForm({ ...form, duration_minutes: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Zoom URL
                    </label>
                    <input
                      value={form.zoom_url}
                      onChange={(e) => setForm({ ...form, zoom_url: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Spots
                    </label>
                    <input
                      type="number"
                      value={form.spots}
                      onChange={(e) => setForm({ ...form, spots: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Host Name
                    </label>
                    <input
                      value={form.host_name}
                      onChange={(e) =>
                        setForm({ ...form, host_name: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Host Bio
                    </label>
                    <textarea
                      value={form.host_bio}
                      onChange={(e) => setForm({ ...form, host_bio: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      What You'll Learn (one per line)
                    </label>
                    <textarea
                      value={form.what_you_will_learn}
                      onChange={(e) =>
                        setForm({ ...form, what_you_will_learn: e.target.value })
                      }
                      rows={3}
                      placeholder={
                        'Intro to the Ferdy system\nLive demo for your niche'
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[#6366F1] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#5558E6] disabled:opacity-50"
                  >
                    {saving ? 'Creating...' : 'Create Webinar'}
                  </button>
                </div>
              </form>
            )}

            {/* Webinar List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
              </div>
            ) : webinars.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <p className="text-gray-500">No webinars yet. Create your first one above.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {webinars.map((w) => {
                  const badge = STATUS_BADGES[w.status] || STATUS_BADGES.draft
                  return (
                    <div
                      key={w.id}
                      className="rounded-xl border border-gray-200 bg-white p-6"
                    >
                      {/* Top row: name + status + URL */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {w.name}
                            </h3>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {w.date_label}
                          </p>
                        </div>
                        <button
                          onClick={() => copyUrl(w.slug)}
                          className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                          {copiedSlug === w.slug ? 'Copied!' : 'Copy Landing Page URL'}
                        </button>
                      </div>

                      {/* Stats row */}
                      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {w.registration_count}
                          </p>
                          <p className="text-xs text-gray-500">Registrations</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                          <EditableMetric
                            value={w.attendance_count}
                            label="Attended"
                            onSave={(val) =>
                              updateWebinar(w.id, { attendance_count: val })
                            }
                          />
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                          <EditableMetric
                            value={w.onboarding_booked_count}
                            label="Onboarding Booked"
                            onSave={(val) =>
                              updateWebinar(w.id, {
                                onboarding_booked_count: val,
                              })
                            }
                          />
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {pct(w.attendance_count, w.registration_count)}
                          </p>
                          <p className="text-xs text-gray-500">Show-up Rate</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {pct(w.onboarding_booked_count, w.attendance_count ?? 0)}
                          </p>
                          <p className="text-xs text-gray-500">Booking Rate</p>
                        </div>
                      </div>

                      {/* Reminder status */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <ReminderBadge label="2-day" sentAt={w.reminder_2day_sent_at} />
                        <ReminderBadge label="1-day" sentAt={w.reminder_1day_sent_at} />
                        <ReminderBadge label="1-hour" sentAt={w.reminder_1hour_sent_at} />
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                        {w.status === 'draft' && (
                          <button
                            onClick={() =>
                              updateWebinar(w.id, { status: 'active' })
                            }
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700"
                          >
                            Activate
                          </button>
                        )}
                        {w.status === 'active' && (
                          <button
                            onClick={() =>
                              updateWebinar(w.id, { status: 'completed' })
                            }
                            className="rounded-lg bg-[#6366F1] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#5558E6]"
                          >
                            Mark Completed
                          </button>
                        )}
                        {(w.status === 'draft' || w.status === 'active') && (
                          <button
                            onClick={() =>
                              updateWebinar(w.id, { status: 'cancelled' })
                            }
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        )}
                        {(w.status === 'completed' || w.status === 'cancelled') && (
                          <button
                            onClick={() =>
                              updateWebinar(w.id, { status: 'draft' })
                            }
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                          >
                            Revert to Draft
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

// --- Sub-components ---

function EditableMetric({
  value,
  label,
  onSave,
}: {
  value: number | null
  label: string
  onSave: (val: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))

  if (editing) {
    return (
      <div>
        <input
          autoFocus
          type="number"
          min="0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const num = parseInt(draft)
            if (!isNaN(num) && num >= 0) onSave(num)
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const num = parseInt(draft)
              if (!isNaN(num) && num >= 0) onSave(num)
              setEditing(false)
            }
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-20 rounded border border-[#6366F1] px-2 py-1 text-center text-lg font-bold focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
        />
        <p className="mt-1 text-xs text-gray-500">{label}</p>
      </div>
    )
  }

  return (
    <div
      className="cursor-pointer transition hover:bg-gray-100 rounded-lg"
      onClick={() => {
        setDraft(String(value ?? ''))
        setEditing(true)
      }}
      title="Click to edit"
    >
      <p className="text-2xl font-bold text-gray-900">
        {value ?? <span className="text-gray-300">-</span>}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function ReminderBadge({
  label,
  sentAt,
}: {
  label: string
  sentAt: string | null
}) {
  if (sentAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {label} reminder sent
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
      {label} reminder pending
    </span>
  )
}
