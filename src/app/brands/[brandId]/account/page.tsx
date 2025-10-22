'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';

export default function AccountSettingsPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const accountSettings = [
    {
      id: 'profile',
      title: 'Profile',
      description: 'Manage your personal information and account details',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      href: `/brands/${brandId}/account/profile`,
      accessible: true
    },
    {
      id: 'team',
      title: 'Team',
      description: 'Invite team members and manage roles and permissions',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      href: `/brands/${brandId}/account/team`,
      accessible: true // Will be checked on the individual page
    },
    {
      id: 'billing',
      title: 'Billing',
      description: 'Manage your subscription and billing information',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      href: `/brands/${brandId}/account/billing`,
      accessible: true // Will be checked on the individual page
    }
  ];

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-10">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Account Settings</h1>
                <p className="text-gray-600 mt-1 text-sm">Manage your account, team, and billing preferences</p>
              </div>

              {/* Settings Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accountSettings.map((setting) => (
                  <Link
                    key={setting.id}
                    href={setting.href}
                    className="group block"
                  >
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-[#EEF2FF] rounded-lg flex items-center justify-center text-[#6366F1] group-hover:bg-[#6366F1] group-hover:text-white transition-colors duration-200">
                            {setting.icon}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#6366F1] transition-colors duration-200">
                            {setting.title}
                          </h3>
                          <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                            {setting.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
