'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/client/auth-fetch'

interface Enquiry {
  id: string
  enquiry_date: string
  prospect_company: string
  prospect_contact_name: string
  prospect_email: string | null
  status: string
  group_id: string | null
  converted_at: string | null
  expires_at: string
  notes: string | null
  groups?: { name: string } | null
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  converted: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  lost: 'bg-red-100 text-red-700',
}

export default function PartnerEnquiries({ partnerId }: { partnerId: string }) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/super-admin/partners/${partnerId}/enquiries`)
      const data = await res.json()
      setEnquiries(data.enquiries ?? [])
    } catch {
      /* handled in UI */
    } finally {
      setLoading(false)
    }
  }, [partnerId])

  useEffect(() => {
    load()
  }, [load])

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
        This partner hasn&rsquo;t made any enquiries yet.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prospect</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Group</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Expires</th>
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
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[e.status] || 'bg-gray-100 text-gray-700'}`}>
                  {e.status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">{e.groups?.name ?? <span className="text-gray-400">-</span>}</td>
              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{e.expires_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
