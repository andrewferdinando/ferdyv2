import { PenTool, Image as ImageIcon, Calendar, Send, ArrowRight, type LucideIcon } from 'lucide-react'
import FerdyPublishedPostDesktop from './FerdyPublishedPostDesktop'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
  accentBg: string
  accentText: string
}

const features: Feature[] = [
  {
    icon: PenTool,
    title: 'AI-generated copy',
    description:
      "Fresh copy every time, written from your venue details and matched to your tone of voice.",
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-600',
  },
  {
    icon: ImageIcon,
    title: 'Auto-selected media',
    description:
      'Rotates through your image and video library so posts always look fresh.',
    accentBg: 'bg-sky-50',
    accentText: 'text-sky-600',
  },
  {
    icon: Calendar,
    title: 'Auto-scheduled',
    description:
      'Posts go out weekly, monthly or on set dates. Set it once and leave it.',
    accentBg: 'bg-orange-50',
    accentText: 'text-orange-600',
  },
  {
    icon: Send,
    title: 'Auto-published',
    description:
      'Publishes to Facebook, Instagram Feed and Stories — all at once.',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-600',
  },
]

export default function TurnIntoSystem() {
  return (
    <section className="py-24 bg-white">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Turn recurring posts into a system
          </h2>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            Set up your post categories, schedule and media once. Ferdy turns that into a reliable monthly publishing system.
          </p>
        </div>

        {/* Connected flow of 4 features */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-3 relative">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="relative">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 transition-all">
                    {/* Step indicator + icon */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-bold text-gray-400 tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                      <div className={`w-10 h-10 rounded-xl ${feature.accentBg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${feature.accentText}`} strokeWidth={2} />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  {/* Connector arrow between cards (desktop only) */}
                  {i < features.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-2 -translate-y-1/2 z-10 w-4 h-4 items-center justify-center text-gray-300">
                      <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Post mock as the proof — framed below the features */}
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-[2rem] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border border-blue-100 p-8 md:p-14 overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full blur-3xl -mr-20 -mt-20 opacity-40" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full blur-3xl -ml-20 -mb-20 opacity-30" />

            <div className="relative z-10">
              <div className="text-center mb-8">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/80 border border-gray-200 text-xs font-semibold text-gray-600 tracking-wide uppercase shadow-sm">
                  What Ferdy publishes
                </span>
              </div>
              <FerdyPublishedPostDesktop />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
