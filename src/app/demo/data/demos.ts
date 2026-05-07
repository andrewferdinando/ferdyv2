import type { DemoKey, ScopeResult, UnsplashImage } from './types'

const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`

const t = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=400&q=80&auto=format&fit=crop`

// Helper for demo Unsplash images — names are placeholders that mimic the
// shape of real Unsplash attribution. Real /demo runs use actual photographer
// credit data returned by the Unsplash API.
//
// IMPORTANT: scraped (`images`) and per-category (`unsplashImages`) pools
// must be disjoint within the same brand so the picker doesn't show the
// same photo twice across the two sections.
const stock = (
  id: string,
  photographerName: string
): UnsplashImage => ({
  url: u(id),
  thumbUrl: t(id),
  photographerName,
  photographerUrl: 'https://unsplash.com',
  unsplashUrl: `https://unsplash.com/photos/${id}`,
})

const hospitality: ScopeResult = {
  businessName: 'The Wharf Bistro & Bar',
  homepageUrl: 'thewharfbistro.co.nz',
  // Generic restaurant/bar atmosphere — what we'd plausibly pull from a
  // hospitality brand's website. Deliberately not category-specific.
  images: [
    u('1551218808-94e220e084d2'), // wine pour
    u('1572116469696-31de0f17cc34'), // bartender
    u('1559329007-40df8a9345d8'), // bar at night
    u('1577219491135-ce391730fb2c'), // pasta plate
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
      unsplashImages: [
        stock('1493225457124-a3eb161ffa5f', 'Sara Anderson'),
        stock('1501386761578-eac5c94b800a', 'James Wright'),
        stock('1459749411175-04bf5292ceea', 'Mike Chen'),
        stock('1514525253161-7a46d19cd819', 'Emma Wilson'),
      ],
      exampleCaptions: [
        "Sunday on the deck hits different. Local act spinning acoustic sets from 3, Sunday roast on the menu, harbour out the window. Slide in for a pint, bring the family — kids welcome till 8.",
        "Rain's holding off, the band's loading in. Live music from 3pm today on the deck, roast lamb on special. Group of 6+? Worth a quick booking.",
      ],
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
      unsplashImages: [
        stock('1571091718767-18b5b1457add', 'Lucas Mendes'),
        stock('1550547660-d9450f859349', 'Anna Pierce'),
        stock('1568901346375-23c9450c58cd', 'Tom Hayes'),
        stock('1586190848861-99aa4a171e90', 'Marcus Bell'),
      ],
      exampleCaptions: [
        "It's Tuesday. You know what to do. Wagyu burger, half price, all night. NZ Wakanui beef, smoked cheddar, the sauce. Fries extra, kitchen open till 10.",
        "Half-price wagyu burger night. $14 instead of $28. No bookings, just turn up. Veggie option same price for the herbivores. See you Tuesday.",
      ],
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
      unsplashImages: [
        stock('1517248135467-4c7edcad34c4', 'Olivia Rose'),
        stock('1414235077428-338989a2e8c0', 'David Park'),
        stock('1592861956120-e524fc739696', 'Sophia Reed'),
      ],
      exampleCaptions: [
        "Got a birthday, work do, or hen's coming up? The upstairs room seats 8 to 20 at one long table, with the harbour right outside. Two-course set menu from $65pp, three-course from $85, and the room hire is on us once you hit the food/drink minimum.",
        "Planning a milestone meal? Our private dining room is built for it — one big table, harbour view, your own space. Book at least two weeks out and we'll handle the rest.",
      ],
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
      unsplashImages: [
        stock('1505373877841-8d25f7d46678', 'Hannah Liu'),
        stock('1519671482749-fd09be7ccebf', 'Marcus Bell'),
        stock('1464366400600-7168b8af9bc3', 'Ines Martin'),
      ],
      exampleCaptions: [
        "Looking for a venue with character? The whole ground floor's yours — 60 seated, 120 standing, full AV, our kitchen on the food. Canapés from $45pp, plated dinners from $95. Weekends book out 8 weeks ahead, so worth a chat sooner rather than later.",
        "Wedding, work do, or birthday the size of a small army — we've done all three this month alone. Reach out and we'll send through the menus and floor plans.",
      ],
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
      unsplashImages: [
        stock('1543589077-47d81606c1bf', 'Lucas Mendes'),
        stock('1607435037-9deddebb14b5', 'Anna Pierce'),
        stock('1606923829579-0cb981a83e2e', 'Tom Hayes'),
      ],
      exampleCaptions: [
        "Christmas function bookings open 15 November. Two packages — Bistro Buffet at $79pp and Wharf Plated at $120pp, both with venue, drinks, and the full festive treatment. Last year most weekend dates were locked in within 10 days. Don't be the team scrambling for a venue in December.",
        "Heads up — Christmas function slots open in two weeks. If you've got a 20-strong team and a December deadline, get the date in your calendar before everyone else does the same.",
      ],
    },
  ],
}

const coffee: ScopeResult = {
  businessName: 'Mt Eden Roasters',
  homepageUrl: 'mtedenroasters.co.nz',
  // Generic coffee brand vibe — barista hands, steam, latte. Distinct from
  // every per-category set so the picker has no overlap.
  images: [
    u('1442550528053-c431ecb55509'), // steam off cup
    u('1521017432531-fbd92d768814'), // hand holding cup
    u('1500380804539-4e1e8c1e7118'), // coffee on table
    u('1559056199-641a0ac8b55e'), // latte with milk
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
      unsplashImages: [
        stock('1495474472287-4d71bcdd2085', 'Anna Pierce'),
        stock('1559496417-e7f25cb247f3', 'Liam Walsh'),
        stock('1517256064527-09c73fc73e38', 'Sara Anderson'),
        stock('1547894137-99290ddc89df', 'James Wright'),
      ],
      exampleCaptions: [
        "The House Blend. 70% Cerrado, 30% Huila, medium roast. Dark chocolate, hazelnut, brown sugar with a clean citrus finish. Pulls a beautiful espresso, sings in milk, behaves itself in the plunger. Roasted weekly, in your hands within 48 hours.",
        "If you're new to us, start here. House Blend's the one — 250g for $22, subscription saves you 10%. Whole bean or ground, your call.",
      ],
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
      unsplashImages: [
        stock('1559925393-8be0ec4767c8', 'Emma Wilson'),
        stock('1497935586351-b67a49e012bf', 'Tom Hayes'),
        stock('1517701550927-30cf4ba1dba5', 'Olivia Rose'),
      ],
      exampleCaptions: [
        "Saturday morning cupping. Four single origins side by side, hosted by Tom. $15pp, brings you a brew guide and a 250g bag of your favourite to take home. Eight spots a week — book in.",
        "Best $15 you'll spend on a Saturday. Cupping starts 10am, gift vouchers if you know someone who'd love it.",
      ],
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
      unsplashImages: [
        stock('1442512595331-e89e73853f31', 'David Park'),
        stock('1509042239860-f550ce710b93', 'Sophia Reed'),
        stock('1453614512568-c4024d13c247', 'Marcus Bell'),
      ],
      exampleCaptions: [
        "Friday afternoon at the bench. Beans roasting through the glass, banana bread fresh out, the dog under the window seat. Open till 3.",
        "Slow morning kind of day. Pour-over, toastie, sit a while. We're here.",
      ],
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
      unsplashImages: [
        stock('1485808191679-5f86510681a2', 'Hannah Liu'),
        stock('1518032406996-3c5d5c79c7eb', 'Ines Martin'),
        stock('1447933601403-0c6688de566e', 'Tom Hayes'),
      ],
      exampleCaptions: [
        "Two weeks out. The Yirgacheffe lands 20 June — washed process, light roast, grown by the Konga Cooperative in southern Ethiopia. Bergamot, jasmine, lemon zest, that thin tea-like body filter coffee people queue for. We've got 75 bags. They went in 12 days last year.",
        "Counting down. The new single origin drops next week — $32 a bag, online and in the cafe. If you want one, set yourself a reminder. Last year they sold out fast.",
      ],
    },
  ],
}

const skincare: ScopeResult = {
  businessName: "Moso'oi Beauty",
  homepageUrl: 'mosooibeauty.co.nz',
  // Generic skincare brand vibe — packaging close-ups, brand flatlays. Not
  // tied to any single category.
  images: [
    u('1556228720-195a672e8a03'), // skincare flatlay
    u('1573496359142-b8d87734a5a2'), // workspace / studio
    u('1611080541599-86b3ae1f3b3e'), // close product flatlay
    u('1519415943484-9fa1873496d4'), // bottle on tile
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
      unsplashImages: [
        stock('1556228453-efd6c1ff04f6', 'Lucas Mendes'),
        stock('1612817288484-6f916006741a', 'Olivia Rose'),
        stock('1522337360788-8b13dee7a37e', 'Sara Anderson'),
        stock('1570194065650-d99fb4bedf0a', 'Hannah Liu'),
      ],
      exampleCaptions: [
        "Cold-pressed moso'oi oil, niacinamide, ceramides, squalane. That's it — no synthetic fragrance, no sulphates, no parabens. Built for dry to combination skin that's tired of being stripped. 50ml goes about three months. $84.",
        "What it does: locks in moisture overnight without feeling heavy. What it doesn't do: smell like a perfume counter. Frangipani oil from a family press in Apia.",
      ],
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
      unsplashImages: [
        stock('1607602132700-068258431c6c', 'Emma Wilson'),
        stock('1494790108377-be9c29b29330', 'Anna Pierce'),
        stock('1438761681033-6461ffad8d80', 'Marcus Bell'),
      ],
      exampleCaptions: [
        "Lani started Moso'oi from her Auckland apartment in 2022 after years of skincare that just didn't work for her dry, sensitive skin. The brand's named after her grandmother's favourite flower — frangipani in Samoan. She still flies to Apia twice a year to visit the family who press the oil. The lab moved out of the apartment last year. Some things scaled. The principles didn't.",
        "Founder Friday. Lani's a chemist by training, an obsessive formulator by nature, and the only person who's allowed to sign off on a new product. That's why we move slow — and why our customers stick around.",
      ],
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
      unsplashImages: [
        stock('1571781926291-c477ebfd024b', 'Sophia Reed'),
        stock('1620916566398-39f1143ab7be', 'Ines Martin'),
        stock('1631730486572-226d1f595b68', 'Tom Hayes'),
      ],
      exampleCaptions: [
        "Cleanse, serum, cream. Three products, twice a day. The Pacific Cleanser ($42) takes makeup off without stripping. The Hydration Serum ($68) preps the skin. The Moso'oi Face Cream ($84) does the overnight work. Bundled at $169 — saves you $25 vs buying them separately.",
        "Looking for a routine that doesn't require a degree? This one. First results around day 14, full results at six weeks. Bundle saves $25.",
      ],
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
      unsplashImages: [
        stock('1545239351-cefa43af60f3', 'Liam Walsh'),
        stock('1517722014278-c256a91a6fba', 'David Park'),
        stock('1462965326201-d02e4f455804', 'Olivia Rose'),
      ],
      exampleCaptions: [
        "Spring Collection drops 1 October. Three new pieces — a Lightweight Day Cream ($72), a stabilised Vitamin C Brightening Serum at 10% THD with niacinamide ($78), and a limited-edition Frangipani Body Oil ($56), single batch, 800 units. Pre-orders open 15 September with 15% off and free shipping launch week. Set your alarm.",
        "Two weeks until pre-orders open. The body oil is the one that's making us nervous — only 800 made. Get on the list.",
      ],
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
