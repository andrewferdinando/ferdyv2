'use client'

import { useEffect } from 'react'
import LogoHeader from '../components/LogoHeader'

const CALENDLY_URL =
  'https://calendly.com/ferdy-app/meeting-with-andrew-60?utm_source=ferdy-demo&utm_campaign=marketers-day&hide_gdpr_banner=1'

const CALENDLY_SCRIPT_SRC = 'https://assets.calendly.com/assets/external/widget.js'

type Props = {
  businessName: string
  keptCount: number
  onRestart: () => void
}

export default function End({ businessName, keptCount, onRestart }: Props) {
  // Load the Calendly widget script once. The library reads
  // [data-url] off any .calendly-inline-widget on the page and renders the iframe.
  useEffect(() => {
    if (document.querySelector(`script[src="${CALENDLY_SCRIPT_SRC}"]`)) return
    const s = document.createElement('script')
    s.src = CALENDLY_SCRIPT_SRC
    s.async = true
    document.body.appendChild(s)
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col">
      <LogoHeader />

      <div className="flex-1 flex flex-col items-center px-6 pt-32 pb-16">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8">
            <p className="text-indigo-500 text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase mb-4">
              {keptCount} {keptCount === 1 ? 'category' : 'categories'} ready to roll
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-950 tracking-tight leading-[1.1] mb-4">
              Worth a 30 min free
              <br />
              <span className="bg-gradient-to-r from-indigo-500 to-indigo-700 bg-clip-text text-transparent">
                strategy chat?
              </span>
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Book below and we’ll walk through getting {businessName} live on autopilot.
            </p>
          </div>

          {/* Launch offer banner */}
          <div className="mb-8 mx-auto max-w-md bg-gradient-to-r from-indigo-50 to-indigo-100/70 border border-indigo-200 rounded-2xl px-6 py-4 text-center">
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-indigo-600 mb-1">
              Launch offer · 20% off
            </p>
            <p className="text-base text-gray-700">
              <span className="text-gray-400 line-through mr-2">$147</span>
              <span className="font-semibold text-gray-950">$117.60</span>
              <span className="text-gray-500"> /month + GST</span>
            </p>
          </div>

          {/* Calendly inline widget */}
          <div
            className="calendly-inline-widget bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
            data-url={CALENDLY_URL}
            style={{ minWidth: 320, height: 720 }}
          />

          <div className="text-center mt-8">
            <button
              type="button"
              onClick={onRestart}
              className="text-sm text-gray-400 hover:text-indigo-500 underline underline-offset-4 decoration-gray-200 hover:decoration-indigo-300 transition"
            >
              Run another scan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
