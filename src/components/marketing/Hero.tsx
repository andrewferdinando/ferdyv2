'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import ContactForm from './ContactForm'

export default function Hero() {
  const [demoFormOpen, setDemoFormOpen] = useState(false)

  return (
    <>
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-gray-900 leading-[1.1]">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Social media automation
              </span>{' '}
              for venues.
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Save hours by automating the recurring, predictable posts your venue repeats every month.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setDemoFormOpen(true)}
                className="h-14 px-8 text-lg rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition-all hover:scale-105 font-medium"
              >
                Book a call
              </button>

              <Link
                href="/demo"
                className="h-14 px-8 text-lg rounded-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-2 font-medium"
              >
                See it on your venue
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {demoFormOpen && (
        <ContactForm
          title="Book a Call"
          description="Drop your details and we'll book a live walkthrough for your venue."
          formType="demo"
          onClose={() => setDemoFormOpen(false)}
        />
      )}
    </>
  )
}
