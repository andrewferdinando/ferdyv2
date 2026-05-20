import Link from 'next/link'
import { ArrowRight, MousePointerClick } from 'lucide-react'

export default function DemoMidCTA() {
  return (
    <section className="py-20 bg-white">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border border-blue-100 rounded-3xl p-10 md:p-14 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full blur-3xl -mr-16 -mt-16 opacity-40" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-blue-200 text-xs font-semibold text-blue-700 mb-4">
                  <MousePointerClick className="w-3.5 h-3.5" strokeWidth={2} />
                  2-minute interactive demo
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  Not sure yet? Try it on your venue.
                </h2>
                <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                  Pop in your URL and see what Ferdy would post for your venue. No sign-up.
                </p>
              </div>

              <Link
                href="/demo"
                className="shrink-0 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
              >
                Try it on your venue
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
