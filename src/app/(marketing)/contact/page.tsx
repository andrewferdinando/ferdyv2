'use client'

import { useState } from 'react'
import ContactForm from '@/components/marketing/ContactForm'

export default function Contact() {
  const [showDemoForm, setShowDemoForm] = useState(false)

  return (
    <>
      <div className="py-24 bg-white">
        <div className="container max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">Contact Us</h1>
          <p className="text-xl text-gray-600 mb-12">
            Have questions about Ferdy? We&apos;d love to hear from you.
          </p>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Get in Touch</h2>
              <p className="text-gray-600 mb-4">
                For inquiries about Ferdy, please email us at:
              </p>
              <a href="mailto:support@ferdy.io" className="text-blue-600 hover:text-blue-700 font-medium text-lg">
                support@ferdy.io
              </a>
            </div>

            <div className="pt-8 border-t">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Book a Demo</h2>
              <p className="text-gray-600 mb-4">
                Want to see Ferdy in action? Schedule a personalized demo with our team.
              </p>
              <button 
                onClick={() => setShowDemoForm(true)}
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDemoForm && (
        <ContactForm 
          title="Book a Demo"
          description="Fill out the form below and we'll get back to you shortly to schedule your personalized demo."
          formType="demo"
          onClose={() => setShowDemoForm(false)}
        />
      )}
    </>
  )
}
