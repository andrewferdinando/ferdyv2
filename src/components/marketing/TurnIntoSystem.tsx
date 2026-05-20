import { PenTool, Image as ImageIcon, Calendar, Send } from 'lucide-react'

const features = [
  {
    icon: PenTool,
    title: 'AI-generated copy',
    description:
      "Fresh copy every time, written from your venue details and matched to your tone of voice.",
  },
  {
    icon: ImageIcon,
    title: 'Auto-selected media',
    description:
      'Rotates through your image and video library so posts always look fresh.',
  },
  {
    icon: Calendar,
    title: 'Auto-scheduled',
    description:
      'Posts go out weekly, monthly or on set dates. Set it once and leave it.',
  },
  {
    icon: Send,
    title: 'Auto-published',
    description:
      'Publishes to Facebook, Instagram Feed and Stories — all at once.',
  },
]

export default function TurnIntoSystem() {
  return (
    <section className="py-24 bg-white">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Turn recurring posts into a system
          </h2>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            Set up your post categories, schedule and media once. Ferdy turns that into a reliable monthly publishing system.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-gray-300 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-blue-600" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
