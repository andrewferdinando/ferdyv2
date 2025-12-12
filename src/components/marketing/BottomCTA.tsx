'use client'

import { useState } from 'react'
import ContactForm from './ContactForm'

export default function BottomCTA() {
  const [showLoomForm, setShowLoomForm] = useState(false)
  const [showTrainingForm, setShowTrainingForm] = useState(false)

  return (
    <>
      <section id="take-action" className="py-24 bg-white border-t border-gray-200">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-16 max-w-6xl mx-auto">
            
            {/* Curious? */}
            <div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900">Curious?</h2>
              <p className="text-gray-600 mb-8">Learn more before you commit.</p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">Watch the demo video</h3>
                    <p className="text-gray-600 mb-3">See exactly how Ferdy works in under 3 minutes — from creating categories to automated publishing.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">View pricing</h3>
                    <p className="text-gray-600 mb-3">Compare plans above and choose the option that best matches your business size and posting needs.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Take action */}
            <div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900">Take action</h2>
              <p className="text-gray-600 mb-8">Ready to get started? Let&apos;s go.</p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">Request a personalised Loom</h3>
                    <p className="text-gray-600 mb-3">Get a walkthrough tailored to your brand. We&apos;ll show you how Ferdy would set up your categories and content.</p>
                    <p className="text-sm text-blue-600 font-medium mb-3">Free, no obligation</p>
                    <button 
                      onClick={() => setShowLoomForm(true)}
                      className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-colors"
                    >
                      Request Personalised Loom
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">Book training / implementation (approx. 60-90 mins)</h3>
                    <p className="text-gray-600 mb-3">Schedule a live session where we set up your account together and show your team how to get the most from Ferdy.</p>
                    <p className="text-sm text-blue-600 font-medium mb-3">Free, launch offer</p>
                    <button 
                      onClick={() => setShowTrainingForm(true)}
                      className="inline-block px-6 py-3 bg-white hover:bg-gray-50 text-blue-600 font-semibold rounded-full border-2 border-blue-600 transition-colors"
                    >
                      Book Training / Onboarding
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {showLoomForm && (
        <ContactForm 
          title="Request Personalised Loom"
          description="Fill out the form below and we'll create a personalized walkthrough for your brand."
          formType="loom"
          onClose={() => setShowLoomForm(false)}
        />
      )}

      {showTrainingForm && (
        <ContactForm 
          title="Book Training / Onboarding"
          description="Fill out the form below and we'll schedule a live session to set up your account."
          formType="training"
          onClose={() => setShowTrainingForm(false)}
        />
      )}
    </>
  )
}
