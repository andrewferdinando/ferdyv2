'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  brandName?: string;
  className?: string;
}

export default function Breadcrumb({ items, brandName, className = '' }: BreadcrumbProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs from pathname if no items provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Home
    breadcrumbs.push({ label: 'Home', href: '/' });

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip dynamic segments like [brandId]
      if (segment.startsWith('[') && segment.endsWith(']')) {
        return;
      }

      // Convert segment to readable label
      let label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Special cases for specific routes
      if (segment === 'brands' && segments[index + 1]) {
        // For brand pages, use the brand name if provided
        if (brandName) {
          breadcrumbs.push({ label: brandName, href: currentPath });
        }
        return; // Skip this segment, we'll handle it in the next iteration
      }

      if (segment === 'engine-room') {
        label = 'Engine Room';
      } else if (segment === 'content-library') {
        label = 'Content Library';
      } else if (segment === 'new-post') {
        label = 'New Post';
      } else if (segment === 'edit-post') {
        label = 'Edit Post';
      } else if (segment === 'automated-monthly-posts') {
        label = 'Automated Monthly Posts';
      } else if (segment === 'account') {
        label = 'Account';
      }

      // Don't make the last segment a link (current page)
      const isLast = index === segments.length - 1;
      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath
      });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs();

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <svg
                className="w-4 h-4 text-gray-400 mx-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-150"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-950 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
