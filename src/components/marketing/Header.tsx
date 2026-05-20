'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import ContactForm from './ContactForm'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [demoFormOpen, setDemoFormOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 border-b ${
        scrolled
          ? 'bg-white/80 backdrop-blur-md border-slate-200 shadow-sm py-2'
          : 'bg-transparent border-transparent py-4'
      }`}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-4xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Ferdy
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <a href="#venues" className="hidden md:flex text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Venues</a>
          <a href="#how-it-works" className="hidden md:flex text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">How it works</a>
          <a href="#pricing" className="hidden md:flex text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Pricing</a>
          <Link
            href="/demo"
            className="hidden sm:flex text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            Try it on your venue
          </Link>
          <Link
            href="/auth/sign-in"
            className="hidden sm:flex text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            Log in
          </Link>
          <button
            onClick={() => setDemoFormOpen(true)}
            className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
          >
            Book a call
          </button>
        </div>
      </div>
      {demoFormOpen && (
        <ContactForm
          title="Book a Call"
          description="Drop your details and we'll book a live walkthrough for your venue."
          formType="demo"
          onClose={() => setDemoFormOpen(false)}
        />
      )}
    </header>
  )
}
