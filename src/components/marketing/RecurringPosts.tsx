'use client'

import { useState, useEffect, useCallback } from 'react'

interface PostMarker {
  day: number // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  label: string
}

interface Slide {
  businessType: string
  posts: PostMarker[]
  monthlyPost?: string
}

const slides: Slide[] = [
  {
    businessType: 'Fashion',
    posts: [
      { day: 0, label: 'Denim Range' },
      { day: 2, label: 'Knitwear Collection' },
      { day: 4, label: 'Accessories' },
    ],
  },
  {
    businessType: 'Venues & Hospitality',
    posts: [
      { day: 1, label: 'Taco Tuesday' },
      { day: 4, label: 'Happy Hour Friday' },
      { day: 5, label: 'Live Music Saturday' },
    ],
  },
  {
    businessType: 'Food & Beverage',
    posts: [
      { day: 1, label: 'Cold Brew Range' },
      { day: 3, label: 'Hot Sauce Collection' },
      { day: 4, label: 'Pasta Range' },
    ],
  },
  {
    businessType: 'E-commerce',
    posts: [
      { day: 0, label: 'Tapware Range' },
      { day: 2, label: 'Shower Screens' },
      { day: 4, label: 'Vanities' },
    ],
  },
]

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function RecurringPosts() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [paused, setPaused] = useState(false)

  const advance = useCallback(() => {
    setActiveSlide(prev => (prev + 1) % slides.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(advance, 5000)
    return () => clearInterval(timer)
  }, [paused, advance])

  const current = slides[activeSlide]

  return (
    <section className="py-24 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
            Your weekly and monthly predictable posts
          </h2>
          <p className="text-xl text-gray-500 font-medium">
            Set it once. Ferdy writes and publishes fresh posts on your schedule.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          {/* Left: Calendar slideshow */}
          <div
            className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border border-blue-100 rounded-3xl p-8 md:p-10 overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-purple-200 to-blue-200 rounded-full blur-3xl -ml-16 -mt-16 opacity-40" />

            <div className="relative z-10">
              {/* Business type label */}
              <div className="text-center mb-6">
                <span className="inline-block px-4 py-1.5 rounded-full bg-white/80 border border-gray-200 text-xs font-semibold text-gray-600 tracking-wide uppercase shadow-sm">
                  {current.businessType}
                </span>
              </div>

              {/* Weekly grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-3">
                {dayLabels.map((day, i) => (
                  <div key={day} className="text-center">
                    <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase mb-2">{day}</p>
                    <div className="relative">
                      <div className={`aspect-square rounded-xl border flex items-center justify-center transition-all duration-500 ${
                        current.posts.some(p => p.day === i)
                          ? 'bg-white border-blue-200 shadow-sm'
                          : 'bg-white/50 border-gray-200/60'
                      }`}>
                        {current.posts.find(p => p.day === i) ? (
                          <div className="flex flex-col items-center px-0.5">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            <p className="text-[5px] sm:text-[9px] font-semibold text-gray-700 leading-tight text-center">
                              {current.posts.find(p => p.day === i)!.label}
                            </p>
                          </div>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Monthly post (if applicable) */}
              {current.monthlyPost && (
                <div className="mt-4 flex items-center justify-center gap-3 px-4 py-3 bg-white/80 border border-purple-200 rounded-xl shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{current.monthlyPost}</p>
                    <p className="text-[10px] text-gray-400">1st of every month</p>
                  </div>
                </div>
              )}

              {/* Dot indicators */}
              <div className="flex justify-center gap-2 mt-6">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i === activeSlide ? 'bg-blue-600 w-5' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Slide ${i + 1}: ${slides[i].businessType}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Copy */}
          <div className="flex flex-col justify-center">
            <div className="space-y-6">
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                Whether you&apos;re keeping your whole product range front of mind or promoting the same weekly special, the schedule never changes &mdash; only the copy does.
              </p>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                Ferdy writes fresh, on-brand posts for every slot, using your product details and brand voice. Set it up once and let it run.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
