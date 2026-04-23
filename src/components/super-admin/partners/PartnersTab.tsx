'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { authFetch, formatCurrencyCents } from '@/lib/client/auth-fetch'

interface PartnerRow {
  id: string
  status: 'active' | 'paused' | 'terminated'
  full_name: string
  email: string
  country: string
  trading_name: string
  entity_type: string
  gst_registered: boolean
  discount_code_display: string | null
  created_at: string
  active_sales_count: number
  ytd_commission_cents: number
  unpaid_balance_cents: number
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-amber-100 text-amber-700',
    terminated: 'bg-red-100 text-red-700',
  }
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        map[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {status}
    </span>
  )
}

export default function PartnersTab() {
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/super-admin/partners')
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setPartners(data.partners ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    )
  }

  if (partners.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No partners yet</h3>
        <p className="text-sm text-gray-600">
          Partners who register through the /partners page will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Country</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Active sales</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">YTD commission</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Unpaid balance</th>
          </tr>
        </thead>
        <tbody>
          {partners.map((p) => (
            <tr
              key={p.id}
              className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-3">
                <Link href={`/super-admin/partners/${p.id}`} className="text-sm font-medium text-[#6366F1] hover:underline">
                  {p.full_name}
                </Link>
                <div className="text-xs text-gray-500">{p.email}</div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {p.trading_name}
                <div className="text-xs text-gray-500">{p.entity_type}</div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">{p.country}</td>
              <td className="px-4 py-3">{statusBadge(p.status)}</td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">{p.active_sales_count}</td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatCurrencyCents(p.ytd_commission_cents)}</td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                {p.unpaid_balance_cents > 0 ? (
                  <span className="font-medium text-gray-900">{formatCurrencyCents(p.unpaid_balance_cents)}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
