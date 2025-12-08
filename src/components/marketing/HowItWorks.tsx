const steps = [
  {
    number: "01",
    title: "Define your repeatable posts",
    description: "You tell us the categories you want automated: offers, reminders, FAQs, products, etc."
  },
  {
    number: "02",
    title: "Ferdy generates and publishes them",
    description: "Posts repeat based on your chosen frequency (daily, weekly, monthly)."
  },
  {
    number: "03",
    title: "You stay in control",
    description: "Approve, edit or skip. Copy and content stays fully in your hands."
  }
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">How it works</h2>
          <p className="text-xl text-gray-600">Three simple steps to consistency.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="text-center px-4 flex flex-col items-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 text-blue-600 font-bold text-3xl mb-6">
                {step.number}
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 leading-tight min-h-[4rem] flex items-center justify-center">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed text-lg">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
