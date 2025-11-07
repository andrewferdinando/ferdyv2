'use client';

import Breadcrumb from '@/components/navigation/Breadcrumb';

interface AppTopNavProps {
  onMenuToggle: () => void;
}

const MenuIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export default function AppTopNav({ onMenuToggle }: AppTopNavProps) {
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
        <div className="hidden sm:block" />
      </div>
    </header>
  );
}

