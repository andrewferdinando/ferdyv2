'use client';

import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const adminCards = [
  {
    title: 'Brand Details',
    description: 'View and manage brand information',
    href: '/super-admin/brand-details', // Will redirect to brand list or first brand
    cta: 'View Brands',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    title: 'Post Information',
    description: 'View and analyse post information',
    href: '/super-admin/post-information',
    cta: 'View Post Information',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export default function SuperAdminPage() {

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-[1.2] text-gray-950 sm:text-3xl lg:text-[32px]">
                Super Admin
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {adminCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group h-full rounded-xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#6366F1] transition-colors duration-200 group-hover:bg-[#6366F1] group-hover:text-white">
                        {card.icon}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 transition-colors duration-200 group-hover:text-[#6366F1]">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">{card.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm font-medium text-[#6366F1]">
                    <span>{card.cta ?? 'Open'}</span>
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
