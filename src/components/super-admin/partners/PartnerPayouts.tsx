'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { authFetch, formatCurrencyCents } from '@/lib/client/auth-fetch'

interface Payout {
  id: string
  bcti_number: string
  status: string
  period_start: string
  period_end: string
  commission_subtotal_cents: number
  gst_cents: number
  total_cents: number
  issued_at: string | null
  sent_at: string | null
  sent_to_email: string | null
  paid_at: string | null
  payment_reference: string | null
  pdf_storage_path: string | null
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  issued: 'bg-blue-100 text-blue-700',
  sent: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  rolled_forward: 'bg-gray-100 text-gray-500',
}

export default function PartnerPayouts({ partnerId }: { partnerId: string }) {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/super-admin/partners/${partnerId}/payouts`)
      const data = await res.json()
      setPayouts(data.payouts ?? [])
    } catch {
      /* handled in UI */
    } finally {
      setLoading(false)
    }
  }, [partnerId])

  useEffect(() => {
    load()
  }, [load])

  async function downloadPdf(id: string, bctiNumber: string) {
    try {
      const res = await authFetch(`/api/super-admin/partners/payouts/${id}/pdf`)
      if (!res.ok) {
        alert('Failed to download PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${bctiNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Network error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
      </div>
    )
  }

  if (payouts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
        No payouts issued yet.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">BCTI</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Period</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sent</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Paid</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-mono text-gray-900">{p.bcti_number}</td>
              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                {p.period_start} → {p.period_end}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                {formatCurrencyCents(p.total_cents)}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status] || 'bg-gray-100 text-gray-700'}`}>
                  {p.status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {p.sent_at ? (
                  <>
                    {p.sent_at.slice(0, 10)}
                    {p.sent_to_email && <div className="text-xs">{p.sent_to_email}</div>}
                  </>
                ) : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {p.paid_at ? (
                  <>
                    {p.paid_at.slice(0, 10)}
                    {p.payment_reference && <div className="text-xs">{p.payment_reference}</div>}
                  </>
                ) : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                {p.pdf_storage_path && (
                  <button
                    onClick={() => downloadPdf(p.id, p.bcti_number)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-3 w-3" /> PDF
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
