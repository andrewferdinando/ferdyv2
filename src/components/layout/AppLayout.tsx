'use client';

import { createContext, useContext, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/navigation/Sidebar';
import AppTopNav from '@/components/navigation/AppTopNav';

const AppLayoutContext = createContext(false);

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const isNested = useContext(AppLayoutContext);

  if (isNested) {
    return <>{children}</>;
  }

  return (
    <AppLayoutContext.Provider value={true}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </AppLayoutContext.Provider>
  );
}

function AppLayoutInner({ children }: AppLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleToggleSidebar = () => setIsMobileMenuOpen((prev) => !prev);
  const handleCloseSidebar = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-dvh bg-gray-50">
        <div
          className={`
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
            fixed inset-y-0 left-0 z-50
            transition-transform duration-300 ease-in-out
          `}
        >
          <Sidebar onMobileClose={handleCloseSidebar} />
        </div>

        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            onClick={handleCloseSidebar}
          />
        )}

        <div className="flex flex-col min-h-dvh lg:ml-[280px]">
          <AppTopNav onMenuToggle={handleToggleSidebar} />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
          <footer className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-xs text-gray-500">
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">
              Privacy Policy
            </Link>
            <span className="mx-2">·</span>
            <Link href="/terms" className="hover:text-gray-700 transition-colors">
              Terms
            </Link>
          </footer>
        </div>
      </div>
  );
}
