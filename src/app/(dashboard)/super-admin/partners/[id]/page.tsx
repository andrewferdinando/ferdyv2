'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { authFetch } from '@/lib/client/auth-fetch'
import PartnerProfile from '@/components/super-admin/partners/PartnerProfile'
import PartnerEnquiries from '@/components/super-admin/partners/PartnerEnquiries'
import PartnerSales from '@/components/super-admin/partners/PartnerSales'
import PartnerCommissions from '@/components/super-admin/partners/PartnerCommissions'
import PartnerPayouts from '@/components/super-admin/partners/PartnerPayouts'

type SubTab = 'profile' | 'enquiries' | 'sales' | 'commissions' | 'payouts'

const subTabs: { id: SubTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'enquiries', label: 'Enquiries' },
  { id: 'sales', label: 'Sales' },
  { id: 'commissions', label: 'Commissions' },
  { id: 'payouts', label: 'Payouts' },
]

export interface PartnerDetail {
  id: string
  status: 'active' | 'paused' | 'terminated'
  full_name: string
  email: string
  phone: string | null
  country: string
  trading_name: string
  entity_type: string
  company_number: string | null
  business_address: string
  gst_registered: boolean
  gst_number: string | null
  bank_account_name: string
  bank_account_number: string | null
  wise_email: string | null
  tcs_accepted_at: string
  stripe_promotion_code_id: string | null
  discount_code_display: string | null
  discount_code_notes: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export default function PartnerDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [partner, setPartner] = useState<PartnerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SubTab>('profile')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/super-admin/partners/${id}`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setPartner(data.partner)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <Link
            href="/super-admin/partners"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            All partners
          </Link>
          <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">
            {partner?.full_name ?? 'Partner'}
          </h1>
          {partner && (
            <p className="mt-1 text-sm text-gray-600">
              {partner.trading_name} · {partner.email}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
          </div>
        ) : error || !partner ? (
          <div className="p-6">
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
              {error || 'Partner not found'}
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10">
              <nav className="flex gap-6 overflow-x-auto">
                {subTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-[#6366F1] border-[#6366F1]'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-4 sm:p-6 lg:p-10">
              {activeTab === 'profile' && (
                <PartnerProfile partner={partner} onUpdated={load} />
              )}
              {activeTab === 'enquiries' && <PartnerEnquiries partnerId={partner.id} />}
              {activeTab === 'sales' && <PartnerSales partnerId={partner.id} />}
              {activeTab === 'commissions' && <PartnerCommissions partnerId={partner.id} />}
              {activeTab === 'payouts' && <PartnerPayouts partnerId={partner.id} />}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
