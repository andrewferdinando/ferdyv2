'use client'

import Image from 'next/image'
import { useRef, useState, useEffect, useActionState } from 'react'
import { WebinarConfig } from '@/app/webinar/config'
import { registerForWebinar, RegisterResult } from './actions'
import {
  buildGoogleCalendarUrl,
  buildIcsString,
} from '@/lib/webinar-calendar'

// -- Intersection Observer hook for scroll-triggered reveals --
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      id={id}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
    >
      {children}
    </div>
  )
}

// -- Calendar download helper --
function downloadIcs(config: WebinarConfig) {
  const blob = new Blob([buildIcsString(config)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${config.slug}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

// -- Thank-you state with 2-step progress --
function ThankYouState({ config }: { config: WebinarConfig }) {
  const [calendarAdded, setCalendarAdded] = useState(false)

  const calIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )

  const stepCheck = (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )

  const handleCalendarClick = (type: 'google' | 'ics') => {
    if (type === 'google') {
      window.open(buildGoogleCalendarUrl(config), '_blank', 'noopener,noreferrer')
    } else {
      downloadIcs(config)
    }
    setCalendarAdded(true)
  }

  if (calendarAdded) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-stone-900 mb-2">You&apos;re all set!</h3>
        <p className="text-stone-600 mb-6">Registered and in your calendar. See you there.</p>
        <div className="flex flex-col gap-2 max-w-xs mx-auto text-left">
          <div className="flex items-center gap-3 text-sm text-emerald-700">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              {stepCheck}
            </div>
            Registered - check your inbox
          </div>
          <div className="flex items-center gap-3 text-sm text-emerald-700">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              {stepCheck}
            </div>
            Added to calendar
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      {/* Progress steps */}
      <div className="flex flex-col gap-2 max-w-xs mx-auto text-left mb-8">
        <div className="flex items-center gap-3 text-sm text-emerald-700">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            {stepCheck}
          </div>
          Registered - check your inbox
        </div>
        <div className="flex items-center gap-3 text-sm text-stone-500">
          <div className="w-6 h-6 rounded-full border-2 border-stone-300 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold">2</span>
          </div>
          Add to your calendar
        </div>
      </div>

      {/* Calendar CTA */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-stone-900 mb-2">
          One more thing - don&apos;t forget to save the date
        </h3>
        <p className="text-sm text-stone-500 mb-5">
          Most attendees add this to their calendar to save their spot
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={() => handleCalendarClick('google')}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg transition-colors shadow-sm"
          >
            {calIcon} Google Calendar
          </button>
          <button
            onClick={() => handleCalendarClick('ics')}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors"
          >
            {calIcon} Apple / Outlook
          </button>
        </div>
        <button
          onClick={() => setCalendarAdded(true)}
          className="mt-4 text-xs text-stone-400 hover:text-stone-500 underline transition-colors"
        >
          Skip - I&apos;ll do it later
        </button>
      </div>
    </div>
  )
}

// -- Registration form --
function RegistrationForm({ config }: { config: WebinarConfig }) {
  const [state, formAction, isPending] = useActionState<RegisterResult | null, FormData>(
    async (_prev, formData) => {
      return registerForWebinar(formData)
    },
    null
  )

  if (state?.success) {
    return <ThankYouState config={config} />
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Hidden fields from config */}
      <input type="hidden" name="webinar_slug" value={config.slug} />
      <input type="hidden" name="webinar_name" value={config.name} />
      <input type="hidden" name="niche" value={config.niche} />
      <input type="hidden" name="location" value={config.location} />

      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-stone-700 mb-1">
          First name
        </label>
        <input
          id="firstName"
          name="firstName"
          type="text"
          required
          autoComplete="given-name"
          className="w-full px-4 py-3 rounded-lg border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
          placeholder="e.g. Sarah"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full px-4 py-3 rounded-lg border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
          placeholder="sarah@yourvenue.com.au"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3.5 px-6 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? 'Registering\u2026' : 'Save my spot'}
      </button>

      <p className="text-xs text-stone-500 text-center">
        Free - only {config.spots} spots available. No credit card required.
      </p>
    </form>
  )
}

// -- Main page --
export function WebinarPage({ config }: { config: WebinarConfig }) {
  const [showSticky, setShowSticky] = useState(false)
  const heroCtaRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = heroCtaRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scrollToForm = () => {
    document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* ── Sticky mobile CTA ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300 ${
          showSticky ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white/95 backdrop-blur border-t border-stone-200 px-4 py-3">
          <button
            onClick={scrollToForm}
            className="w-full py-3 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-base transition-colors"
          >
            Register now - it&apos;s free
          </button>
        </div>
      </div>

      {/* ── Hero ── */}
      <header className="relative overflow-hidden bg-gradient-to-b from-stone-100 to-stone-50">
        {/* Subtle texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        <div className="relative max-w-3xl mx-auto px-5 pt-8 pb-16 md:pt-12 md:pb-24 text-center">
          {/* Ferdy logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/images/ferdy_logo_transparent.png"
              alt="Ferdy"
              width={120}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </div>

          <p className="text-sm font-semibold tracking-widest uppercase text-[var(--primary)] mb-6">
            Free training
          </p>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-stone-900 mb-10">
            {config.headline}
          </h1>

          {/* Host intro block */}
          <div className="max-w-xl mx-auto mb-10">
            <div className="flex justify-center mb-3">
              <Image
                src="/images/andrew-headshot.jpg"
                alt={config.host.name}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
              />
            </div>
            <p className="text-base text-stone-600 leading-relaxed mb-3">
              Hi, I&apos;m Andrew. As a marketing advisor, I observed that 80% of social posts for
              hospo venues are predictable and repeatable - so I built a system to automate them.
            </p>
            <p className="text-base text-stone-600 leading-relaxed">
              This is a free session where I&apos;ll show you exactly how it works.
            </p>
          </div>

          <p className="inline-flex items-center gap-2 text-sm font-medium text-stone-700 bg-white/80 backdrop-blur rounded-full px-4 py-2 shadow-sm mb-8">
            <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {config.date}
          </p>

          <div>
            <button
              ref={heroCtaRef}
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 py-3.5 px-8 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-base transition-colors shadow-md hover:shadow-lg"
            >
              Save my free spot
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-16 md:py-24 space-y-20 md:space-y-28">
        {/* ── Pain points ── */}
        <Section>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-10 text-center">
            Sound familiar?
          </h2>
          <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Hours lost every week',
                text: 'You know you should be posting, but between running the venue and managing staff, social media always falls to the bottom of the list.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: '"What do I even post?"',
                text: 'Staring at a blank screen trying to think of something clever is exhausting. You need a system, not more inspiration.',
              },
            ].map((pain) => (
              <div
                key={pain.title}
                className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] mb-4">
                  {pain.icon}
                </div>
                <h3 className="font-semibold text-stone-900 mb-2">{pain.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{pain.text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── What you'll learn ── */}
        <Section>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-10 text-center">
            What you&apos;ll learn
          </h2>
          <div className="grid gap-6 md:grid-cols-2 max-w-xl mx-auto">
            {config.what_you_will_learn.map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm text-center"
              >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--primary-light)] text-[var(--primary)] font-bold text-base mb-3">
                  {i + 1}
                </span>
                <p className="text-stone-900 font-semibold leading-snug">{item}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Who it's for ── */}
        <Section>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-4 text-center">
            Who this is for
          </h2>
          <p className="text-stone-600 text-center max-w-xl mx-auto leading-relaxed">
            This training is for venue owners and social media managers. I&apos;ll show you how to
            automate 80% of your social posts in just 10-15 mins per month using only your assets
            and brand tone.
          </p>
        </Section>

        {/* ── Host ── */}
        <Section>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-6 text-center">
            Your host
          </h2>
          <div className="bg-white rounded-xl border border-stone-200 p-6 md:p-8 shadow-sm text-center max-w-lg mx-auto">
            <div className="flex justify-center mb-4">
              <Image
                src="/images/andrew-headshot.jpg"
                alt={config.host.name}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
              />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-2">{config.host.name}</h3>
            <p className="text-sm text-stone-600 leading-relaxed">{config.host.bio}</p>
          </div>
        </Section>

        {/* ── Social proof ── */}
        <Section>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-10 text-center">
            What venue owners are saying
          </h2>
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
              <svg className="w-8 h-8 text-[var(--primary)] opacity-30 mb-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151C7.563 6.068 6 8.789 6 11h4v10H0z" />
              </svg>
              <p className="text-stone-600 text-sm leading-relaxed mb-4 italic">
                &quot;I was skeptical that a tool could capture our brand voice across 3 different venues. It does. Our social presence looks more professional than ever and my team spends about 15 mins per month on it total.&quot;
              </p>
              <p className="text-sm font-semibold text-stone-900">Jen, General Manager</p>
              <p className="text-xs text-stone-500">Chain of indoor entertainment venues</p>
            </div>
          </div>
        </Section>

        {/* ── Registration form ── */}
        <Section id="register">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-10 shadow-lg max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-stone-900 mb-2 text-center">
              Register for free
            </h2>
            <p className="text-stone-500 text-sm text-center mb-6">
              {config.date}
            </p>
            <RegistrationForm config={config} />
          </div>
        </Section>

        {/* ── FAQ ── */}
        <Section>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-10 text-center">
            Frequently asked questions
          </h2>
          <div className="space-y-6 max-w-xl mx-auto">
            {[
              {
                q: 'Will there be a replay?',
                a: 'Yes, I\u2019ll email it to you after the webinar along with an offer if you\u2019re keen to use Ferdy.',
              },
              {
                q: 'How long is the training?',
                a: 'About 30 mins + Q&A. A focused session with actionable takeaways. No filler, no fluff.',
              },
            ].map((faq, i) => (
              <div key={i}>
                <h3 className="font-semibold text-stone-900 mb-1">{faq.q}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-200 py-8 text-center">
        <p className="text-sm text-stone-400">
          &copy; {new Date().getFullYear()} Ferdy. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
