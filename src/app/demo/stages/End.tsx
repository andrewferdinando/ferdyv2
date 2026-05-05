'use client'

import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import LogoHeader from '../components/LogoHeader'

type Props = {
  businessName: string
  keptCount: number
  onSubmit: (lead: { name: string; email: string }) => void
  onRestart: () => void
}

export default function End({ businessName, keptCount, onSubmit, onRestart }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    onSubmit({ name: name.trim(), email: email.trim() })
    setSubmitted(true)
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <LogoHeader />

      <div className="flex-1 flex items-center justify-center px-6 pt-32 pb-16">
        <div className="w-full max-w-2xl text-center">
          {submitted ? (
            <>
              <div className="mx-auto mb-8 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-600" strokeWidth={2.5} />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-950 tracking-tight mb-5">
                We’ll be in touch.
              </h1>
              <p className="text-lg text-gray-500 mb-10">
                Someone from the Ferdy team will reach out within a day to set this up for {businessName}.
              </p>
              <button
                onClick={onRestart}
                className="text-sm text-gray-500 hover:text-indigo-500 underline underline-offset-4 decoration-gray-300 hover:decoration-indigo-300 transition"
              >
                Run another scan
              </button>
            </>
          ) : (
            <>
              <p className="text-indigo-500 text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase mb-6">
                {keptCount} {keptCount === 1 ? 'category' : 'categories'} ready to roll
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-950 tracking-tight mb-5">
                Want us to set this up for you?
              </h1>
              <p className="text-lg text-gray-500 mb-10">
                Drop your details and we’ll get {businessName} live on autopilot — usually within a week.
              </p>

              <form onSubmit={handleSubmit} className="max-w-md mx-auto grid gap-3 text-left">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-14 px-5 text-base rounded-xl bg-white border border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition placeholder:text-gray-400"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.co.nz"
                  className="h-14 px-5 text-base rounded-xl bg-white border border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  disabled={!email.trim()}
                  className="h-14 mt-2 px-7 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-semibold text-base shadow-sm hover:shadow-md hover:-translate-y-px transition disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Set me up
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>

              <button
                onClick={onRestart}
                className="text-sm text-gray-400 hover:text-indigo-500 underline underline-offset-4 decoration-gray-200 hover:decoration-indigo-300 transition mt-8"
              >
                Maybe later — go back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
