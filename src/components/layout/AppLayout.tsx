'use client';

import { createContext, useContext, useState } from 'react';
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
    <div className="flex min-h-dvh bg-gray-50">
      <div
        className={`
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
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

      <div className="flex-1 flex flex-col min-h-dvh">
        <AppTopNav onMenuToggle={handleToggleSidebar} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
