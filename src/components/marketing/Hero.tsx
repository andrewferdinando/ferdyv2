"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function Hero() {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <section className="relative pt-32 pb-40 overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-gray-900 leading-[1.1]">
            Automate your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">repeatable</span> social media posts.
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Ferdy creates and publishes the posts you repeat every month — so you can spend more time on the creative ones.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => setVideoOpen(true)}
              className="h-14 px-8 text-lg rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition-all hover:scale-105 flex items-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Watch demo
            </button>

            <Link 
              href="/contact"
              className="h-14 px-8 text-lg rounded-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all flex items-center font-medium"
            >
              Request personalised Loom
            </Link>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="rounded-2xl border-4 border-white bg-white shadow-2xl overflow-hidden relative z-20 transform hover:scale-[1.02] transition-transform duration-500">
            <div className="bg-white border-b px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="mx-auto text-xs font-medium text-gray-500 bg-gray-100 px-4 py-1.5 rounded-full">
                ferdy.app/calendar
              </div>
            </div>
            <div className="aspect-[16/9] bg-white relative p-1">
              <img 
                src="/images/hero_visualization.png" 
                alt="Ferdy calendar dashboard" 
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {videoOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setVideoOpen(false)}
        >
          <div 
            className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setVideoOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <iframe 
              width="100%" 
              height="100%" 
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" 
              title="Ferdy Demo Video" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </section>
  );
}
