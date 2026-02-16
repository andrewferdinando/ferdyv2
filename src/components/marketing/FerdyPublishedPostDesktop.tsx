"use client";

import React, { useState, useEffect } from 'react';

/* ── Callout data ─────────────────────────────────────────── */
const CALLOUTS = [
  {
    icon: '\u270D\uFE0F',
    label: 'AI-Generated Copy',
    description:
      "Ferdy writes fresh copy every time using your product info, matched to your brand's tone of voice.",
    color: '#7c3aed',
  },
  {
    icon: '\uD83D\uDDBC\uFE0F',
    label: 'Auto-Selected Media',
    description:
      'Rotates through your media library — images or videos — so content always looks fresh.',
    color: '#0ea5e9',
  },
  {
    icon: '\uD83D\uDCC5',
    label: 'Auto-Scheduled',
    description:
      'Posts go out weekly, monthly, or on specific dates — set it and forget it.',
    color: '#f97316',
  },
  {
    icon: '\uD83D\uDE80',
    label: 'Auto-Published',
    description:
      'Ferdy publishes to Facebook, Instagram Feed & Stories — all at once.',
    color: '#22c55e',
  },
  {
    icon: '\uD83D\uDCC2',
    label: 'Category-Based',
    description:
      'Each category is a repeating content template — with its own media, schedule, and product info. Set it up once, Ferdy handles the rest.',
    color: '#8b5cf6',
  },
];

/* ── CalloutCard (desktop side callouts) ──────────────────── */
function CalloutCard({
  icon,
  label,
  description,
  color,
  visible,
  align = 'left',
}: {
  icon: string;
  label: string;
  description: string;
  color: string;
  visible: boolean;
  align?: 'left' | 'right';
}) {
  return (
    <div
      className={`flex flex-col transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } ${align === 'right' ? 'items-end' : 'items-start'}`}
    >
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[11px] font-semibold mb-1.5 whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        <span>{icon}</span>
        {label}
      </div>
      <div
        className={`bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 px-3 py-2 max-w-[210px] ${
          align === 'right' ? 'text-right' : ''
        }`}
      >
        <p className="text-[11px] text-gray-500 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ── ConnectorLine (desktop horizontal) ───────────────────── */
function ConnectorLine({
  color,
  dotSide,
  visible,
}: {
  color: string;
  dotSide: 'left' | 'right';
  visible: boolean;
}) {
  return (
    <div
      className={`hidden lg:flex items-center min-w-[28px] flex-1 transition-opacity duration-500 delay-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {dotSide === 'left' && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <div
        className="flex-1 h-0 border-t-2 border-dashed"
        style={{ borderColor: color, opacity: 0.35 }}
      />
      {dotSide === 'right' && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
}

/* ── VerticalConnectorLine (desktop bottom) ───────────────── */
function VerticalConnectorLine({
  color,
  visible,
}: {
  color: string;
  visible: boolean;
}) {
  return (
    <div
      className={`hidden lg:flex flex-col items-center min-h-[24px] h-8 transition-opacity duration-500 delay-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div
        className="flex-1 w-0 border-l-2 border-dashed"
        style={{ borderColor: color, opacity: 0.35 }}
      />
    </div>
  );
}

/* ── InlineAnnotation (mobile — embedded in post) ─────────── */
function InlineAnnotation({
  icon,
  label,
  description,
  color,
  visible,
}: {
  icon: string;
  label: string;
  description: string;
  color: string;
  visible: boolean;
}) {
  return (
    <div
      className={`mx-4 my-1.5 pl-3 py-1.5 transition-all duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ borderLeft: `2px dashed ${color}` }}
    >
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-semibold whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        <span>{icon}</span>
        {label}
      </span>
      <p className="text-[10px] text-gray-400 leading-snug mt-1">
        {description}
      </p>
    </div>
  );
}

/* ── Checkmark icon ───────────────────────────────────────── */
function Check() {
  return (
    <svg
      className="w-3.5 h-3.5 text-emerald-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/* ── FacebookPost ─────────────────────────────────────────── */
function FacebookPost({
  annotations,
}: {
  annotations?: {
    afterHeader?: React.ReactNode;
    afterText?: React.ReactNode;
    afterImage?: React.ReactNode;
    afterBadges?: React.ReactNode;
  };
}) {
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200/80 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm leading-none">BB</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-gray-900 leading-tight">
            Biggie&apos;s Burger Bar
          </p>
          <div className="flex items-center gap-1 text-[12px] text-gray-500 mt-0.5">
            <span>2h</span>
            <span>&middot;</span>
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm5.6 5H11a13 13 0 00-1.1-3.9A6.5 6.5 0 0113.6 5zM8 1.1c.7 1 1.3 2.4 1.6 3.9H6.4C6.7 3.5 7.3 2.1 8 1.1zM1.3 9.5A6 6 0 011 8c0-.5.1-1 .3-1.5h3c-.1.5-.1 1-.1 1.5s0 1 .1 1.5h-3zM2.4 11H5a13 13 0 001.1 3.9A6.5 6.5 0 012.4 11zm2.6-6H2.4a6.5 6.5 0 013.7-3.9A13 13 0 005 5zm3 9.9c-.7-1-1.3-2.4-1.6-3.9h3.2c-.3 1.5-.9 2.9-1.6 3.9zm1.8-5.4H6.2A11 11 0 016 8c0-.5.1-1 .2-1.5h3.6c.1.5.2 1 .2 1.5s-.1 1-.2 1.5zm.3 5.4A13 13 0 0011 11h2.6a6.5 6.5 0 01-3.5 3.9zm1.6-5.4c.1-.5.1-1 .1-1.5s0-1-.1-1.5h3A6 6 0 0115 8c0 .5-.1 1-.3 1.5h-3z" />
            </svg>
          </div>
        </div>
        <div className="text-gray-400 p-1">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="4" cy="10" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="16" cy="10" r="1.5" />
          </svg>
        </div>
      </div>

      {annotations?.afterHeader}

      {/* Post copy */}
      <div className="px-4 pb-3">
        <p className="text-[14px] text-gray-900 leading-[1.4]">
          Two-for-one Tuesday is BACK! 🍔🍔 Bring your bestie and grab two of
          our famous smashed burgers for just $18. Available every Tuesday,
          dine-in only. See you there!
        </p>
      </div>

      {annotations?.afterText}

      {/* Post image */}
      <img
        src="/images/burger-tuesday.jpg"
        alt="Two delicious smashed burgers on a wooden board"
        className="w-full object-cover"
        style={{ maxHeight: '300px' }}
      />

      {annotations?.afterImage}

      {/* Engagement row */}
      <div className="px-4 py-2 flex items-center justify-between text-[13px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1">
            <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-blue-500 text-[10px] border border-white">
              👍
            </span>
            <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] border border-white">
              ❤️
            </span>
          </div>
          <span>47</span>
        </div>
        <span>12 comments &middot; 3 shares</span>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-gray-200" />

      {/* Action buttons */}
      <div className="px-2 py-1 grid grid-cols-3">
        {[
          {
            label: 'Like',
            d: 'M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3',
          },
          {
            label: 'Comment',
            d: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
          },
          {
            label: 'Share',
            d: 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13',
          },
        ].map(({ label, d }) => (
          <button
            key={label}
            className="flex items-center justify-center gap-1.5 py-2 text-[13px] text-gray-500 font-medium rounded-md"
          >
            <svg
              className="w-[18px] h-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d={d} />
            </svg>
            {label}
          </button>
        ))}
      </div>

      {/* Platform badges */}
      <div className="border-t border-gray-200 bg-gray-50/80 px-4 py-2.5">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* Facebook */}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#1877f2] flex items-center justify-center flex-shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <span className="text-[11px] text-gray-600 font-medium">
              Facebook
            </span>
            <Check />
          </div>

          {/* Instagram Feed */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  'linear-gradient(45deg, #f09433, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888)',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </div>
            <span className="text-[11px] text-gray-600 font-medium">
              IG Feed
            </span>
            <Check />
          </div>

          {/* Instagram Story */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  'linear-gradient(45deg, #833ab4, #fd1d1d 50%, #fcb045)',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </div>
            <span className="text-[11px] text-gray-600 font-medium">
              IG Story
            </span>
            <Check />
          </div>
        </div>
      </div>

      {annotations?.afterBadges}
    </div>
  );
}

/* ── CategoryCard (merged category callout + summary bar) ─── */
function CategoryCard({
  callout,
  visible,
}: {
  callout: { icon: string; label: string; description: string; color: string };
  visible: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3.5 transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
      style={{
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: callout.color + '30',
        backgroundColor: callout.color + '08',
      }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[11px] font-semibold whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: callout.color }}
        >
          <span>{callout.icon}</span>
          {callout.label}
        </span>
        <p className="text-[11px] text-gray-500 leading-relaxed pt-0.5">
          {callout.description}
        </p>
      </div>
      <div
        className="flex items-center gap-1.5 sm:gap-2 mt-3 pt-3 whitespace-nowrap"
        style={{
          borderTopWidth: '1px',
          borderTopStyle: 'dashed',
          borderTopColor: callout.color + '25',
        }}
      >
        <span className="font-semibold text-amber-800 bg-amber-100 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-[12px]">
          Burger Tuesday
        </span>
        <span className="text-gray-300">&middot;</span>
        <span className="font-semibold text-amber-800 bg-amber-100 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-[12px]">
          Weekly
        </span>
        <span className="text-gray-300">&middot;</span>
        <span className="font-semibold text-amber-800 bg-amber-100 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-[12px]">
          Mondays at 7pm
        </span>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────── */
export default function FerdyPublishedPostDesktop() {
  const [vis, setVis] = useState([false, false, false, false, false]);

  useEffect(() => {
    const timers = [0, 1, 2, 3, 4].map((i) =>
      setTimeout(
        () =>
          setVis((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          }),
        300 + i * 250,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const [aiCopy, autoMedia, autoScheduled, autoPublished, categoryBased] =
    CALLOUTS;

  return (
    <div className="w-full">
      {/* ── Desktop: 3-column grid ───────────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_420px_1fr] items-start">
        {/* Left callouts */}
        <div className="flex flex-col gap-0 pt-[80px]">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalloutCard {...aiCopy} visible={vis[0]} align="right" />
            </div>
            <ConnectorLine
              color={aiCopy.color}
              dotSide="right"
              visible={vis[0]}
            />
          </div>
          <div className="flex items-center mt-[80px]">
            <div className="flex-shrink-0">
              <CalloutCard {...autoMedia} visible={vis[1]} align="right" />
            </div>
            <ConnectorLine
              color={autoMedia.color}
              dotSide="right"
              visible={vis[1]}
            />
          </div>
        </div>

        {/* Center: post + category card */}
        <div>
          <FacebookPost />
          <div className="flex flex-col items-center mt-1">
            <VerticalConnectorLine
              color={categoryBased.color}
              visible={vis[4]}
            />
          </div>
          <CategoryCard callout={categoryBased} visible={vis[4]} />
        </div>

        {/* Right callouts */}
        <div className="flex flex-col pt-[16px]">
          <div className="flex items-center">
            <ConnectorLine
              color={autoScheduled.color}
              dotSide="left"
              visible={vis[2]}
            />
            <div className="flex-shrink-0">
              <CalloutCard {...autoScheduled} visible={vis[2]} />
            </div>
          </div>
          <div className="flex items-center mt-[310px]">
            <ConnectorLine
              color={autoPublished.color}
              dotSide="left"
              visible={vis[3]}
            />
            <div className="flex-shrink-0">
              <CalloutCard {...autoPublished} visible={vis[3]} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile/Tablet: inline annotations ────────────── */}
      <div className="lg:hidden">
        <div className="max-w-[440px] mx-auto">
          <FacebookPost
            annotations={{
              afterHeader: (
                <InlineAnnotation {...autoScheduled} visible={vis[2]} />
              ),
              afterText: (
                <InlineAnnotation {...aiCopy} visible={vis[0]} />
              ),
              afterImage: (
                <InlineAnnotation {...autoMedia} visible={vis[1]} />
              ),
              afterBadges: (
                <InlineAnnotation {...autoPublished} visible={vis[3]} />
              ),
            }}
          />
          <div className="mt-4">
            <CategoryCard callout={categoryBased} visible={vis[4]} />
          </div>
        </div>
      </div>
    </div>
  );
}
