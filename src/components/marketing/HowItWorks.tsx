const steps = [
  {
    number: "01",
    title: "Define your repeatable posts",
    description: "You tell us the categories you want automated: offers, reminders, FAQs, products, etc.",
    bgColor: "bg-gradient-to-br from-blue-50 to-blue-100",
    numberColor: "text-blue-300"
  },
  {
    number: "02",
    title: "Ferdy generates and publishes them",
    description: "Posts repeat based on your chosen frequency (daily, weekly, monthly).",
    bgColor: "bg-gradient-to-br from-purple-50 to-pink-100",
    numberColor: "text-purple-300"
  },
  {
    number: "03",
    title: "You stay in control",
    description: "Approve, edit or skip. Copy and content stays fully in your hands.",
    bgColor: "bg-gradient-to-br from-orange-50 to-pink-50",
    numberColor: "text-orange-300",
    hasLock: true
  }
];

export default function HowItWorks() {
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
        <div className="max-w-5xl mx-auto bg-gray-100 rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative group cursor-pointer border border-gray-200">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-blue-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <p className="absolute bottom-8 text-sm font-medium text-gray-700 bg-white/90 px-4 py-2 rounded-full shadow-sm">
            Watch how Ferdy works (1:30)
          </p>
        </div>
      </div>
    </section>
  );
}
