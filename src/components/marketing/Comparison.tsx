export default function Comparison() {
  return (
    <section className="py-24 bg-white">
      <div className="container">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            What Ferdy is — and isn&apos;t
          </h2>
          <p className="text-xl text-gray-600">
            Built for the repeatable 80%, so your team can focus on more creative posts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* What Ferdy Is */}
          <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border border-blue-100 rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>

            <div className="relative z-10">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 mb-2">What Ferdy is</p>
              <h3 className="text-2xl md:text-3xl font-bold mb-10 text-gray-900">
                The system for your repeatable posts
              </h3>
              <ul className="space-y-6">
                {[
                  'Automates the posts your venue repeats every month',
                  'Handles the 80% so your team can focus on more creative posts',
                  'Designed for venues',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="mt-1 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-lg text-gray-900 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* What Ferdy Isn't */}
          <div className="bg-gray-50 border border-gray-200 rounded-3xl p-12">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">What Ferdy isn&apos;t</p>
            <h3 className="text-2xl md:text-3xl font-bold mb-10 text-gray-900">
              Not a replacement for your creativity
            </h3>
            <ul className="space-y-6">
              {[
                'Not for big creative hero campaigns',
                'Not for thought leadership or opinion pieces',
                'Not for reactive, in-the-moment posts',
                'Not a tool that replaces your creative thinking',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="mt-1 w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 shrink-0">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <span className="text-lg text-gray-700 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
