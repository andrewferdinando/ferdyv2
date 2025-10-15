'use client'

import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import Link from 'next/link'

// Icons
const UserIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CogIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LinkIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const ImageIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

  const settingsSections = [
    {
      title: 'Account & Team',
      items: [
        {
          name: 'Team Management',
          description: 'Manage team members and permissions',
          href: `/brands/${brandId}/settings/account`,
          icon: UserIcon,
        },
      ]
    },
    {
      title: 'Integrations',
      items: [
        {
          name: 'Social Media Accounts',
          description: 'Connect your social media accounts',
          href: `/brands/${brandId}/integrations`,
          icon: LinkIcon,
        },
      ]
    },
    {
      title: 'Content',
      items: [
        {
          name: 'Content Library',
          description: 'Manage your media assets and content',
          href: `/brands/${brandId}/content-library`,
          icon: ImageIcon,
        },
        {
          name: 'Content Preferences',
          description: 'Set your content generation preferences',
          href: `/brands/${brandId}/content-preferences`,
          icon: CogIcon,
        },
      ]
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
              <p className="text-gray-600 mt-1 text-sm">Manage your brand settings and preferences</p>
            </div>
          </div>

          {/* Settings Sections */}
          <div className="px-4 sm:px-6 lg:px-10 py-6 space-y-8">
            {settingsSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{section.title}</h2>
                <div className="space-y-3">
                  {section.items.map((item, itemIndex) => (
                    <Link
                      key={itemIndex}
                      href={item.href}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <item.icon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-500">{item.description}</p>
                        </div>
                      </div>
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}
