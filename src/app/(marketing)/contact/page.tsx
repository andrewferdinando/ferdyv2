export const metadata = {
  title: 'Contact Us – Ferdy',
  description: 'Get in touch with the Ferdy team',
}

export default function Contact() {
  return (
    <div className="py-24 bg-white">
      <div className="container max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">Contact Us</h1>
        <p className="text-xl text-gray-600 mb-12">
          Have questions about Ferdy? We'd love to hear from you.
        </p>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Get in Touch</h2>
            <p className="text-gray-600 mb-4">
              For inquiries about Ferdy, please email us at:
            </p>
            <a href="mailto:hello@ferdy.io" className="text-blue-600 hover:text-blue-700 font-medium text-lg">
              hello@ferdy.io
            </a>
          </div>

          <div className="pt-8 border-t">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Book a Demo</h2>
            <p className="text-gray-600 mb-4">
              Want to see Ferdy in action? Schedule a personalized demo with our team.
            </p>
            <a 
              href="/auth/sign-in"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Get Started
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
