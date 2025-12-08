import Link from 'next/link'

const soloFeatures = [
  "1 brand",
  "Up to 30 posts per month",
  "Repeatable post engine",
  "Ongoing automation",
  "Edit or override any post",
  "Unlimited users",
  "Email + Loom support"
]

const multiFeatures = [
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
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 flex flex-col">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            
            <div className="p-8 text-center border-b min-h-[220px] flex flex-col justify-center">
              <h3 className="text-3xl font-bold mb-2 text-gray-900">Solo</h3>
              <p className="text-gray-600 mb-6 min-h-[48px] flex items-center justify-center">Perfect for single brands.</p>
              <div className="mb-2">
                <span className="text-5xl font-bold text-gray-900">US$86</span>
                <span className="text-gray-600 text-lg">/month</span>
              </div>
              <p className="text-xs text-gray-500">*GST additional for NZ businesses</p>
            </div>

            <div className="p-8 flex-grow bg-gray-50">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">Free onboarding and training</span>
                    <span className="text-xs text-gray-500">
                      Launch offer, <span className="line-through">normally $200</span>
                    </span>
                  </div>
                </li>
                {soloFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 border-t bg-white">
              <Link
                href="/auth/sign-in"
                className="block w-full text-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* Multi Plan */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 flex flex-col">
            <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            
            <div className="p-8 text-center border-b min-h-[220px] flex flex-col justify-center">
              <h3 className="text-3xl font-bold mb-2 text-gray-900">Multi</h3>
              <p className="text-gray-600 mb-6 min-h-[48px] flex items-center justify-center">Perfect for agencies and companies with multiple brands</p>
              <div className="mb-2">
                <span className="text-5xl font-bold text-gray-900">Book call</span>
              </div>
              <p className="text-xs text-gray-500 invisible">Placeholder</p>
            </div>

            <div className="p-8 flex-grow bg-gray-50">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0 mt-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">Free onboarding and training</span>
                    <span className="text-xs text-gray-500">
                      Launch offer, <span className="line-through">normally $200</span>
                    </span>
                  </div>
                </li>
                {multiFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 border-t bg-white">
              <Link
                href="/contact"
                className="block w-full text-center px-6 py-3 bg-pink-100 hover:bg-pink-200 text-pink-900 font-semibold rounded-full transition-colors"
              >
                Book call
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
