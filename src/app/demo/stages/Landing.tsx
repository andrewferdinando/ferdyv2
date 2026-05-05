'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import LogoHeader from '../components/LogoHeader'
import { DEMO_LIST } from '../data/demos'
import type { DemoKey } from '../data/types'

type Props = {
  onSubmitUrl: (url: string) => void
  onPickDemo: (key: DemoKey) => void
  error?: string | null
}

export default function Landing({ onSubmitUrl, onPickDemo, error }: Props) {
  const [url, setUrl] = useState('')
  const [showDemoPicker, setShowDemoPicker] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    onSubmitUrl(trimmed)
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <LogoHeader />

      <div className="flex-1 flex items-center justify-center px-6 pt-32 pb-16">
        <div className="w-full max-w-2xl">
          <p className="text-indigo-500 text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase mb-6 text-center">
            Could some of your posts be on autopilot?
          </p>

          <h1 className="text-4xl sm:text-6xl font-bold text-gray-950 tracking-tight text-center leading-[1.1] mb-5">
            Drop in your URL and we’ll show you.
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 text-center mb-12">
            We’ll read your site and map out the posts Ferdy could write and publish for you, on repeat.
          </p>

          <form onSubmit={handleSubmit} className="w-full">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 max-w-xl mx-auto">
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourbusiness.co.nz"
                className="flex-1 h-14 px-5 text-base sm:text-lg rounded-xl bg-white border border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={!url.trim()}
                className="h-14 px-7 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-semibold text-base shadow-sm hover:shadow-md hover:-translate-y-px transition disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Show me
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <p className="text-center text-sm text-red-500 mt-4">{error}</p>
            )}

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => setShowDemoPicker((v) => !v)}
                className="text-sm text-gray-500 hover:text-indigo-500 underline underline-offset-4 decoration-gray-300 hover:decoration-indigo-300 transition"
              >
                Or try a demo site
              </button>
            </div>
          </form>

          {showDemoPicker && (
            <div className="mt-8 grid gap-3 max-w-xl mx-auto">
              {DEMO_LIST.map((d) => (
                <button
                  key={d.key}
                  onClick={() => onPickDemo(d.key)}
                  className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md hover:-translate-y-px transition"
                >
                  <div className="font-semibold text-gray-950">{d.label}</div>
                  <div className="text-sm text-gray-500 mt-1">{d.sublabel}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
