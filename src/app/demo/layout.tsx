import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Could some of your posts be on autopilot?',
  description: 'Drop in your URL and we’ll show you what Ferdy could automate.',
  robots: { index: false, follow: false },
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 antialiased">
      {children}
    </div>
  )
}
