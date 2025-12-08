import Link from 'next/link'

const soloFeatures = [
  "Free onboarding and training",
  "1 brand",
  "Up to 30 posts per month",
  "Repeatable post engine",
  "Ongoing automation",
  "Edit or override any post",
  "Unlimited users",
  "Email + Loom support"
]

const multiFeatures = [
  "Free onboarding and training",
  "Multi brands",
  "Up to 30 posts per month",
  "Repeatable post engine",
  "Ongoing automation",
  "Edit or override any post",
  "Unlimited users",
  "Email + Loom support"
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-gray-50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Simple Pricing</h2>
          <p className="text-xl text-gray-600">Choose the plan that fits your scale.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Solo Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 flex flex-col">
            <div className="mb-6">
              <h3 className="text-3xl font-bold mb-2 text-gray-900">Solo</h3>
              <p className="text-gray-600 mb-6">Perfect for single brands.</p>
              <div className="mb-2">
                <span className="text-5xl font-bold text-gray-900">US$86</span>
                <span className="text-gray-600 text-lg"> /month</span>
              </div>
              <p className="text-sm text-gray-500">*GST additional for NZ businesses</p>
            </div>

            <ul className="space-y-4 mb-8 flex-grow">
              {soloFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 text-base">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/auth/sign-in"
              className="block w-full text-center px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg rounded-xl transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Multi Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 flex flex-col">
            <div className="mb-6">
              <h3 className="text-3xl font-bold mb-2 text-gray-900">Multi</h3>
              <p className="text-gray-600 mb-6">Perfect for agencies and companies with multiple brands</p>
              <div className="mb-2">
                <span className="text-3xl font-bold text-gray-900">Custom pricing</span>
              </div>
              <p className="text-sm text-gray-500 invisible">Placeholder for alignment</p>
            </div>

            <ul className="space-y-4 mb-8 flex-grow">
              {multiFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 text-base">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/contact"
              className="block w-full text-center px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg rounded-xl transition-colors"
            >
              Book call
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
