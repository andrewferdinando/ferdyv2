'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Icons (using simple SVG icons for now)
const CalendarIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const SettingsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);


const PlusIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname();
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isMonthlyPostsOpen, setIsMonthlyPostsOpen] = useState(false);

  const navigationItems = [
    {
      name: 'Schedule',
      href: '/schedule',
      icon: CalendarIcon,
      active: pathname === '/schedule',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: SettingsIcon,
      active: pathname === '/settings',
    },
    {
      name: 'Monthly Posts',
      icon: PlusIcon,
      hasDropdown: true,
      isOpen: isMonthlyPostsOpen,
      onToggle: () => setIsMonthlyPostsOpen(!isMonthlyPostsOpen),
    },
  ];

  return (
    <div className={`w-[280px] bg-white border-r border-gray-200 flex flex-col h-full ${className}`}>
      {/* Brand Dropdown */}
      <div className="p-6 border-b border-gray-200">
        <div className="relative">
          <button
            onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
            className="w-full flex items-center justify-between p-4 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-all duration-200"
          >
            <span className="font-medium text-gray-900 text-xs">Game Over Queenstown</span>
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          </button>
          
          {isBrandDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
              <div className="p-2">
                <div className="p-2 hover:bg-gray-50 rounded cursor-pointer text-xs">
                  Game Over Queenstown
                </div>
                <div className="p-2 hover:bg-gray-50 rounded cursor-pointer text-xs">
                  Another Brand
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-6">
        <ul className="space-y-2">
          {navigationItems.map((item) => (
            <li key={item.name}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={`flex items-center space-x-5 px-4 py-3 rounded-lg transition-all duration-200 ${
                    item.active
                      ? 'bg-[#EEF2FF] text-[#6366F1]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              ) : (
                <button
                  onClick={item.onToggle}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                    item.isOpen
                      ? 'bg-gray-100 text-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-5">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  {item.hasDropdown && (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
