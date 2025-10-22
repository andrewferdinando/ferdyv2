'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useBrands } from '@/hooks/useBrands';
import { supabase } from '@/lib/supabase-browser';

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

const SuperAdminIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);


const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const LogoutIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

interface SidebarProps {
  className?: string;
  onMobileClose?: () => void;
}

export default function Sidebar({ className = '', onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const { brands, loading: brandsLoading } = useBrands();

  // Initialize selectedBrandId from URL or localStorage
  useEffect(() => {
    // Extract brandId from current pathname (e.g., /brands/123/schedule -> 123)
    const brandIdFromUrl = pathname.match(/\/brands\/([^\/]+)/)?.[1];
    
    if (brandIdFromUrl) {
      setSelectedBrandId(brandIdFromUrl);
      localStorage.setItem('selectedBrandId', brandIdFromUrl);
    } else {
      // Fall back to localStorage or first brand
      const storedBrandId = localStorage.getItem('selectedBrandId');
      if (storedBrandId && brands.some(brand => brand.id === storedBrandId)) {
        setSelectedBrandId(storedBrandId);
      } else if (brands.length > 0) {
        const firstBrandId = brands[0].id;
        setSelectedBrandId(firstBrandId);
        localStorage.setItem('selectedBrandId', firstBrandId);
      }
    }
  }, [pathname, brands]);

  const handleNavigationClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
    localStorage.setItem('selectedBrandId', brandId);
    setIsBrandDropdownOpen(false);
    
    // Navigate to the selected brand's schedule page
    router.push(`/brands/${brandId}/schedule`);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const selectedBrand = brands.find(brand => brand.id === selectedBrandId) || brands[0];

  // Don't render navigation if no brand is available (during build)
  if (!selectedBrand) {
    return null;
  }

  const navigationItems = [
    {
      name: 'Schedule',
      href: `/brands/${selectedBrand.id}/schedule`,
      icon: CalendarIcon,
      active: pathname.includes('/schedule'),
    },
    {
      name: 'Engine Room',
      href: `/brands/${selectedBrand.id}/engine-room`,
      icon: SettingsIcon,
      active: pathname.includes('/engine-room') && !pathname.includes('/account'),
    },
  ];

  const superAdminItem = {
    name: 'Super Admin',
    href: '/super-admin',
    icon: SuperAdminIcon,
    active: pathname.startsWith('/super-admin'),
  };

  return (
    <div className={`w-[280px] lg:w-[280px] bg-white border-r border-gray-200 flex flex-col h-full ${className}`}>
      {/* Brand Dropdown */}
      <div className="p-6 border-b border-gray-200">
        <div className="relative">
          <button
            onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
            className="w-full flex items-center justify-between p-4 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-all duration-200"
            disabled={brandsLoading}
          >
            <span className="font-medium text-gray-900 text-xs">
              {brandsLoading ? 'Loading...' : selectedBrand?.name || 'Select Brand'}
            </span>
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          </button>
          
          {isBrandDropdownOpen && !brandsLoading && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              <div className="p-2">
                {brands.map((brand) => (
                  <div
                    key={brand.id}
                    onClick={() => handleBrandSelect(brand.id)}
                    className={`p-2 hover:bg-gray-50 rounded cursor-pointer text-xs transition-colors ${
                      selectedBrand?.id === brand.id ? 'bg-[#EEF2FF] text-[#6366F1]' : 'text-gray-700'
                    }`}
                  >
                    {brand.name}
                  </div>
                ))}
                {brands.length === 0 && (
                  <div className="p-2 text-xs text-gray-500 text-center">
                    No brands found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items - Updated spacing for better visual breathing room */}
      <nav className="flex-1 p-6 flex flex-col">
        <ul className="space-y-2 flex-1">
          {navigationItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                onClick={handleNavigationClick}
                className={`flex items-center !space-x-6 px-4 py-3 rounded-lg transition-all duration-200 ${
                  item.active
                    ? 'bg-[#EEF2FF] text-[#6366F1]'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        
        {/* Account Settings, Super Admin and Sign Out at bottom */}
        <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
          <Link
            href={`/brands/${selectedBrandId}/account`}
            onClick={handleNavigationClick}
            className={`flex items-center !space-x-6 px-4 py-3 rounded-lg transition-all duration-200 ${
              pathname.startsWith('/account')
                ? 'bg-[#EEF2FF] text-[#6366F1]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium text-sm">Account</span>
          </Link>
          
          <Link
            href={superAdminItem.href}
            onClick={handleNavigationClick}
            className={`flex items-center !space-x-6 px-4 py-3 rounded-lg transition-all duration-200 ${
              superAdminItem.active
                ? 'bg-[#EEF2FF] text-[#6366F1]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <superAdminItem.icon className="w-5 h-5" />
            <span className="font-medium text-sm">{superAdminItem.name}</span>
          </Link>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center !space-x-6 px-4 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-gray-100"
          >
            <LogoutIcon className="w-5 h-5" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
