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
          <div className="text-center mb-10">
            <p className="text-indigo-500 text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase mb-4">
              {keptCount} {keptCount === 1 ? 'category' : 'categories'} ready to roll
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-950 tracking-tight mb-4">
              Want us to set this up?
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Book a quick chat and we’ll walk you through getting {businessName} live on autopilot using Ferdy.
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
