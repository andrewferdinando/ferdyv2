'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Send, Download, ChevronRight } from 'lucide-react'
import { authFetch, formatCurrencyCents } from '@/lib/client/auth-fetch'

interface PayoutRecord {
  id: string
  partner_id: string
  status: 'draft' | 'issued' | 'sent' | 'paid' | 'rolled_forward'
  bcti_number: string
  total_cents: number
  gst_cents: number
  commission_subtotal_cents: number
  period_start: string
  period_end: string
  issued_at: string | null
  sent_at: string | null
  paid_at: string | null
  pdf_storage_path: string | null
}

interface PendingPayoutRow {
  partner_id: string
  full_name: string
  trading_name: string
  email: string
  gst_registered: boolean
  country: string
  partner_status: 'active' | 'paused' | 'terminated'
  commission_count: number
  subtotal_cents: number
  gst_cents: number
  total_cents: number
  meets_threshold: boolean
  payout: PayoutRecord | null
}

function defaultPeriod(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    issued: 'bg-blue-100 text-blue-700',
    sent: 'bg-amber-100 text-amber-700',
    paid: 'bg-green-100 text-green-700',
    rolled_forward: 'bg-gray-100 text-gray-500',
  }
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        map[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

export default function PendingPayoutsTab() {
  const [period, setPeriod] = useState(defaultPeriod())
  const [rows, setRows] = useState<PendingPayoutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyPartnerId, setBusyPartnerId] = useState<string | null>(null)
  const [markPaidTarget, setMarkPaidTarget] = useState<PendingPayoutRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ from: period.start, to: period.end })
      const res = await authFetch(`/api/super-admin/partners/pending-payouts?${params.toString()}`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setRows(data.rows ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [period.start, period.end])

  useEffect(() => {
    load()
  }, [load])

  async function generate(row: PendingPayoutRow) {
    setBusyPartnerId(row.partner_id)
    try {
      const res = await authFetch('/api/super-admin/partners/payouts/generate', {
        method: 'POST',
        body: JSON.stringify({
          partner_id: row.partner_id,
          period_start: period.start,
          period_end: period.end,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || 'Failed to generate BCTI')
        return
      }
      await load()
    } catch {
      alert('Network error')
    } finally {
      setBusyPartnerId(null)
    }
  }

  async function sendBcti(row: PendingPayoutRow) {
    if (!row.payout) return
    if (!confirm(`Send BCTI ${row.payout.bcti_number} to ${row.email}?`)) return
    setBusyPartnerId(row.partner_id)
    try {
      const res = await authFetch(
        `/api/super-admin/partners/payouts/${row.payout.id}/send`,
        { method: 'POST' },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || 'Failed to send BCTI')
        return
      }
      await load()
    } catch {
      alert('Network error')
    } finally {
      setBusyPartnerId(null)
    }
  }

  async function rollForward(row: PendingPayoutRow) {
    if (!confirm(`Roll forward ${formatCurrencyCents(row.subtotal_cents)} into next month?`)) return
    setBusyPartnerId(row.partner_id)
    try {
      const res = await authFetch('/api/super-admin/partners/payouts/roll-forward', {
        method: 'POST',
        body: JSON.stringify({
          partner_id: row.partner_id,
          period_start: period.start,
          period_end: period.end,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || 'Failed')
        return
      }
      await load()
    } catch {
      alert('Network error')
    } finally {
      setBusyPartnerId(null)
    }
  }

  async function downloadPdf(row: PendingPayoutRow) {
    if (!row.payout) return
    try {
      const res = await authFetch(
        `/api/super-admin/partners/payouts/${row.payout.id}/pdf`,
      )
      if (!res.ok) {
        alert('Failed to download PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${row.payout.bcti_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Network error')
    }
  }

  const summary = useMemo(() => {
    const totalReady = rows.filter((r) => r.meets_threshold).reduce((s, r) => s + r.total_cents, 0)
    const underThreshold = rows.filter((r) => !r.meets_threshold).length
    return { totalReady, underThreshold }
  }, [rows])

  return (
    <div className="space-y-4">
      {/* Period picker */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Period start</label>
          <input
            type="date"
            value={period.start}
            onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Period end</label>
          <input
            type="date"
            value={period.end}
            onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] focus:outline-none"
          />
        </div>
        <button
          onClick={() => setPeriod(defaultPeriod())}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Reset to previous month
        </button>
        <div className="ml-auto text-sm text-gray-600">
          <span className="font-medium text-gray-900">{rows.length}</span> partners · ready to pay{' '}
          <span className="font-medium text-gray-900">{formatCurrencyCents(summary.totalReady)}</span>
          {summary.underThreshold > 0 && (
            <span className="text-amber-600 ml-3">
              {summary.underThreshold} under $50 threshold
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-600">No pending commissions in this period.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Partner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Commissions</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Subtotal</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">GST</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const payout = row.payout
                const status = payout?.status ?? 'draft'
                const busy = busyPartnerId === row.partner_id
                return (
                  <tr key={row.partner_id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{row.full_name}</div>
                      <div className="text-xs text-gray-500">
                        {row.trading_name} · {row.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.commission_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {formatCurrencyCents(row.subtotal_cents)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {row.gst_registered ? formatCurrencyCents(row.gst_cents) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      {formatCurrencyCents(row.total_cents)}
                      {!row.meets_threshold && (
                        <div className="text-xs font-normal text-amber-600">Under $50</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {payout ? statusBadge(status) : <span className="text-xs text-gray-400">no payout</span>}
                        {payout?.bcti_number && (
                          <div className="text-xs text-gray-500">{payout.bcti_number}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {payout?.pdf_storage_path && (
                          <button
                            onClick={() => downloadPdf(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Download className="h-3 w-3" /> PDF
                          </button>
                        )}
                        {(!payout || payout.status === 'draft') && (
                          <button
                            onClick={() => generate(row)}
                            disabled={busy || !row.meets_threshold}
                            title={!row.meets_threshold ? 'Under $50 threshold' : ''}
                            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#6366F1] to-[#4F46E5] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                            Generate BCTI
                          </button>
                        )}
                        {payout?.status === 'issued' && (
                          <button
                            onClick={() => sendBcti(row)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#6366F1] to-[#4F46E5] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Send to Partner
                          </button>
                        )}
                        {payout?.status === 'sent' && (
                          <>
                            <button
                              onClick={() => sendBcti(row)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => setMarkPaidTarget(row)}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-600 hover:bg-green-700 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              <Check className="h-3 w-3" />
                              Mark Paid
                            </button>
                          </>
                        )}
                        {!payout && !row.meets_threshold && (
                          <button
                            onClick={() => rollForward(row)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Roll forward
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {markPaidTarget?.payout && (
        <MarkPaidModal
          row={markPaidTarget}
          onClose={() => setMarkPaidTarget(null)}
          onDone={() => {
            setMarkPaidTarget(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function MarkPaidModal({
  row,
  onClose,
  onDone,
}: {
  row: PendingPayoutRow
  onClose: () => void
  onDone: () => void
}) {
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [paymentReference, setPaymentReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!row.payout) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await authFetch(
        `/api/super-admin/partners/payouts/${row.payout.id}/mark-paid`,
        {
          method: 'POST',
          body: JSON.stringify({ paid_at: paidAt, payment_reference: paymentReference }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to mark paid')
        return
      }
      onDone()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Mark as paid</h3>
        <p className="text-sm text-gray-600 mb-4">
          {row.payout?.bcti_number} · {formatCurrencyCents(row.total_cents)} to {row.full_name}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paid at *</label>
            <input
              type="date"
              required
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment reference</label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g. ANZ-20260501-0012"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] focus:outline-none"
            />
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
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Check className="h-4 w-4" />
              Mark paid
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
