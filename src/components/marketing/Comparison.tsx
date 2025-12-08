export default function Comparison() {
  return (
    <section className="py-24 bg-white">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* What Ferdy Isn't */}
          <div className="bg-gray-50 border border-gray-200 rounded-3xl p-12">
            <h3 className="text-3xl font-bold mb-10 text-gray-900">What Ferdy isn&apos;t</h3>
            <ul className="space-y-6">
              {[
                "Not for big creative hero campaigns",
                "Not for cinematic video content",
                "Not for viral social moments",
                "Not a tool that replaces your creative thinking",
                "Not a blank-canvas AI generator that needs perfect prompts"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="mt-1 w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-lg text-gray-700 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What Ferdy Is */}
          <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border border-blue-100 rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
            
            <h3 className="text-3xl font-bold mb-10 text-blue-600 relative z-10">What Ferdy is</h3>
            <ul className="space-y-6 relative z-10">
              {[
                "Automates the posts you repeat every week",
                "Handles the 80% so you can focus on the 20%",
                "Perfect for product & service businesses",
                "Designed for everyday brands that value reliability"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="mt-1 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-lg text-gray-900 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
