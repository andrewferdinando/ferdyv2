'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { authFetch, formatCurrencyCents } from '@/lib/client/auth-fetch'

interface Enquiry {
  id: string
  prospect_company: string
  converted_at: string | null
  group_id: string | null
  groups?: { name: string } | null
}

interface Commission {
  id: string
  commission_cents: number
  status: string
  invoice_paid_at: string
  group_id: string
}

export default function PartnerSales({ partnerId }: { partnerId: string }) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [enqRes, commRes] = await Promise.all([
        authFetch(`/api/super-admin/partners/${partnerId}/enquiries`),
        authFetch(`/api/super-admin/partners/${partnerId}/commissions`),
      ])
      const enqData = await enqRes.json()
      const commData = await commRes.json()
      setEnquiries((enqData.enquiries ?? []).filter((e: Enquiry) => e.converted_at))
      setCommissions(commData.commissions ?? [])
    } catch {
      /* handled in UI */
    } finally {
      setLoading(false)
    }
  }, [partnerId])

  useEffect(() => {
    load()
  }, [load])

  const byGroup = useMemo(() => {
    const map = new Map<string, { total: number; latest: string | null }>()
    for (const c of commissions) {
      if (c.status === 'voided') continue
      const entry = map.get(c.group_id) ?? { total: 0, latest: null }
      entry.total += c.commission_cents
      if (!entry.latest || c.invoice_paid_at > entry.latest) entry.latest = c.invoice_paid_at
      map.set(c.group_id, entry)
    }
    return map
  }, [commissions])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
      </div>
    )
  }

  if (enquiries.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
        No converted sales for this partner yet.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prospect</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Group</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Converted</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Lifetime commission</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Latest invoice</th>
          </tr>
        </thead>
        <tbody>
          {enquiries.map((e) => {
            const stats = e.group_id ? byGroup.get(e.group_id) : null
            return (
              <tr key={e.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.prospect_company}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{e.groups?.name ?? <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{e.converted_at?.slice(0, 10) ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-right">
                  {stats ? formatCurrencyCents(stats.total) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{stats?.latest?.slice(0, 10) ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
