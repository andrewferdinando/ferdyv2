import type { DemoKey, ScopeResult } from './types'

const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`

const hospitality: ScopeResult = {
  businessName: 'The Wharf Bistro & Bar',
  homepageUrl: 'thewharfbistro.co.nz',
  images: [
    u('1414235077428-338989a2e8c0'), // restaurant interior
    u('1517248135467-4c7edcad34c4'), // set dining table
    u('1592861956120-e524fc739696'), // intimate dining
    u('1592861956120-e524fc739696'),
    u('1568901346375-23c9450c58cd'), // gourmet burger
    u('1571091718767-18b5b1457add'), // burger and fries
    u('1550547660-d9450f859349'),    // burger close-up
    u('1493225457124-a3eb161ffa5f'), // microphone
    u('1501386761578-eac5c94b800a'), // concert crowd
    u('1459749411175-04bf5292ceea'), // live guitar
    u('1514525253161-7a46d19cd819'), // band performing
    u('1519671482749-fd09be7ccebf'), // event venue
    u('1464366400600-7168b8af9bc3'), // banquet hall
    u('1505373877841-8d25f7d46678'), // wedding setup
  ],
  items: [
    {
      id: 'hosp-music',
      type: 'recurring',
      title: 'Sunday Live Music',
      subtitle: 'Weekly live acts on the deck',
      icon: 'music',
      iconColor: 'pink',
      description:
        'A weekly drumbeat post promoting the Sunday afternoon live music slot at The Wharf. Same vibe imagery — band shots, microphones, the deck at golden hour — paired with rotating copy about the act, the menu specials, and the harbour views. Posted every week so regulars know it’s on.',
      schedule: 'Weekly — Thursdays',
      postTime: '7pm',
      hashtags: ['#livemusic', '#aucklandlivemusic', '#sundaysessions', '#wellingtonlivemusic'],
      postLength: 'Short',
      imageHints: ['live music', 'band', 'guitar', 'microphone'],
      defaultImageIndices: [7, 8, 9, 10],
    },
    {
      id: 'hosp-burger',
      type: 'recurring',
      title: 'Burger Tuesday',
      subtitle: 'Half-price wagyu every Tuesday',
      icon: 'burger',
      iconColor: 'yellow',
      description:
        'Tuesday’s reliable hook — half-price wagyu burgers all night. The same set of mouth-watering burger shots gets reused weekly, with copy variations that lean into the value, the late-night kitchen, and the sides. Built to remind regulars and pull in midweek walk-ins.',
      schedule: 'Weekly — Mondays',
      postTime: '12pm',
      hashtags: ['#burgertuesday', '#wagyu', '#wellingtoneats', '#midweekspecial'],
      postLength: 'Short',
      imageHints: ['burger', 'wagyu', 'fries', 'pub food'],
      defaultImageIndices: [4, 5, 6],
    },
    {
      id: 'hosp-private',
      type: 'recurring',
      title: 'Private Dining Room',
      subtitle: 'Bookings for groups of 8–20',
      icon: 'sparkle',
      iconColor: 'indigo',
      description:
        'A monthly nudge promoting the upstairs private dining room. Same elegant interior shots and table styling photos sit behind every post, with copy that rotates between birthday bookings, work dinners, and end-of-year functions. Aimed at keeping the room in mind for the people who plan group meals.',
      schedule: 'Monthly — first Sunday',
      postTime: '6pm',
      hashtags: ['#privatedining', '#wellingtonfunctions', '#groupbookings'],
      postLength: 'Medium',
      imageHints: ['dining room', 'set table', 'restaurant interior', 'intimate'],
      defaultImageIndices: [0, 1, 2],
    },
    {
      id: 'hosp-function',
      type: 'recurring',
      title: 'Function Room Hire',
      subtitle: 'Weddings, work events, parties',
      icon: 'umbrella',
      iconColor: 'blue',
      description:
        'A monthly post promoting the venue for weddings and corporate events. The same wide-angle shots of the function space, set up for different occasions, anchor every post. Copy rotates through wedding receptions, conference dinners, and milestone parties.',
      schedule: 'Monthly — third Wednesday',
      postTime: '5pm',
      hashtags: ['#weddingvenue', '#corporateevents', '#wellingtonvenue', '#functionspace'],
      postLength: 'Medium',
      imageHints: ['event venue', 'wedding', 'banquet', 'function space'],
      defaultImageIndices: [11, 12, 13],
    },
    {
      id: 'hosp-xmas',
      type: 'event',
      title: 'Christmas Function Season',
      subtitle: 'Lead-up posts through November',
      icon: 'calendar',
      iconColor: 'red',
      description:
        'Three lead-up posts in the two weeks before Christmas function bookings open, plus a final reminder. Designed to capture corporate teams locking in their end-of-year plans early. Uses the function room shots dressed up with seasonal hints in the copy.',
      schedule: '3 posts in 2 weeks before Nov 15',
      postTime: '10am',
      hashtags: ['#christmasfunctions', '#corporatechristmas', '#endofyear'],
      postLength: 'Long',
      imageHints: ['christmas', 'corporate dinner', 'function venue'],
      defaultImageIndices: [11, 13, 0],
    },
  ],
}

const coffee: ScopeResult = {
  businessName: 'Mt Eden Roasters',
  homepageUrl: 'mtedenroasters.co.nz',
  images: [
    u('1495474472287-4d71bcdd2085'), // coffee bag
    u('1559496417-e7f25cb247f3'),    // latte art
    u('1497935586351-b67a49e012bf'), // pour over
    u('1442512595331-e89e73853f31'), // coffee shop
    u('1509042239860-f550ce710b93'), // cafe interior
    u('1517701550927-30cf4ba1dba5'), // barista at work
    u('1485808191679-5f86510681a2'), // raw coffee beans
    u('1521017432531-fbd92d768814'), // cup of coffee
    u('1559925393-8be0ec4767c8'),    // tasting
    u('1453614512568-c4024d13c247'), // beans close
    u('1442550528053-c431ecb55509'), // coffee with steam
    u('1517256064527-09c73fc73e38'), // espresso
  ],
  items: [
    {
      id: 'cof-blend',
      type: 'recurring',
      title: 'Signature House Blend',
      subtitle: 'Our flagship — chocolatey, smooth',
      icon: 'coffee',
      iconColor: 'yellow',
      description:
        'A weekly hero post for the signature blend. Same product photography — bag shots, the espresso pour, the crema — sits behind every post. Copy varies between tasting notes, brewing tips, and the story of the blend. The reliable anchor of the content rhythm.',
      schedule: 'Weekly — Mondays',
      postTime: '8am',
      hashtags: ['#mtedenroasters', '#houseblend', '#aucklandcoffee', '#specialtycoffee'],
      postLength: 'Medium',
      imageHints: ['coffee bag', 'espresso', 'product shot'],
      defaultImageIndices: [0, 1, 11, 7],
    },
    {
      id: 'cof-tasting',
      type: 'recurring',
      title: 'Coffee Tastings',
      subtitle: 'In-cafe cuppings every Saturday',
      icon: 'sparkle',
      iconColor: 'pink',
      description:
        'A fortnightly post inviting customers to the Saturday morning tastings. Same vibe imagery — the cupping table, customers tasting, the barista pouring — gets reused with copy that calls out the featured coffee that week.',
      schedule: 'Fortnightly — Tuesdays',
      postTime: '10am',
      hashtags: ['#coffeetasting', '#cupping', '#mtedenauckland'],
      postLength: 'Short',
      imageHints: ['tasting', 'cupping', 'pour over', 'cafe'],
      defaultImageIndices: [8, 2, 5],
    },
    {
      id: 'cof-cafe',
      type: 'recurring',
      title: 'Cafe Vibes',
      subtitle: 'A Friday peek inside the roastery',
      icon: 'heart',
      iconColor: 'indigo',
      description:
        'A weekly mood post showing the cafe at work. Same atmosphere shots — the bar, the bench, customers at the window seats — with light copy that nods to the weekend, the weather, or what’s on the menu. The one that builds the brand vibe.',
      schedule: 'Weekly — Wednesdays',
      postTime: '11am',
      hashtags: ['#mtedencafe', '#aucklandcafe', '#fridayfeels'],
      postLength: 'Short',
      imageHints: ['cafe interior', 'barista', 'atmosphere'],
      defaultImageIndices: [3, 4, 10],
    },
    {
      id: 'cof-release',
      type: 'event',
      title: 'Single Origin Launch',
      subtitle: 'Ethiopian Yirgacheffe drop',
      icon: 'gift',
      iconColor: 'green',
      description:
        'A four-post lead-up to the new single origin release. Builds anticipation — the farm, the cupping notes, the brewing guide — then a launch-day post when it lands on shelves. Same imagery set with countdown copy.',
      schedule: '4 posts in 2 weeks before Jun 20',
      postTime: '9am',
      hashtags: ['#singleorigin', '#yirgacheffe', '#newrelease', '#specialtycoffee'],
      postLength: 'Long',
      imageHints: ['coffee beans', 'product launch', 'pour over'],
      defaultImageIndices: [6, 9, 0, 2],
    },
  ],
}

const skincare: ScopeResult = {
  businessName: "Moso'oi Beauty",
  homepageUrl: 'mosooibeauty.co.nz',
  images: [
    u('1556228720-195a672e8a03'), // skincare flatlay
    u('1570194065650-d99fb4bedf0a'), // bottle on stone
    u('1612817288484-6f916006741a'), // serum drop
    u('1571781926291-c477ebfd024b'), // skincare set
    u('1607602132700-068258431c6c'), // founder portrait (woman)
    u('1573496359142-b8d87734a5a2'), // founder workspace
    u('1522337360788-8b13dee7a37e'), // packaging close
    u('1556228453-efd6c1ff04f6'),    // jar on dish
    u('1598440947619-2c35fc9aa908'), // brand vibes
    u('1612817288484-6f916006741a'),
    u('1631730486572-226d1f595b68'), // hand pouring oil
    u('1620916566398-39f1143ab7be'), // botanicals
  ],
  items: [
    {
      id: 'skin-cream',
      type: 'recurring',
      title: "Moso'oi Face Cream",
      subtitle: 'The hero — Pacific botanicals',
      icon: 'sparkle',
      iconColor: 'pink',
      description:
        'A weekly hero post for the signature face cream. Same product photography — the jar, the texture shot, the application — sits behind every post. Copy varies between ingredient stories, customer results, and routine tips.',
      schedule: 'Weekly — Tuesdays',
      postTime: '7pm',
      hashtags: ['#mosooibeauty', '#nzskincare', '#facecream', '#cleanbeauty'],
      postLength: 'Medium',
      imageHints: ['face cream', 'product shot', 'jar', 'skincare'],
      defaultImageIndices: [7, 0, 6, 2],
    },
    {
      id: 'skin-founder',
      type: 'recurring',
      title: 'About Our Founder',
      subtitle: "Her story, monthly",
      icon: 'heart',
      iconColor: 'indigo',
      description:
        'A monthly brand story post. Same founder portrait and workspace imagery anchor every post, with rotating copy on what inspired the brand, the Samoan ingredient sourcing, and the why behind the formulation choices. The post that builds trust over time.',
      schedule: 'Monthly — first Wednesday',
      postTime: '6pm',
      hashtags: ['#founderstory', '#nzbusiness', '#cleanbeauty', '#smallbatch'],
      postLength: 'Long',
      imageHints: ['founder', 'portrait', 'workspace', 'brand story'],
      defaultImageIndices: [4, 5, 8],
    },
    {
      id: 'skin-range',
      type: 'recurring',
      title: 'Hydration Trio',
      subtitle: 'Cleanser, serum, cream — the routine',
      icon: 'star',
      iconColor: 'green',
      description:
        'A fortnightly post for the three-step routine. Same flatlay and routine shots get reused with copy variations on morning vs evening use, results timelines, and bundle savings. Anchors the cross-sell.',
      schedule: 'Fortnightly — Sundays',
      postTime: '11am',
      hashtags: ['#skincareroutine', '#hydration', '#mosooi', '#cleanbeauty'],
      postLength: 'Medium',
      imageHints: ['flatlay', 'routine', 'product trio'],
      defaultImageIndices: [0, 3, 11],
    },
    {
      id: 'skin-launch',
      type: 'event',
      title: 'Spring Collection Launch',
      subtitle: 'New botanicals dropping in October',
      icon: 'gift',
      iconColor: 'yellow',
      description:
        'A five-post countdown leading into the spring collection launch. Builds the story across two weeks — botanical sourcing, behind-the-scenes formulation, packaging reveal, then the launch day post. Same product imagery with countdown copy.',
      schedule: '5 posts in 2 weeks before Oct 1',
      postTime: '8pm',
      hashtags: ['#springlaunch', '#newproduct', '#mosooibeauty', '#nzbusiness'],
      postLength: 'Long',
      imageHints: ['product launch', 'botanicals', 'packaging'],
      defaultImageIndices: [11, 6, 2, 7],
    },
  ],
}

export const DEMOS: Record<DemoKey, ScopeResult> = {
  hospitality,
  coffee,
  skincare,
}

export const DEMO_LIST: { key: DemoKey; label: string; sublabel: string }[] = [
  { key: 'hospitality', label: 'The Wharf Bistro & Bar', sublabel: 'Hospitality — Wellington' },
  { key: 'coffee', label: 'Mt Eden Roasters', sublabel: 'Coffee roastery — Auckland' },
  { key: 'skincare', label: "Moso'oi Beauty", sublabel: 'Skincare brand — Online' },
]
