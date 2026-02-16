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
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            <div className="absolute -inset-3 bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 rounded-3xl"></div>
            <div className="relative bg-white rounded-2xl p-2 shadow-lg">
              <div className="rounded-xl overflow-hidden aspect-video">
                <iframe
                  style={{ border: 0 }}
                  width="100%"
                  height="100%"
                  src="https://www.tella.tv/video/vid_cmlplu08d00md04k37y8y0zq9/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0"
                  title="Ferdy Demo Video"
                  allowFullScreen
                  allowTransparency
                ></iframe>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">See how Ferdy automates your social media</p>
        </div>
      </div>
    </section>
  );
}
