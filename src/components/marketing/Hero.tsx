'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Hero() {
  return (
    <section className="relative pt-32 pb-40 overflow-hidden" style={{
      background: 'linear-gradient(180deg, #89C4FF 0%, #FFFFFF 100%)'
    }}>
      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-gray-900 leading-[1.1]">
            Automate your{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              repeatable
            </span>{' '}
            social media posts.
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
            Ferdy creates and publishes the posts you repeat every month — so you can spend more time on the creative ones.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center justify-center h-14 px-8 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-xl shadow-blue-600/25 transition-all hover:scale-105"
            >
              Get Started
            </Link>
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center justify-center h-14 px-8 text-lg font-medium text-blue-600 bg-white hover:bg-gray-50 rounded-full border-2 border-blue-600/30 transition-all"
            >
              Watch Demo
            </Link>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl">
          {/* Main Calendar Interface */}
          <div className="rounded-2xl border-4 border-white bg-white shadow-2xl overflow-hidden relative z-20 transform rotate-1 hover:rotate-0 transition-transform duration-700">
            <div className="bg-white border-b px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="mx-auto text-xs font-medium text-gray-500 bg-gray-100 px-4 py-1.5 rounded-full">
                ferdy.app/calendar
              </div>
            </div>
            <div className="aspect-[16/9] bg-white relative p-1">
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center text-gray-400">
                {/* Placeholder for hero image */}
                <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
