import type { DemoKey, ScopeResult } from './types'

const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`

const hospitality: ScopeResult = {
  businessName: 'The Wharf Bistro & Bar',
  homepageUrl: 'thewharfbistro.co.nz',
  images: [
    u('1414235077428-338989a2e8c0'),
    u('1517248135467-4c7edcad34c4'),
    u('1592861956120-e524fc739696'),
    u('1592861956120-e524fc739696'),
    u('1568901346375-23c9450c58cd'),
    u('1571091718767-18b5b1457add'),
    u('1550547660-d9450f859349'),
    u('1493225457124-a3eb161ffa5f'),
    u('1501386761578-eac5c94b800a'),
    u('1459749411175-04bf5292ceea'),
    u('1514525253161-7a46d19cd819'),
    u('1519671482749-fd09be7ccebf'),
    u('1464366400600-7168b8af9bc3'),
    u('1505373877841-8d25f7d46678'),
  ],
  items: [
    {
      id: 'hosp-music',
      type: 'recurring',
      title: 'Sunday Live Music',
      subtitle: 'Weekly live acts on the deck',
      icon: 'music',
      iconColor: 'pink',
      formatBlurb:
        'A weekly drumbeat post promoting the Sunday afternoon live music slot. Same vibe imagery — band shots, microphones, the deck at golden hour — paired with rotating copy about the act, the menu specials, and the harbour views.',
      categoryInfo:
        'Sunday Live Music runs every Sunday from 3pm–6pm on the harbourside deck. Free entry, all ages until 8pm. A rotating roster of local Wellington acts plays acoustic and small-band sets — folk, blues, soft rock. Sunday roast menu is on alongside ($28). Bookings recommended for groups of 6+. Has been running for 4 years; a mix of regulars and walk-ins.',
      schedule: 'Weekly — Thursdays',
      postTime: '7pm',
      hashtags: ['#livemusic', '#wellingtonlivemusic', '#sundaysessions', '#wellingtonbar'],
      postLength: 'Short',
      imageHints: ['live music', 'band', 'guitar', 'microphone'],
      defaultImageIndices: [],
    },
    {
      id: 'hosp-burger',
      type: 'recurring',
      title: 'Burger Tuesday',
      subtitle: 'Half-price wagyu every Tuesday',
      icon: 'burger',
      iconColor: 'yellow',
      formatBlurb:
        "Tuesday's reliable hook. The same set of burger shots gets reused weekly with copy variations leaning into the value, the late-night kitchen, and the sides.",
      categoryInfo:
        'Burger Tuesday: half-price wagyu burgers all night every Tuesday — $14 (regularly $28). Made with NZ Wakanui beef, brioche bun, smoked cheddar, special sauce, butter lettuce. Sides extra: shoestring fries $7, truffle fries $11. Kitchen runs until 10pm. Dine-in and takeaway. No bookings — first-come, first-served. Vegetarian option (mushroom + halloumi) available at the same price.',
      schedule: 'Weekly — Mondays',
      postTime: '12pm',
      hashtags: ['#burgertuesday', '#wagyu', '#wellingtoneats', '#midweekspecial'],
      postLength: 'Short',
      imageHints: ['burger', 'wagyu', 'fries', 'pub food'],
      defaultImageIndices: [],
    },
    {
      id: 'hosp-private',
      type: 'recurring',
      title: 'Private Dining Room',
      subtitle: 'Bookings for groups of 8–20',
      icon: 'sparkle',
      iconColor: 'indigo',
      formatBlurb:
        'A monthly nudge promoting the upstairs private dining room. Same elegant interior shots and table styling photos sit behind every post, with copy that rotates through birthdays, work dinners, and end-of-year functions.',
      categoryInfo:
        'The upstairs private dining room seats 8–20 guests at a single table. Available for lunch (12pm–3pm) and dinner (5pm–10pm) bookings. Set menu options: 2-course $65pp or 3-course $85pp, with shared starters. Drinks packages available from $40pp. Room hire is free with food/drink minimums ($600 lunch, $1200 dinner). Floor-to-ceiling windows overlooking the harbour. Suits birthdays, work dinners, hens, anniversaries, end-of-year functions. Book at least 2 weeks ahead.',
      schedule: 'Monthly — first Sunday',
      postTime: '6pm',
      hashtags: ['#privatedining', '#wellingtonfunctions', '#groupbookings'],
      postLength: 'Medium',
      imageHints: ['dining room', 'set table', 'restaurant interior', 'intimate'],
      defaultImageIndices: [],
    },
    {
      id: 'hosp-function',
      type: 'recurring',
      title: 'Function Room Hire',
      subtitle: 'Weddings, work events, parties',
      icon: 'umbrella',
      iconColor: 'blue',
      formatBlurb:
        'A monthly post promoting the venue for weddings and corporate events. Same wide-angle shots of the function space, set up for different occasions, anchor every post.',
      categoryInfo:
        'The ground-floor function space holds 60 seated or 120 standing. Includes AV setup (projector, mic, speakers), bar service, and configurable layout (theatre, banquet, cocktail). Catering by our kitchen — canapé packages from $45pp, plated dinners from $95pp. Available 5pm onwards weekdays, all-day weekends. Wheelchair accessible, on-street and rear parking. Books out 8–12 weeks ahead for weddings, 4–6 weeks for corporate events.',
      schedule: 'Monthly — third Wednesday',
      postTime: '5pm',
      hashtags: ['#weddingvenue', '#corporateevents', '#wellingtonvenue', '#functionspace'],
      postLength: 'Medium',
      imageHints: ['event venue', 'wedding', 'banquet', 'function space'],
      defaultImageIndices: [],
    },
    {
      id: 'hosp-xmas',
      type: 'event',
      title: 'Christmas Function Season',
      subtitle: 'Lead-up posts through November',
      icon: 'calendar',
      iconColor: 'red',
      formatBlurb:
        'Three lead-up posts in the two weeks before Christmas function bookings open, plus a final reminder. Designed to capture corporate teams locking in their end-of-year plans early.',
      categoryInfo:
        'Christmas function bookings open 15 November for the December season. Two packages: Bistro Buffet ($79pp, hot/cold buffet, Christmas pudding, NZ wine) and Wharf Plated ($120pp, 3-course set menu with matched wines). Both include venue hire, exclusive use of the function room, decorations, and Christmas crackers. Min spend $1500. Slots fill fast — most weekend dates booked within 10 days last year.',
      schedule: '3 posts in 2 weeks before Nov 15',
      postTime: '10am',
      hashtags: ['#christmasfunctions', '#corporatechristmas', '#endofyear'],
      postLength: 'Long',
      imageHints: ['christmas', 'corporate dinner', 'function venue'],
      defaultImageIndices: [],
    },
  ],
}

const coffee: ScopeResult = {
  businessName: 'Mt Eden Roasters',
  homepageUrl: 'mtedenroasters.co.nz',
  images: [
    u('1495474472287-4d71bcdd2085'),
    u('1559496417-e7f25cb247f3'),
    u('1497935586351-b67a49e012bf'),
    u('1442512595331-e89e73853f31'),
    u('1509042239860-f550ce710b93'),
    u('1517701550927-30cf4ba1dba5'),
    u('1485808191679-5f86510681a2'),
    u('1521017432531-fbd92d768814'),
    u('1559925393-8be0ec4767c8'),
    u('1453614512568-c4024d13c247'),
    u('1442550528053-c431ecb55509'),
    u('1517256064527-09c73fc73e38'),
  ],
  items: [
    {
      id: 'cof-blend',
      type: 'recurring',
      title: 'Signature House Blend',
      subtitle: 'Our flagship — chocolatey, smooth',
      icon: 'coffee',
      iconColor: 'yellow',
      formatBlurb:
        'A weekly hero post for the signature blend. Same product photography sits behind every post; copy varies between tasting notes, brewing tips, and the story of the blend.',
      categoryInfo:
        'Signature House Blend is our flagship roast — a 70/30 mix of Brazilian Cerrado and Colombian Huila beans, medium roast. Tasting notes: dark chocolate, hazelnut, brown sugar, light citrus finish. Designed for espresso and milk-based drinks but also works in plunger and AeroPress. Available in 250g ($22) and 1kg ($72) bags, whole bean or ground. Roasted weekly, shipped within 48 hours. Subscription option saves 10%.',
      schedule: 'Weekly — Mondays',
      postTime: '8am',
      hashtags: ['#mtedenroasters', '#houseblend', '#aucklandcoffee', '#specialtycoffee'],
      postLength: 'Medium',
      imageHints: ['coffee bag', 'espresso', 'product shot'],
      defaultImageIndices: [],
    },
    {
      id: 'cof-tasting',
      type: 'recurring',
      title: 'Coffee Tastings',
      subtitle: 'In-cafe cuppings every Saturday',
      icon: 'sparkle',
      iconColor: 'pink',
      formatBlurb:
        'A fortnightly post inviting customers to the Saturday morning tastings. Same vibe imagery — cupping table, customers tasting, the barista pouring — gets reused with copy that calls out the featured coffee.',
      categoryInfo:
        'Saturday morning cuppings run 10am–11am at the Mt Eden cafe. $15pp — taste 4 single-origin coffees side-by-side, hosted by head roaster Tom. Includes a coffee aroma wheel, brew guide, and a 250g bag of your favourite from the session. Max 8 people per session, bookings essential via website. Suits curious home brewers and gift recipients — gift vouchers available.',
      schedule: 'Fortnightly — Tuesdays',
      postTime: '10am',
      hashtags: ['#coffeetasting', '#cupping', '#mtedenauckland'],
      postLength: 'Short',
      imageHints: ['tasting', 'cupping', 'pour over', 'cafe'],
      defaultImageIndices: [],
    },
    {
      id: 'cof-cafe',
      type: 'recurring',
      title: 'Cafe Vibes',
      subtitle: 'A Friday peek inside the roastery',
      icon: 'heart',
      iconColor: 'indigo',
      formatBlurb:
        'A weekly mood post showing the cafe at work. Atmosphere shots — the bar, the bench, customers at the window seats — with light copy that nods to the weekend, the weather, or what’s on the menu.',
      categoryInfo:
        'The Mt Eden cafe is open Tue–Sun, 7am–3pm. Compact 18-seat space attached to the working roastery — customers can watch beans roasting through the glass wall. Full espresso menu, batch brew, pour-overs, plus toasties, cabinet food, and house-made banana bread. Loved by locals for the chill weekend pace. Outdoor bench seating on Mt Eden Rd, dog-friendly.',
      schedule: 'Weekly — Wednesdays',
      postTime: '11am',
      hashtags: ['#mtedencafe', '#aucklandcafe', '#fridayfeels'],
      postLength: 'Short',
      imageHints: ['cafe interior', 'barista', 'atmosphere'],
      defaultImageIndices: [],
    },
    {
      id: 'cof-release',
      type: 'event',
      title: 'Single Origin Launch',
      subtitle: 'Ethiopian Yirgacheffe drop',
      icon: 'gift',
      iconColor: 'green',
      formatBlurb:
        'A four-post lead-up to the new single origin release. Builds anticipation across two weeks — the farm, cupping notes, brew guide — then a launch-day post.',
      categoryInfo:
        'Limited Yirgacheffe single origin from Konga Cooperative, Ethiopia, washed process. 100kg green delivered, expected to yield ~75 retail bags. Tasting notes: bergamot, jasmine, lemon zest, tea-like body. Light roast — best as filter (V60, Chemex, AeroPress). Launches 20 June, $32 per 250g, available online and in-cafe. Sold out within 12 days last year.',
      schedule: '4 posts in 2 weeks before Jun 20',
      postTime: '9am',
      hashtags: ['#singleorigin', '#yirgacheffe', '#newrelease', '#specialtycoffee'],
      postLength: 'Long',
      imageHints: ['coffee beans', 'product launch', 'pour over'],
      defaultImageIndices: [],
    },
  ],
}

const skincare: ScopeResult = {
  businessName: "Moso'oi Beauty",
  homepageUrl: 'mosooibeauty.co.nz',
  images: [
    u('1556228720-195a672e8a03'),
    u('1570194065650-d99fb4bedf0a'),
    u('1612817288484-6f916006741a'),
    u('1571781926291-c477ebfd024b'),
    u('1607602132700-068258431c6c'),
    u('1573496359142-b8d87734a5a2'),
    u('1522337360788-8b13dee7a37e'),
    u('1556228453-efd6c1ff04f6'),
    u('1598440947619-2c35fc9aa908'),
    u('1612817288484-6f916006741a'),
    u('1631730486572-226d1f595b68'),
    u('1620916566398-39f1143ab7be'),
  ],
  items: [
    {
      id: 'skin-cream',
      type: 'recurring',
      title: "Moso'oi Face Cream",
      subtitle: 'The hero — Pacific botanicals',
      icon: 'sparkle',
      iconColor: 'pink',
      formatBlurb:
        'A weekly hero post for the signature face cream. Same product photography sits behind every post — jar shot, texture close-up, application — with copy that rotates between ingredient stories, customer results, and routine tips.',
      categoryInfo:
        "Moso'oi Face Cream is our hero product — a rich overnight moisturiser with cold-pressed moso'oi (frangipani) oil sourced from a Samoan family-run press. Other key ingredients: niacinamide 5%, ceramides, squalane. For dry to combination skin, pH-balanced, non-comedogenic. 50ml jar, $84. Free of synthetic fragrance, sulphates, and parabens. Made in small batches in Auckland. Average reorder is 3 months.",
      schedule: 'Weekly — Tuesdays',
      postTime: '7pm',
      hashtags: ['#mosooibeauty', '#nzskincare', '#facecream', '#cleanbeauty'],
      postLength: 'Medium',
      imageHints: ['face cream', 'product shot', 'jar', 'skincare'],
      defaultImageIndices: [],
    },
    {
      id: 'skin-founder',
      type: 'recurring',
      title: 'About Our Founder',
      subtitle: "Lani's story, monthly",
      icon: 'heart',
      iconColor: 'indigo',
      formatBlurb:
        'A monthly brand story post. Founder portrait and workspace imagery anchor every post; copy rotates through what inspired the brand, the Samoan ingredient sourcing, and the formulation choices.',
      categoryInfo:
        "Founder Lani Tuilaepa started Moso'oi in 2022 from her Auckland apartment after years of struggling to find skincare that worked for her dry, sensitive skin. The brand is named after the Samoan word for frangipani — her grandmother's favourite flower. She works directly with a family-run cold-press oil maker in Apia, paying above market rates and visiting twice a year. All formulations developed in-house with consulting cosmetic chemist. Manufacturing moved to a small Auckland lab in 2024.",
      schedule: 'Monthly — first Wednesday',
      postTime: '6pm',
      hashtags: ['#founderstory', '#nzbusiness', '#cleanbeauty', '#smallbatch'],
      postLength: 'Long',
      imageHints: ['founder', 'portrait', 'workspace', 'brand story'],
      defaultImageIndices: [],
    },
    {
      id: 'skin-range',
      type: 'recurring',
      title: 'Hydration Trio',
      subtitle: 'Cleanser, serum, cream — the routine',
      icon: 'star',
      iconColor: 'green',
      formatBlurb:
        'A fortnightly post for the three-step routine. Flatlay and routine shots get reused with copy variations on morning vs evening use, results timelines, and bundle savings.',
      categoryInfo:
        "The Hydration Trio is our complete daily routine: 1) Pacific Cleanser ($42, 150ml) — gel cleanser with kawakawa and aloe, removes makeup without stripping. 2) Hydration Serum ($68, 30ml) — hyaluronic acid + Pacific botanicals, preps skin for moisturiser. 3) Moso'oi Face Cream ($84, 50ml) — the overnight hero. Bundled together for $169 (saves $25). Recommended order: cleanse, serum, cream — morning and evening. First results visible at 14 days, full results at 6 weeks.",
      schedule: 'Fortnightly — Sundays',
      postTime: '11am',
      hashtags: ['#skincareroutine', '#hydration', '#mosooi', '#cleanbeauty'],
      postLength: 'Medium',
      imageHints: ['flatlay', 'routine', 'product trio'],
      defaultImageIndices: [],
    },
    {
      id: 'skin-launch',
      type: 'event',
      title: 'Spring Collection Launch',
      subtitle: 'New botanicals dropping in October',
      icon: 'gift',
      iconColor: 'yellow',
      formatBlurb:
        'A five-post countdown leading into the spring collection launch. Builds the story across two weeks — botanical sourcing, behind-the-scenes formulation, packaging reveal, then launch day.',
      categoryInfo:
        'Spring Collection 2026 launches 1 October — three new products: Lightweight Day Cream ($72), Vitamin C Brightening Serum ($78), and a limited-edition Frangipani Body Oil ($56). Day Cream is SPF-free for layering with sunscreen. The Vitamin C uses stabilised THD ascorbate (10%) with niacinamide. The body oil is single-batch — only 800 units. Pre-orders open 15 September with a 15% early-bird discount. Free shipping NZ-wide on launch week.',
      schedule: '5 posts in 2 weeks before Oct 1',
      postTime: '8pm',
      hashtags: ['#springlaunch', '#newproduct', '#mosooibeauty', '#nzbusiness'],
      postLength: 'Long',
      imageHints: ['product launch', 'botanicals', 'packaging'],
      defaultImageIndices: [],
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
