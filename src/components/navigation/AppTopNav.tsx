'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/navigation/Breadcrumb';
import UserAvatar from '@/components/ui/UserAvatar';
import { supabase } from '@/lib/supabase-browser';

interface AppTopNavProps {
  onMenuToggle: () => void;
}

interface CurrentUserInfo {
  id: string;
  email?: string | null;
  fullName?: string | null;
}

const MenuIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export default function AppTopNav({ onMenuToggle }: AppTopNavProps) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        const {
          data: { user: authUser },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error('AppTopNav: error fetching current user', error);
        }

        if (!isMounted) {
          return;
        }

        if (authUser) {
          setUser({
            id: authUser.id,
            email: authUser.email,
            fullName: (authUser.user_metadata as { full_name?: string })?.full_name,
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('AppTopNav: unexpected error fetching user', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AppTopNav: error signing out', error);
        return;
      }
      router.push('/auth/sign-in');
    } catch (err) {
      console.error('AppTopNav: unexpected error signing out', err);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="h-16 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white p-2 text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <Breadcrumb />
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden text-sm leading-tight text-gray-600 sm:flex sm:flex-col">
                {user.fullName ? (
                  <span className="font-medium text-gray-900">{user.fullName}</span>
                ) : null}
                <span>{user.email}</span>
              </div>
              <UserAvatar userId={user.id} size="md" />
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:inline-flex"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="hidden h-10 w-32 animate-pulse rounded-lg bg-gray-200 sm:block" />
              <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

