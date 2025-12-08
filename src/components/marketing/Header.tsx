'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)

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
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link 
            href="/auth/sign-in"
            className="hidden sm:flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  )
}
