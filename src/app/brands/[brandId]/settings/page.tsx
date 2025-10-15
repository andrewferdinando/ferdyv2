'use client'

import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import Link from 'next/link'

// Icons
const ContentLibraryIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ContentPreferencesIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const CategoriesIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const IntegrationsIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ChevronRightIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default function SettingsPage() {
  const params = useParams()
  const brandId = params.brandId as string

  const settingsCards = [
    {
      title: 'Content Library',
      description: 'Manage your media assets, templates, and reusable content pieces.',
      href: `/brands/${brandId}/content-library`,
      icon: ContentLibraryIcon,
      actionText: 'Open',
    },
    {
      title: 'Content Preferences',
      description: 'Configure default image formats and content settings.',
      href: `/brands/${brandId}/content-preferences`,
      icon: ContentPreferencesIcon,
      actionText: 'Configure',
    },
    {
      title: 'Categories & Post Frequency',
      description: 'Define content categories and post structure templates.',
      href: `/brands/${brandId}/categories`,
      icon: CategoriesIcon,
      actionText: 'Open',
    },
    {
      title: 'Integrations',
      description: 'Connect social media accounts and third-party services.',
      href: `/brands/${brandId}/integrations`,
      icon: IntegrationsIcon,
      actionText: 'Open',
    },
  ]

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Settings</h1>
              <p className="text-gray-600 mt-1 text-sm">Configure your workspace and integrations</p>
            </div>
          </div>

          {/* Settings Cards Grid */}
          <div className="px-4 sm:px-6 lg:px-10 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {settingsCards.map((card, index) => (
                <Link
                  key={index}
                  href={card.href}
                  className="group bg-gray-50 hover:bg-gray-100 rounded-lg p-6 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <card.icon className="w-6 h-6 text-purple-600" />
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{card.description}</p>
                  <span className="text-purple-600 font-medium text-sm group-hover:text-purple-700">
                    {card.actionText} →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}