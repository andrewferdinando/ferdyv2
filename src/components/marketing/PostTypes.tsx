import { CalendarDays, CalendarRange, Sparkles, type LucideIcon } from 'lucide-react'

interface PostType {
  icon: LucideIcon
  badge: string
  badgeColor: string
  title: string
  description: string
  examples: { label: string; cadence: string }[]
  accentBg: string
  accentBorder: string
  accentText: string
}

const postTypes: PostType[] = [
  {
    icon: CalendarDays,
    badge: 'Weekly',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    title: 'Recurring weekly posts',
    description:
      'For the regular programme: weekly trivia, classes, live music, Friday Sessions.',
    examples: [
      { label: 'Friday Sessions', cadence: 'Every Thu' },
      { label: 'Weekend Brunch', cadence: 'Every Fri' },
      { label: 'Quiz Night', cadence: 'Every Mon' },
    ],
    accentBg: 'bg-blue-50',
    accentBorder: 'border-blue-100',
    accentText: 'text-blue-700',
  },
  {
    icon: CalendarRange,
    badge: 'Monthly',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    title: 'Monthly themed posts',
    description:
      'For your spaces, packages and seasonal offerings on a steady monthly rotation.',
    examples: [
      { label: 'Function spaces', cadence: '1st of month' },
      { label: 'Corporate events', cadence: '15th of month' },
      { label: 'Private dining', cadence: 'Last Friday' },
    ],
    accentBg: 'bg-purple-50',
    accentBorder: 'border-purple-100',
    accentText: 'text-purple-700',
  },
  {
    icon: Sparkles,
    badge: 'Events',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
    title: 'Event countdown posts',
    description:
      'For one-off events. Tell Ferdy when it starts and ends - it schedules the lead-up posts automatically.',
    examples: [
      { label: 'Save the date', cadence: '7 days before' },
      { label: 'Building up', cadence: '3 days before' },
      { label: 'Doors open', cadence: 'Day of' },
    ],
    accentBg: 'bg-pink-50',
    accentBorder: 'border-pink-100',
    accentText: 'text-pink-700',
  },
]

export default function PostTypes() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
            Weekly, monthly, and event posts
          </h2>
          <p className="text-xl text-gray-600">
            However your venue&apos;s calendar runs, Ferdy keeps it visible.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {postTypes.map((post) => {
            const Icon = post.icon
            return (
              <div
                key={post.title}
                className="bg-white border border-gray-200 rounded-2xl p-7 hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 transition-all flex flex-col"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-11 h-11 rounded-xl ${post.accentBg} ${post.accentBorder} border flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${post.accentText}`} strokeWidth={2} />
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${post.badgeColor}`}>
                    {post.badge}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2 leading-tight">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  {post.description}
                </p>

                <div className="mt-auto pt-5 border-t border-gray-100 space-y-2.5">
                  {post.examples.map((ex) => (
                    <div key={ex.label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 font-medium">{ex.label}</span>
                      <span className="text-gray-400 text-xs">{ex.cadence}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
