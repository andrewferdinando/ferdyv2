import React from 'react';

const SparkleIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
  </svg>
);

const Annotation = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border-2 border-dashed border-purple-300 uppercase tracking-wider whitespace-nowrap shadow-sm ${className}`}>
    <SparkleIcon size={9} />
    {children}
  </span>
);

const PublishedPill = () => (
  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
    Published
  </span>
);

const CheckBadge = () => (
  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  </div>
);

export default function FerdyPublishedPostDesktop() {
  return (
    <div className="relative w-full max-w-[780px] font-sans">
      {/* The card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Automation Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-400 px-5 py-2 flex items-center justify-center gap-2 text-white">
          <SparkleIcon size={12} />
          <span className="text-xs font-semibold tracking-wide">Published on Autopilot</span>
          <SparkleIcon size={12} />
        </div>

        <div className="p-4 md:p-5">
          {/* Main content: thumbnail + copy */}
          <div className="relative flex flex-col sm:flex-row gap-4 mb-4">
            {/* Thumbnail with annotation */}
            <div className="relative flex-shrink-0 self-start sm:self-auto w-full sm:w-auto">
              <img
                src="/images/burger-tuesday.jpg"
                alt="Burger Tuesday"
                className="w-full h-40 sm:w-20 sm:h-20 rounded-lg object-cover"
              />
              {/* Annotation: Auto selected - positioned as callout */}
              <div className="absolute -bottom-3 left-2 sm:-left-4 z-10">
                <div className="relative">
                  {/* Connector line */}
                  <div className="hidden sm:block absolute top-1/2 right-full w-2 border-t-2 border-dashed border-purple-300" />
                  <Annotation className="-rotate-2">Auto selected</Annotation>
                </div>
              </div>
            </div>

            {/* Copy with annotation */}
            <div className="flex-1 mt-2 sm:mt-0">
              {/* Annotation: Auto-generated - positioned as callout */}
              <div className="mb-2">
                <div className="relative inline-block">
                  <Annotation className="rotate-1">Auto-generated copy</Annotation>
                </div>
              </div>
              <p className="text-[13px] sm:text-sm leading-relaxed text-gray-700">
                Imagine savoring two delicious burgers for the price of one every Tuesday, making it the perfect opportunity for friends and family to indulge together.
              </p>
            </div>
          </div>

          {/* Platform status - vertical stack on mobile, horizontal on desktop */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 mb-4">
            {/* Facebook */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-shrink-0 w-8 h-8 rounded-full bg-[#1877f2] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <CheckBadge />
              </div>
              <div>
                <div className="text-[13px] font-medium text-gray-900">Facebook</div>
                <div className="flex items-center gap-2">
                  <PublishedPill />
                  <span className="text-xs text-blue-500">View post</span>
                </div>
              </div>
            </div>

            {/* Instagram Feed */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <CheckBadge />
              </div>
              <div>
                <div className="text-[13px] font-medium text-gray-900">Instagram Feed</div>
                <div className="flex items-center gap-2">
                  <PublishedPill />
                  <span className="text-xs text-blue-500">View post</span>
                </div>
              </div>
            </div>

            {/* Instagram Story */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(45deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <CheckBadge />
              </div>
              <div>
                <div className="text-[13px] font-medium text-gray-900">Instagram Story</div>
                <PublishedPill />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200 mb-4" />

          {/* Bottom row: stacks on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Published date */}
            <div className="flex items-center gap-2 flex-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span className="text-[12px] sm:text-[13px] text-gray-500 font-medium">
                Published &bull; Feb 2, 2026, 6:00 PM
              </span>
              <Annotation className="-rotate-1">Scheduled</Annotation>
            </div>

            {/* Schedule tag */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-amber-800 bg-amber-100 px-3 py-1 rounded-md">
                Burger Tuesday
              </span>
              <div className="flex items-center gap-1.5 text-gray-500 text-[12px] sm:text-[13px]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Weekly</span>
              </div>
              <Annotation className="rotate-1">Auto publish</Annotation>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
