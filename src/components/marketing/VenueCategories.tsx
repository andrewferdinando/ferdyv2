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
}

const categories: Category[] = [
  {
    icon: UtensilsCrossed,
    title: 'Hospitality & Dining',
    examples:
      'Restaurants, cafés, bars, pubs, breweries, distilleries, wineries, cellar doors.',
  },
  {
    icon: BedDouble,
    title: 'Accommodation',
    examples:
      'Hotels, motels, lodges, holiday parks, B&Bs, resorts, retreats.',
  },
  {
    icon: PartyPopper,
    title: 'Events & Functions',
    examples:
      'Wedding venues, function centres, conference, convention & exhibition halls.',
  },
  {
    icon: Building2,
    title: 'Workspace & Business',
    examples:
      'Co-working spaces, serviced offices, meeting & training rooms.',
  },
  {
    icon: Gamepad2,
    title: 'Family Entertainment Centres',
    examples:
      'Mini golf, escape rooms, bowling, climbing, go karts, arcades.',
  },
  {
    icon: Trees,
    title: 'Attractions & Experiences',
    examples:
      'Zoos, aquariums, botanic gardens, theme parks, heritage sites, zip wires, bungee.',
  },
  {
    icon: Drama,
    title: 'Arts & Culture',
    examples:
      'Theatres, performing arts centres, cinemas, museums, galleries.',
  },
  {
    icon: Dumbbell,
    title: 'Fitness & Wellness',
    examples:
      'Gyms, health clubs, pilates & yoga studios, day spas.',
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
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-blue-600" strokeWidth={2} />
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
