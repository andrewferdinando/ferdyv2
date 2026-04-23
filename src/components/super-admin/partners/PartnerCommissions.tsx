'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch, formatCurrencyCents } from '@/lib/client/auth-fetch'

interface Commission {
  id: string
  stripe_invoice_id: string
  stripe_credit_note_id: string | null
  invoice_paid_at: string
  customer_net_cents: number
  commission_cents: number
  commission_rate: number
  currency: string
  status: string
  payout_id: string | null
  groups?: { name: string } | null
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid_out: 'bg-green-100 text-green-700',
  voided: 'bg-gray-100 text-gray-500',
}

export default function PartnerCommissions({ partnerId }: { partnerId: string }) {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (month) params.set('month', month)
      const res = await authFetch(`/api/super-admin/partners/${partnerId}/commissions?${params.toString()}`)
      const data = await res.json()
      setCommissions(data.commissions ?? [])
    } catch {
      /* handled in UI */
    } finally {
      setLoading(false)
    }
  }, [partnerId, month])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Filter by month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] focus:outline-none"
          />
        </div>
        {month && (
          <button
            onClick={() => setMonth('')}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
        </div>
      ) : commissions.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
          No commission records.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice paid</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Group</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer net</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Commission</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{c.invoice_paid_at.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.groups?.name ?? <span className="text-gray-400">-</span>}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://dashboard.stripe.com/${c.stripe_credit_note_id ? 'credit_notes/' + c.stripe_credit_note_id : 'invoices/' + c.stripe_invoice_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-[#6366F1] hover:underline"
                    >
                      {c.stripe_credit_note_id || c.stripe_invoice_id}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">
                    {formatCurrencyCents(c.customer_net_cents, c.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={c.commission_cents < 0 ? 'text-red-600 font-medium' : 'text-gray-900 font-medium'}>
                      {formatCurrencyCents(c.commission_cents, c.currency)}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                      ({(c.commission_rate * 100).toFixed(0)}%)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-700'}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
