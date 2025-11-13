'use client';

import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { useBrands } from '@/hooks/useBrands';

const adminCards = [
  {
    title: 'Brand Details',
    description: 'Manage Business Information',
    href: '/super-admin/brand-details',
    cta: 'Manage Details',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  {
    title: 'Add New Brand & Users',
    description: 'Create a new brand and onboard the first team members.',
    href: '/auth/sign-up',
    cta: 'Start Setup',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    )
  }
];

export default function SuperAdminPage() {
  const { brands, loading } = useBrands();

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Super Admin</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-[#EEF2FF] rounded-lg flex items-center justify-center text-[#6366F1] group-hover:bg-[#6366F1] group-hover:text-white transition-colors duration-200">
                        {card.icon}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#6366F1] transition-colors duration-200">
                        {card.title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-[#6366F1] text-sm font-medium mt-4">
                    <span>{card.cta ?? 'Open'}</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Brand Post Information</h2>
                <p className="text-sm text-gray-500">
                  Open a brand to review the analysed Facebook and Instagram post insights.
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200">
                {loading ? (
                  <div className="p-6 space-y-4">
                    {[0, 1, 2].map((key) => (
                      <div key={key} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : brands.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500">
                    No brands available yet. Connect a brand to view post information.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {brands.map((brand) => (
                      <li key={brand.id}>
                        <Link
                          href={`/super-admin/brands/${brand.id}/post-information`}
                          className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{brand.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              View analysed Meta posts, tone, and average length.
                            </p>
                          </div>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
