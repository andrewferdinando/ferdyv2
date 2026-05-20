'use client'

import { ArrowRight } from 'lucide-react'

type Props = {
  onContinue: () => void
}

export default function Intro({ onContinue }: Props) {
  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-indigo-100 via-white to-indigo-50 overflow-hidden">

      {/* Soft ambient indigo glow behind the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[900px] max-h-[900px] rounded-full bg-indigo-200/40 blur-3xl"
      />

      <div className="relative flex-1 flex items-center justify-center px-6 pt-32 pb-16">
        <div className="w-full max-w-4xl text-center">
          <h1 className="text-5xl sm:text-7xl xl:text-8xl font-bold text-gray-950 tracking-tight leading-[1.05] mb-8">
            Could some of your social posts be{' '}
            <span className="bg-gradient-to-r from-indigo-500 to-indigo-700 bg-clip-text text-transparent">
              on autopilot?
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-500 mb-3">
            Take the 2-minute test
          </p>
          <p className="text-sm sm:text-base text-gray-400 mb-14 max-w-md mx-auto">
            We scan your site, suggest 6 post categories, and write example posts.
          </p>

          <button
            type="button"
            onClick={onContinue}
            className="scope-attract-pulse inline-flex items-center gap-3 h-16 px-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-semibold text-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            Start
            <ArrowRight className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
