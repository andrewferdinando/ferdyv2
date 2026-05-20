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
  )
}

/* ── VenuePhoto (CSS-only placeholder for Riverside Pavilion) ── */
function VenuePhoto() {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: '300px' }}>
      {/* Sky gradient (sunset over the river) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, #FCA770 0%, #F87171 35%, #C084FC 65%, #4F46E5 100%)',
        }}
      />
      {/* Sun */}
      <div
        className="absolute rounded-full"
        style={{
          width: '120px',
          height: '120px',
          left: '60%',
          top: '24%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, #FEF3C7 0%, #FBBF24 60%, transparent 75%)',
          opacity: 0.95,
        }}
      />
      {/* Distant hills */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: '46%',
          height: '60px',
          background: 'linear-gradient(to bottom, #4338CA 0%, #312E81 100%)',
          clipPath:
            'polygon(0% 100%, 0% 60%, 12% 30%, 22% 55%, 32% 25%, 45% 50%, 58% 20%, 70% 45%, 82% 30%, 100% 55%, 100% 100%)',
          opacity: 0.7,
        }}
      />
      {/* Pavilion silhouette */}
      <div
        className="absolute"
        style={{
          left: '50%',
          bottom: '40%',
          transform: 'translateX(-50%)',
          width: '180px',
          height: '70px',
        }}
      >
        <svg viewBox="0 0 180 70" className="w-full h-full">
          {/* Roof */}
          <polygon points="0,30 90,0 180,30 175,30 175,35 5,35 5,30" fill="#1E1B4B" />
          {/* Body */}
          <rect x="15" y="35" width="150" height="35" fill="#1E1B4B" />
          {/* Warm window glow */}
          <rect x="35" y="45" width="14" height="20" fill="#FBBF24" opacity="0.85" />
          <rect x="60" y="45" width="14" height="20" fill="#FBBF24" opacity="0.85" />
          <rect x="85" y="45" width="14" height="20" fill="#FBBF24" opacity="0.85" />
          <rect x="110" y="45" width="14" height="20" fill="#FBBF24" opacity="0.85" />
          <rect x="135" y="45" width="14" height="20" fill="#FBBF24" opacity="0.85" />
        </svg>
      </div>
      {/* River */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          height: '40%',
          background:
            'linear-gradient(to bottom, rgba(79,70,229,0.85) 0%, rgba(30,27,75,0.95) 100%)',
        }}
      />
      {/* Sun reflection on water */}
      <div
        className="absolute"
        style={{
          left: '60%',
          bottom: '0',
          width: '60px',
          height: '40%',
          transform: 'translateX(-50%)',
          background:
            'linear-gradient(to bottom, rgba(251,191,36,0.55) 0%, rgba(251,191,36,0) 100%)',
          filter: 'blur(2px)',
        }}
      />
      {/* Water shimmer lines */}
      <div className="absolute left-0 right-0 bottom-0" style={{ height: '40%' }}>
        <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
          <g stroke="#FCD34D" strokeWidth="1" opacity="0.35">
            <line x1="220" y1="30" x2="260" y2="30" />
            <line x1="210" y1="55" x2="280" y2="55" />
            <line x1="225" y1="80" x2="270" y2="80" />
            <line x1="215" y1="105" x2="285" y2="105" />
          </g>
        </svg>
      </div>
    </div>
  )
}

/* ── FacebookPost ─────────────────────────────────────────── */
function FacebookPost() {
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200/80 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm leading-none">RP</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-gray-900 leading-tight">
            Riverside Pavilion
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

      {/* Post copy */}
      <div className="px-4 pb-3">
        <p className="text-[14px] text-gray-900 leading-[1.4]">
          Friday Sessions are back this week. 🌅 Live acoustic from 6pm, riverside seating
          open until late, and a sunset platter built for sharing. Bookings recommended —
          link in bio.
        </p>
      </div>

      {/* Post image (CSS-only venue photo) */}
      <VenuePhoto />

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
          <span>128</span>
        </div>
        <span>24 comments &middot; 11 shares</span>
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
    </div>
  )
}

/* ── Main component ───────────────────────────────────────── */
export default function FerdyPublishedPostDesktop() {
  return (
    <div className="w-full max-w-[480px] mx-auto">
      <FacebookPost />
    </div>
  )
}
