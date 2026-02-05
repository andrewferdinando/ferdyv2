export default function TimeSaved() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          {/* Heading */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Ferdy saves you time every month
            </h2>
            <p className="text-xl text-gray-600">
              Most businesses spend 8+ hours a month creating social content. Here&apos;s all Ferdy takes.
            </p>
          </div>

          {/* Two stat cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Setup card */}
            <div className="bg-white border border-gray-200 rounded-3xl p-10 text-center hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-6xl md:text-7xl font-bold text-gray-900 mb-2">60</div>
              <div className="text-lg font-semibold text-blue-600 mb-4">minutes, one-time setup</div>
              <p className="text-gray-600 leading-relaxed">
                Connect your accounts. Set up your categories and posting schedule.
              </p>
            </div>

            {/* Ongoing card */}
            <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border border-blue-100 rounded-3xl p-10 text-center relative overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full blur-3xl -mr-12 -mt-12 opacity-40"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div className="text-6xl md:text-7xl font-bold text-gray-900 mb-2">15</div>
                <div className="text-lg font-semibold text-blue-600 mb-4">minutes per month, ongoing</div>
                <p className="text-gray-600 leading-relaxed">
                  Review your auto-generated drafts, approve or tweak, and Ferdy handles the rest.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
