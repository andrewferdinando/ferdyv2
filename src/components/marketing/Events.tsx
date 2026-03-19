'use client'

import { useState, useEffect, useCallback } from 'react'

export default function Events() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [paused, setPaused] = useState(false)

  const advance = useCallback(() => {
    setActiveSlide(prev => (prev + 1) % 2)
  }, [])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(advance, 5000)
    return () => clearInterval(timer)
  }, [paused, advance])

  return (
    <section className="py-24 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
            Events on autopilot
          </h2>
          <p className="text-xl text-gray-500 font-medium">
            From countdown to curtain call, Ferdy handles the posts.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          {/* Left: Copy */}
          <div className="flex flex-col justify-center">
            <div className="space-y-6">
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                Running a festival, a networking event, or a limited-time promo? Tell Ferdy when it starts and ends, and it schedules the right posts at the right time.
              </p>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                Set how many posts go out before the event to build anticipation, and add posts during multi-day events to keep the momentum going. Every post is written from your event details, in your brand&apos;s voice.
              </p>
            </div>
          </div>

          {/* Right: Timeline slideshow */}
          <div
            className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border border-blue-100 rounded-3xl p-8 md:p-10 overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full blur-3xl -mr-16 -mt-16 opacity-40" />

            <div className="relative z-10">
              {activeSlide === 0 ? <SingleDateSlide /> : <DateRangeSlide />}

              {/* Dot indicators */}
              <div className="flex justify-center gap-2 mt-8">
                {[0, 1].map(i => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i === activeSlide ? 'bg-blue-600 w-5' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={i === 0 ? 'Single date event' : 'Date range event'}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* Slide 1: Single date event */
function SingleDateSlide() {
  return (
    <>
      <div className="text-center mb-2">
        <span className="inline-block px-4 py-1.5 rounded-full bg-white/80 border border-gray-200 text-xs font-semibold text-gray-600 tracking-wide uppercase shadow-sm">
          Single date event
        </span>
      </div>
      <div className="text-center mb-8">
        <span className="inline-block px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold tracking-wide uppercase">
          Networking Night &mdash; May 15
        </span>
      </div>

      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-300 rounded-full" />

        {/* Event day marker */}
        <div className="absolute top-0 right-4 sm:right-6 flex flex-col items-center" style={{ top: '-4px' }}>
          <div className="w-px h-3 bg-blue-400" />
          <p className="text-[9px] font-semibold text-blue-500 mt-0.5">EVENT</p>
        </div>

        <div className="flex justify-end relative pr-12 sm:pr-16">
          <div className="flex gap-2 sm:gap-3" style={{ width: '75%' }}>
            <TimelineMarker label="7 days before" color="purple" />
            <TimelineMarker label="3 days before" color="purple" />
            <TimelineMarker label="1 day before" color="purple" />
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-6 mt-8 text-xs font-medium text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span>Posts before</span>
        </div>
      </div>
    </>
  )
}

/* Slide 2: Date range event */
function DateRangeSlide() {
  return (
    <>
      <div className="text-center mb-2">
        <span className="inline-block px-4 py-1.5 rounded-full bg-white/80 border border-gray-200 text-xs font-semibold text-gray-600 tracking-wide uppercase shadow-sm">
          Multi-day event
        </span>
      </div>
      <div className="text-center mb-8">
        <span className="inline-block px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold tracking-wide uppercase">
          Easter Holiday Programme &mdash; Apr 4&ndash;18
        </span>
      </div>

      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-300 rounded-full" />
        <div className="absolute top-0 bottom-0 left-[55%] w-px bg-blue-300" style={{ height: 'calc(100% + 8px)', top: '-4px' }} />

        <div className="flex justify-between relative">
          <div className="flex gap-2 sm:gap-3" style={{ width: '55%' }}>
            <TimelineMarker label="7 days before" color="purple" />
            <TimelineMarker label="3 days before" color="purple" />
            <TimelineMarker label="1 day before" color="purple" />
          </div>
          <div className="flex gap-2 sm:gap-3 justify-end" style={{ width: '42%' }}>
            <TimelineMarker label="Day 1" color="blue" />
            <TimelineMarker label="Day 2" color="blue" />
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-6 mt-8 text-xs font-medium text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span>Posts before</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Posts during</span>
        </div>
      </div>
    </>
  )
}

function TimelineMarker({ label, color }: { label: string; color: 'purple' | 'blue' }) {
  const dotColor = color === 'purple' ? 'bg-purple-500' : 'bg-blue-500'
  const cardBorder = color === 'purple' ? 'border-purple-200' : 'border-blue-200'
  const cardBg = color === 'purple' ? 'bg-purple-50' : 'bg-blue-50'
  const iconColor = color === 'purple' ? 'text-purple-400' : 'text-blue-400'

  return (
    <div className="flex flex-col items-center flex-1">
      <div className={`w-2.5 h-2.5 rounded-full ${dotColor} ring-4 ring-white shadow-sm z-10`} />
      <div className={`mt-4 w-full ${cardBg} border ${cardBorder} rounded-xl p-2.5 text-center shadow-sm`}>
        <div className={`mx-auto mb-1.5 ${iconColor}`}>
          <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </div>
        <p className="text-[10px] sm:text-xs font-semibold text-gray-700 leading-tight">{label}</p>
      </div>
    </div>
  )
}
