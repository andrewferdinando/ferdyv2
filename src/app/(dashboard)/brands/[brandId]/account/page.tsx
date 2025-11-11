'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import { supabase } from '@/lib/supabase-browser';

export default function AccountSettingsPage() {
  const params = useParams();
  const brandId = params.brandId as string;
  const [profileRole, setProfileRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setProfileRole(null);
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('AccountSettingsPage: failed to load profile role', error);
          setProfileRole(null);
          return;
        }

        setProfileRole(profile?.role ?? null);
      } catch (error) {
        console.error('AccountSettingsPage: unexpected error fetching profile role', error);
        setProfileRole(null);
      }
    };

    fetchProfileRole();
  }, []);

  const isPrivileged =
    profileRole === 'admin' || profileRole === 'super_admin' || profileRole === 'owner';

  const accountSettings = useMemo(() => {
    const entries: Array<{
      id: string;
      title: string;
      description: string;
      icon: React.ReactNode;
      href: string;
      requiresAdmin: boolean;
    }> = [
      {
        id: 'profile',
        title: 'Profile',
        description: 'Manage your personal info.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
        href: `/brands/${brandId}/account/profile`,
        requiresAdmin: false,
      },
      {
        id: 'brand',
        title: 'Brand Settings',
        description: 'Manage your brand info.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        href: `/brands/${brandId}/account/brand`,
        requiresAdmin: true,
      },
      {
        id: 'team',
        title: 'Team',
        description: 'Invite team members and manage roles.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        href: `/brands/${brandId}/account/team`,
        requiresAdmin: true,
      },
      {
        id: 'billing',
        title: 'Billing',
        description: 'Manage your billing info.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
        href: `/brands/${brandId}/account/billing`,
        requiresAdmin: true,
      },
      {
        id: 'add-brand',
        title: 'Add Brand',
        description: 'Create and set up a new brand.',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
        href: '/account/add-brand',
        requiresAdmin: true,
      },
    ];

    return entries;
  }, [brandId]);

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-10">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Account Settings</h1>
              </div>

              {/* Settings Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accountSettings.map((setting) => {
                  const disabled = setting.requiresAdmin && !isPrivileged;
                  const cardClasses = [
                    'rounded-xl border p-6 transition-all duration-200 h-full',
                    disabled
                      ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-70'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5',
                  ].join(' ');
                  const iconWrapperClasses = [
                    'w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-200',
                    disabled
                      ? 'bg-gray-200 text-gray-500'
                      : 'bg-[#EEF2FF] text-[#6366F1] group-hover:bg-[#6366F1] group-hover:text-white',
                  ].join(' ');
                  const titleClasses = [
                    'text-lg font-semibold transition-colors duration-200',
                    disabled ? 'text-gray-500' : 'text-gray-900 group-hover:text-[#6366F1]',
                  ].join(' ');
                  const descriptionClasses = disabled ? 'text-gray-500 text-sm mt-1 leading-relaxed' : 'text-gray-600 text-sm mt-1 leading-relaxed';
                  const cardContent = (
                    <div
                      className={cardClasses}
                      aria-disabled={disabled}
                      title={disabled ? 'Only admins can access this section.' : undefined}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className={iconWrapperClasses}>
                            {setting.icon}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={titleClasses}>
                            {setting.title}
                          </h3>
                          <p className={descriptionClasses}>
                            {setting.description}
                          </p>
                          {disabled && (
                            <span className="mt-3 inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200">
                              Admins only
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  if (disabled) {
                    return (
                      <div key={setting.id} className="group block">
                        {cardContent}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={setting.id}
                      href={setting.href}
                      className="group block"
                    >
                      {cardContent}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}

