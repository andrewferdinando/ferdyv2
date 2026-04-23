'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, ArrowRight, Check, ChevronDown, Search, X, Loader2 } from 'lucide-react'
import { authFetch } from '@/lib/client/auth-fetch'

type EnquiryStatus = 'new' | 'in_progress' | 'converted' | 'expired' | 'lost'

interface Enquiry {
  id: string
  partner_id: string
  enquiry_date: string
  prospect_company: string
  prospect_contact_name: string
  prospect_email: string | null
  status: EnquiryStatus
  group_id: string | null
  converted_at: string | null
  expires_at: string
  notes: string | null
  created_at: string
  partners?: { full_name: string; trading_name: string } | null
  groups?: { name: string } | null
}

interface Partner {
  id: string
  full_name: string
  trading_name: string
}

interface Group {
  id: string
  name: string
  partner_enquiry_id: string | null
  subscription_status: string | null
}

const statusColors: Record<EnquiryStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  converted: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  lost: 'bg-red-100 text-red-700',
}

export default function EnquiriesTab() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showAdd, setShowAdd] = useState(false)
  const [convertTarget, setConvertTarget] = useState<Enquiry | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await authFetch(`/api/super-admin/partners/enquiries?${params.toString()}`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setEnquiries(data.enquiries ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  async function updateStatus(id: string, status: EnquiryStatus) {
    try {
      const res = await authFetch(`/api/super-admin/partners/enquiries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to update')
        return
      }
      await load()
    } catch {
      alert('Network error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 pl-3 pr-10 py-2 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] focus:outline-none appearance-none cursor-pointer bg-white"
          >
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="converted">Converted</option>
            <option value="expired">Expired</option>
            <option value="lost">Lost</option>
          </select>
          <SelectChevron />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#4F46E5] hover:to-[#4338CA] px-3 py-2 text-sm font-semibold text-white transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Enquiry
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
      ) : enquiries.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-600">No enquiries match the current filter.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prospect</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Partner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Group</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Expires</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{e.enquiry_date}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">{e.prospect_company}</div>
                    <div className="text-xs text-gray-500">
                      {e.prospect_contact_name}
                      {e.prospect_email ? ` · ${e.prospect_email}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{e.partners?.full_name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[e.status]}`}>
                      {e.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {e.groups?.name ?? <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{e.expires_at}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      {e.status !== 'converted' && (
                        <button
                          type="button"
                          onClick={() => setConvertTarget(e)}
                          className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-[#6366F1] to-[#4F46E5] px-2.5 py-1 text-xs font-semibold text-white hover:from-[#4F46E5] hover:to-[#4338CA]"
                        >
                          Convert to Sale
                        </button>
                      )}
                      {e.status !== 'converted' && (
                        <div className="relative">
                          <select
                            aria-label="Change status"
                            value={e.status}
                            onChange={(ev) => updateStatus(e.id, ev.target.value as EnquiryStatus)}
                            className="rounded-md border border-gray-300 pl-2 pr-7 py-1 text-xs font-medium text-gray-700 focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] focus:outline-none appearance-none cursor-pointer bg-white"
                          >
                            <option value="new">New</option>
                            <option value="in_progress">In progress</option>
                            <option value="expired">Expired</option>
                            <option value="lost">Lost</option>
                          </select>
                          <ChevronDown
                            aria-hidden
                            className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddEnquiryModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false)
            load()
          }}
        />
      )}

      {convertTarget && (
        <ConvertEnquiryModal
          enquiry={convertTarget}
          onClose={() => setConvertTarget(null)}
          onConverted={() => {
            setConvertTarget(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function AddEnquiryModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [partners, setPartners] = useState<Partner[]>([])
  const [partnerId, setPartnerId] = useState('')
  const [prospectCompany, setProspectCompany] = useState('')
  const [prospectContactName, setProspectContactName] = useState('')
  const [prospectEmail, setProspectEmail] = useState('')
  const [enquiryDate, setEnquiryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await authFetch('/api/super-admin/partners')
        const data = await res.json()
        setPartners((data.partners ?? []).filter((p: any) => p.status === 'active'))
      } catch {
        /* ignore */
      }
    })()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await authFetch('/api/super-admin/partners/enquiries', {
        method: 'POST',
        body: JSON.stringify({
          partner_id: partnerId,
          enquiry_date: enquiryDate,
          prospect_company: prospectCompany,
          prospect_contact_name: prospectContactName,
          prospect_email: prospectEmail.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to create')
        return
      }
      onCreated()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell title="Add enquiry" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Partner *">
          <div className="relative">
            <select
              required
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className={`${inputStyles} pr-10 appearance-none cursor-pointer bg-white`}
            >
              <option value="">Select a partner…</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} - {p.trading_name}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </Field>
        <Field label="Enquiry date *">
          <input
            type="date"
            required
            value={enquiryDate}
            onChange={(e) => setEnquiryDate(e.target.value)}
            className={inputStyles}
          />
        </Field>
        <Field label="Prospect company *">
          <input
            type="text"
            required
            value={prospectCompany}
            onChange={(e) => setProspectCompany(e.target.value)}
            className={inputStyles}
          />
        </Field>
        <Field label="Prospect contact name *">
          <input
            type="text"
            required
            value={prospectContactName}
            onChange={(e) => setProspectContactName(e.target.value)}
            className={inputStyles}
          />
        </Field>
        <Field label="Prospect email">
          <input
            type="email"
            value={prospectEmail}
            onChange={(e) => setProspectEmail(e.target.value)}
            className={inputStyles}
          />
        </Field>
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={inputStyles}
          />
        </Field>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !partnerId}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#6366F1] to-[#4F46E5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function ConvertEnquiryModal({
  enquiry,
  onClose,
  onConverted,
}: {
  enquiry: Enquiry
  onClose: () => void
  onConverted: () => void
}) {
  const [groups, setGroups] = useState<Group[]>([])
  const [q, setQ] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      const res = await authFetch(`/api/super-admin/partners/groups?${params.toString()}`)
      const data = await res.json()
      setGroups(data.groups ?? [])
    } catch {
      /* ignore */
    }
  }, [q])

  useEffect(() => {
    search()
  }, [search])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGroupId) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await authFetch(
        `/api/super-admin/partners/enquiries/${enquiry.id}/convert`,
        {
          method: 'POST',
          body: JSON.stringify({ group_id: selectedGroupId }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to convert')
        return
      }
      onConverted()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell title={`Convert to sale: ${enquiry.prospect_company}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Pick the group that signed up. Only groups with an active subscription are shown.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Search groups</label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type a group name…"
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">Select group</label>
            <span className="text-xs text-gray-500">
              {groups.length} {groups.length === 1 ? 'match' : 'matches'}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {groups.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No active groups match your search.
              </div>
            ) : (
              groups.map((g) => {
                const alreadyAttributed = !!g.partner_enquiry_id && g.partner_enquiry_id !== enquiry.id
                const isSelected = selectedGroupId === g.id
                return (
                  <button
                    type="button"
                    key={g.id}
                    disabled={alreadyAttributed}
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      alreadyAttributed
                        ? 'opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#EEF2FF]'
                        : 'hover:bg-gray-50'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                        isSelected ? 'bg-[#6366F1] border-[#6366F1]' : 'bg-white border-gray-300'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">{g.name}</div>
                      <div className="text-xs text-gray-500">
                        {g.subscription_status ?? 'no subscription'}
                        {alreadyAttributed && ' · already attributed to another partner'}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !selectedGroupId}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#6366F1] to-[#4F46E5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Convert
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputStyles =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] focus:outline-none'

function SelectChevron() {
  return (
    <ChevronDown
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
    />
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
