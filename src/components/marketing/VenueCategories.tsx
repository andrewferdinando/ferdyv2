import {
  UtensilsCrossed,
  BedDouble,
  PartyPopper,
  Building2,
  Gamepad2,
  Trees,
  Drama,
  Dumbbell,
  type LucideIcon,
} from 'lucide-react'

interface Category {
  icon: LucideIcon
  title: string
  examples: string
  iconBg: string
  iconColor: string
  hoverBorder: string
}

const categories: Category[] = [
  {
    icon: UtensilsCrossed,
    title: 'Hospitality & Dining',
    examples:
      'Restaurants, cafés, bars, pubs, breweries, distilleries, wineries, cellar doors.',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    hoverBorder: 'hover:border-amber-300',
  },
  {
    icon: BedDouble,
    title: 'Accommodation',
    examples:
      'Hotels, motels, lodges, holiday parks, B&Bs, resorts, retreats.',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-700',
    hoverBorder: 'hover:border-sky-300',
  },
  {
    icon: PartyPopper,
    title: 'Events & Functions',
    examples:
      'Wedding venues, function centres, conference, convention & exhibition halls.',
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-700',
    hoverBorder: 'hover:border-pink-300',
  },
  {
    icon: Building2,
    title: 'Workspace & Business',
    examples:
      'Co-working spaces, serviced offices, meeting & training rooms.',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-700',
    hoverBorder: 'hover:border-slate-300',
  },
  {
    icon: Gamepad2,
    title: 'Family Entertainment Centres',
    examples:
      'Mini golf, escape rooms, bowling, climbing, go karts, arcades.',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-700',
    hoverBorder: 'hover:border-violet-300',
  },
  {
    icon: Trees,
    title: 'Attractions & Experiences',
    examples:
      'Zoos, aquariums, botanic gardens, theme parks, heritage sites, zip wires, bungee.',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    hoverBorder: 'hover:border-emerald-300',
  },
  {
    icon: Drama,
    title: 'Arts & Culture',
    examples:
      'Theatres, performing arts centres, cinemas, museums, galleries.',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
    hoverBorder: 'hover:border-rose-300',
  },
  {
    icon: Dumbbell,
    title: 'Fitness & Wellness',
    examples:
      'Gyms, health clubs, pilates & yoga studios, day spas.',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-700',
    hoverBorder: 'hover:border-teal-300',
  },
]

export default function VenueCategories() {
  return (
    <section id="venues" className="py-24 bg-gray-50">
      <div className="container">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            Built for venues like yours
          </h2>
          <p className="text-xl text-gray-600">
            If your venue runs a regular programme, Ferdy keeps it visible — without the weekly scramble.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <div
                key={category.title}
                className={`group bg-white border border-gray-200 ${category.hoverBorder} rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}
              >
                <div className={`w-12 h-12 rounded-xl ${category.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`w-6 h-6 ${category.iconColor}`} strokeWidth={2} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2 leading-tight">
                  {category.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {category.examples}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
