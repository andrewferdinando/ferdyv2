'use client'

import { useState } from 'react'
import ContactForm from './ContactForm'

export default function BottomCTA() {
  const [showDemoForm, setShowDemoForm] = useState(false)

  return (
    <>
      <section id="take-action" className="py-24 bg-white border-t border-gray-200">
        <div className="container">
          <div className="max-w-3xl mx-auto">

            {/* Take action */}
            <div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900">Take action</h2>
              <p className="text-gray-600 mb-8">Ready to get started? Let&apos;s go.</p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">Request a demo</h3>
                    <p className="text-gray-600 mb-3">Book a live walkthrough with us and we&apos;ll show you exactly how Ferdy can work for your brand — your categories, your channels, your cadence.</p>
                    <p className="text-sm text-blue-600 font-medium mb-3">Free, no obligation</p>
                    <button
                      onClick={() => setShowDemoForm(true)}
                      className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-colors"
                    >
                      Request demo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showDemoForm && (
        <ContactForm
          title="Request a Demo"
          description="Tell us a bit about your brand and we'll show you exactly how Ferdy can work for you."
          formType="demo"
          onClose={() => setShowDemoForm(false)}
        />
      )}
    </>
  )
}
