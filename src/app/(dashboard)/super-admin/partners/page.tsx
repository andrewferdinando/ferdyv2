'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import PartnersTab from '@/components/super-admin/partners/PartnersTab'
import EnquiriesTab from '@/components/super-admin/partners/EnquiriesTab'
import PendingPayoutsTab from '@/components/super-admin/partners/PendingPayoutsTab'

type Tab = 'partners' | 'enquiries' | 'payouts'

const tabs: { id: Tab; label: string }[] = [
  { id: 'partners', label: 'Partners' },
  { id: 'enquiries', label: 'Enquiries' },
  { id: 'payouts', label: 'Pending Payouts' },
]

export default function SuperAdminPartnersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('partners')

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">
            Partners
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage partner registrations, enquiries, and commission payouts.
          </p>
        </div>

        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
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
          {activeTab === 'partners' && <PartnersTab />}
          {activeTab === 'enquiries' && <EnquiriesTab />}
          {activeTab === 'payouts' && <PendingPayoutsTab />}
        </div>
      </div>
    </AppLayout>
  )
}
