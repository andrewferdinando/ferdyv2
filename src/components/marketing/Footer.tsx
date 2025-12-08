import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="container py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <Link href="/" className="block hover:opacity-90">
              <span className="text-4xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-6 block">
                Ferdy
              </span>
            </Link>
            <p className="text-base text-gray-600 max-w-xs leading-relaxed">
              Automate the repeatable, reliable posts that every brand needs week after week.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold mb-6 text-gray-900">Product</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><a href="#features" className="hover:text-blue-600 transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it works</a></li>
              <li><a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-6 text-gray-900">Company</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-6 text-gray-900">Legal</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t text-center text-sm text-gray-600">
          © {new Date().getFullYear()} Ferdy. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
