'use client'

import { useState } from 'react'
import ContactForm from './ContactForm'

export default function FinalCTA() {
  const [demoFormOpen, setDemoFormOpen] = useState(false)

  return (
    <>
      <section className="py-24 bg-white">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-[2rem] p-12 md:p-20 overflow-hidden text-center">
              <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -ml-32 -mt-32" />
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mb-32" />

              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
                  Ready to take recurring posts off your plate?
                </h2>
                <p className="text-lg md:text-xl text-white/90 mb-10 leading-relaxed">
                  A quick 20-minute call to see if Ferdy fits how your venue runs.
                </p>
                <button
                  onClick={() => setDemoFormOpen(true)}
                  className="h-14 px-10 text-lg rounded-full bg-white hover:bg-gray-50 text-blue-700 shadow-xl transition-all hover:scale-105 font-semibold"
                >
                  Book a call
                </button>
              </div>
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
