'use client';

import { useState } from 'react';

const steps = [
  {
    number: "01",
    title: "Define your structure and assets",
    description: "Tell Ferdy what to post (products, services, promos, events) and upload the images and videos you're happy to use.",
    bgColor: "bg-gradient-to-br from-blue-50 to-blue-100",
    numberColor: "text-blue-300"
  },
  {
    number: "02",
    title: "Ferdy creates and schedules content",
    description: "Posts are generated using your structure and approved assets, then scheduled on a daily, weekly or monthly rhythm.",
    bgColor: "bg-gradient-to-br from-purple-50 to-pink-100",
    numberColor: "text-purple-300"
  },
  {
    number: "03",
    title: "You approve what goes live",
    description: "Review, edit or skip posts anytime. Nothing publishes without your sign-off.",
    bgColor: "bg-gradient-to-br from-orange-50 to-pink-50",
    numberColor: "text-orange-300",
    hasLock: true
  }
];

export default function HowItWorks() {
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">How it works</h2>
          <p className="text-xl text-gray-600">Three simple steps to consistency.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16 relative">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              <div className={`${step.bgColor} rounded-2xl p-10 h-full border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1`}>
                <div className="flex justify-between items-start mb-6">
                  <div className={`text-6xl font-bold ${step.numberColor}`}>{step.number}</div>
                  {step.hasLock && (
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">{step.title}</h3>
                <p className="text-gray-700 leading-relaxed text-lg">{step.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10 text-gray-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Video Section */}
        <div
          onClick={() => setVideoOpen(true)}
          className="max-w-5xl mx-auto bg-gray-100 rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative group cursor-pointer border border-gray-200"
        >
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-blue-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <p className="absolute bottom-8 text-sm font-medium text-gray-700 bg-white/90 px-4 py-2 rounded-full shadow-sm">
            Watch how Ferdy works
          </p>
        </div>

        {/* Video Modal */}
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
      </div>
    </section>
  );
}
