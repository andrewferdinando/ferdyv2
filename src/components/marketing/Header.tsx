'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

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
          <a href="#how-it-works" className="hidden md:flex text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">How it works</a>
          <a href="#pricing" className="hidden md:flex text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Pricing</a>
          <button
            onClick={() => setVideoOpen(true)}
            className="hidden sm:flex text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            Watch demo
          </button>
          <Link
            href="/auth/sign-in"
            className="hidden sm:flex text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            Log in
          </Link>
          <button
            onClick={() => scrollToSection('take-action')}
            className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
          >
            Get Started
          </button>
        </div>
      </div>
      {videoOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => { setVideoOpen(false); setVideoPlaying(false); }}
        >
          <div className="flex flex-col items-center w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div
              className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
            >
              <button
                onClick={() => { setVideoOpen(false); setVideoPlaying(false); }}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {videoPlaying ? (
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/EYeDs6awRuU?autoplay=1"
                  title="Ferdy Demo Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div
                  className="w-full h-full cursor-pointer relative group"
                  onClick={() => setVideoPlaying(true)}
                >
                  <img
                    src="https://img.youtube.com/vi/EYeDs6awRuU/maxresdefault.jpg"
                    alt="Ferdy Demo Video"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-4">
                    <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-blue-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <span className="text-white/90 text-sm font-medium bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                      Tip: Watch at 1.5x speed
                    </span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-white/70 text-sm mt-3">We recommend watching at 1.5x speed</p>
          </div>
        </div>
      )}
    </header>
  )
}
