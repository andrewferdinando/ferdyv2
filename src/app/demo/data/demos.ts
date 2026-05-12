import type { DemoKey, ScopeResult, UnsplashImage } from './types'

// Unsplash CDN helpers for stock photo supplementation in demos.
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

// =============================================================================
// 1) SNOW PLANET — NZ's only indoor snow dome, Auckland (snowplanet.co.nz)
// =============================================================================
const snowplanet: ScopeResult = {
  businessName: 'Snowplanet',
  homepageUrl: 'snowplanet.co.nz',
  // Real images scraped from the snowplanet.co.nz site — generic brand vibe.
  images: [
    'https://snowplanet.co.nz/wp-content/uploads/Snowplanet-mother-help-son-snow-with-snow-and-ski-gears.jpg',
    'https://snowplanet.co.nz/wp-content/uploads/Snowplanet-skiing-rail-grind-terrain-park-male-SMALL.jpg',
    'https://snowplanet.co.nz/wp-content/uploads/Volunteers_Terrain-Park_Grooming_Juliette.jpg',
    'https://snowplanet.co.nz/wp-content/uploads/Careers_Madi-Tryon_Instructor-Image-1.jpg',
  ],
  items: [
    {
      id: 'sp-first-timer',
      type: 'recurring',
      title: 'First-Timer Group Lessons',
      subtitle: 'Never skied before? Start here',
      icon: 'sparkle',
      iconColor: 'indigo',
      formatBlurb:
        'A weekly post promoting the beginner group lesson — the gateway product for new visitors. Same vibe imagery (first-timers on the slope, instructor guiding, smiles when they make it down) with copy that rotates between what’s included, who it’s for, and what to expect.',
      categoryInfo:
        'First-Timer Group Lessons run daily — 90-minute small-group sessions for absolute beginners on skis or snowboards. Includes all gear (skis/board, boots, helmet), slope access for the lesson, and an introduction to the beginner area. NZ$79 per person, ages 5+. Six-person max class, instructor-led. Designed to get total novices comfortable sliding, stopping, and turning. Most students progress to the main slope within 1–2 sessions.',
      schedule: 'Weekly — Wednesdays',
      postTime: '7pm',
      hashtags: ['#snowplanet', '#learntoski', '#aucklandfamilies', '#indoorsnow'],
      postLength: 'Short',
      imageHints: ['ski lesson', 'beginner', 'instructor', 'snow'],
      unsplashImages: [
        stock('1551524559-8af4e6624178', 'Aalo Lens'),
        stock('1517774518716-fd6f30be6e8f', 'James Wright'),
        stock('1473442849326-49b6abb4ad24', 'Mike Chen'),
        stock('1551524164-687a55dd1126', 'Emma Wilson'),
      ],
      exampleCaptions: [
        "Never clipped into a ski before? That’s actually the perfect place to start. 90 minutes, all gear sorted, six people max, indoor slope so the weather can’t cancel you. $79. Bring sneakers and a hoodie — we’ve got the rest.",
        "Beginner lesson Wednesday. Eight people booked in, two spots left. If you’ve been talking about ‘giving snowboarding a go one day’ for the last three years — this is the one.",
      ],
    },
    {
      id: 'sp-private',
      type: 'recurring',
      title: 'Private Lessons',
      subtitle: '1:1 coaching, your pace',
      icon: 'target',
      iconColor: 'pink',
      formatBlurb:
        'A monthly post promoting private 1:1 lessons. Same imagery — coach and student on the slope, focused practice, terrain park work — with copy that rotates between who it suits, what you can work on, and the booking pitch.',
      categoryInfo:
        'Private Lessons are one-on-one sessions with a senior Snowplanet instructor. 60 minutes for $159 or 90 minutes for $215. Tailored to your level — first-timers wanting a faster path, intermediate skiers fixing technique, or advanced riders working on park tricks and freestyle. Includes gear hire and slope access. Book online up to 14 days ahead; popular slots fill fast on weekends.',
      schedule: 'Monthly — first Sunday',
      postTime: '6pm',
      hashtags: ['#snowplanet', '#privatelesson', '#skicoaching', '#snowboardlesson'],
      postLength: 'Medium',
      imageHints: ['ski coach', 'private lesson', 'instructor', 'one on one'],
      unsplashImages: [
        stock('1486482568557-cfe7bbe2ec70', 'Sara Anderson'),
        stock('1502630859934-b3b41d18206c', 'Lucas Mendes'),
        stock('1551698618-1dfe5d97d256', 'Anna Pierce'),
      ],
      exampleCaptions: [
        "Stuck plateauing on the same turn? Private lesson, 60 minutes, one of our senior coaches, just you and the slope. $159. Most people fix something they’ve been doing wrong for years in the first 20 minutes.",
        "Booking a private lesson is the cheat code most people don’t take. Worth it whether you’re a first-timer wanting to skip the group format, or a regular trying to crack a new trick.",
      ],
    },
    {
      id: 'sp-birthdays',
      type: 'recurring',
      title: 'Kids Birthday Parties',
      subtitle: 'Snow, cake, screaming kids',
      icon: 'gift',
      iconColor: 'yellow',
      formatBlurb:
        'A monthly post promoting kids birthday parties. Same imagery — kids on the slope, party room set up, candles being blown out — with copy that rotates between what’s included, age suitability, and booking lead times.',
      categoryInfo:
        'Birthday Parties at Snowplanet are 2 hours — 90 minutes on snow (skiing, snowboarding, or tobogganing depending on age) and 30 minutes in the dedicated party room. From NZ$45 per child, minimum 8 kids. Includes all gear hire, helmet, instructor-supervised slope time, hot food, drinks, and a Snowplanet party bag. Suitable from age 5 (skiing/snowboarding) or age 3 (toboggan only). Book at least 3 weeks ahead for weekend slots.',
      schedule: 'Monthly — third Saturday',
      postTime: '12pm',
      hashtags: ['#birthdayparty', '#aucklandkids', '#snowplanet', '#kidsparty'],
      postLength: 'Medium',
      imageHints: ['kids birthday', 'children party', 'cake', 'snow play'],
      unsplashImages: [
        stock('1530103862676-de8c9debad1d', 'Olivia Rose'),
        stock('1464347744102-11db6282f854', 'David Park'),
        stock('1517457373958-b7bdd4587205', 'Sophia Reed'),
      ],
      exampleCaptions: [
        "Birthday on the calendar? Snow, gear, instructor, party room, hot food, party bags — all sorted. From $45 per kid, min 8 kids, age 5+. Weekend slots book 3 weeks out, so worth a quick check now.",
        "Best birthday party reaction we’ve had recently: ‘Mum, can EVERY birthday be at the snow?’. Indoor slope means it goes ahead rain or shine — no last-minute panic.",
      ],
    },
    {
      id: 'sp-season-pass',
      type: 'recurring',
      title: '52-Day Season Pass',
      subtitle: 'Unlimited snow, twice a week',
      icon: 'star',
      iconColor: 'blue',
      formatBlurb:
        'A monthly post promoting the season pass for regulars. Same imagery — confident skiers/boarders on the main slope, terrain park action — with copy that rotates between value-for-money math, who it suits, and the social side of being a regular.',
      categoryInfo:
        'The 52-Day Pass gives you 52 visits across the calendar year — effectively one visit a week. NZ$899 (saves roughly $300 vs casual entry over 52 visits). Each visit includes lift access; gear hire is separate. Designed for committed regulars, families with kids on the development squad, and anyone wanting to actually get good. Transferable within immediate family. Most pass-holders visit Wednesday evenings or Sunday mornings.',
      schedule: 'Monthly — second Tuesday',
      postTime: '7pm',
      hashtags: ['#snowplanet', '#seasonpass', '#aucklandskiers', '#getbetter'],
      postLength: 'Medium',
      imageHints: ['skiing slope', 'season pass', 'regular skier', 'progression'],
      unsplashImages: [
        stock('1551524559-8af4e6624178', 'Aalo Lens'),
        stock('1502630859934-b3b41d18206c', 'Lucas Mendes'),
        stock('1486482568557-cfe7bbe2ec70', 'Sara Anderson'),
      ],
      exampleCaptions: [
        "The 52-Day Pass: $899 for a year of regular snow. Works out roughly $17 a visit. If you’re showing up more than once a month, it pays for itself. Best for the ‘I want to actually get good’ crowd.",
        "Sunday mornings are the pass-holder slot. Quiet slope, friendly regulars, coffee before, run after run. It’s a vibe.",
      ],
    },
    {
      id: 'sp-school-holidays',
      type: 'event',
      title: 'School Holiday Programs',
      subtitle: 'July & October full-day camps',
      icon: 'calendar',
      iconColor: 'green',
      formatBlurb:
        'A four-post lead-up to each school holiday camp. Builds anticipation — what kids do, how the days are structured, what they need — then a last-call post when bookings close. Same imagery of kids on snow with copy that escalates as the date approaches.',
      categoryInfo:
        'School Holiday Programs run during the July and October NZ school holidays. Full-day camps 9am–3pm, NZ$129 per day or $599 for the 5-day week. Ages 7–14. Mix of lesson time, free skiing/snowboarding, lunch, and downtime in the party room. Small instructor-to-kid ratios (1:6). Includes all gear, lunch, and snacks. Bookings open 4 weeks ahead; week-blocks sell out in 7–10 days.',
      schedule: '4 posts in 2 weeks before Jul 1',
      postTime: '10am',
      hashtags: ['#schoolholidays', '#aucklandkids', '#snowplanet', '#kidscamp'],
      postLength: 'Long',
      imageHints: ['school holiday camp', 'kids skiing', 'ski school', 'children'],
      unsplashImages: [
        stock('1517457373958-b7bdd4587205', 'Hannah Liu'),
        stock('1517649763962-0c623066013b', 'Marcus Bell'),
        stock('1551524164-687a55dd1126', 'Ines Martin'),
      ],
      exampleCaptions: [
        "July holiday camp planning. Five days of snow, lessons, lunch, mates — kids leave each day exhausted in the best way. $129 a day or $599 the full week. Ages 7–14. Bookings open in two weeks and the week-blocks went in 8 days last time, so worth setting an alarm.",
        "If you’ve got a winter break to fill: full-day snow camp, instructor-led, lunch sorted. Most kids try snowboarding for the first time and come back demanding lessons.",
      ],
    },
    {
      id: 'sp-christmas',
      type: 'event',
      title: 'Christmas at Snowplanet',
      subtitle: 'Santa visits + festive sessions',
      icon: 'heart',
      iconColor: 'red',
      formatBlurb:
        'A three-post countdown to the December Santa weekends. Same festive imagery (Santa on snow, kids meeting him, the slope dressed up) with copy that rotates through what’s on, ticket info, and a final last-spots reminder.',
      categoryInfo:
        'Christmas at Snowplanet runs two December weekends. Includes Santa visits at the bottom of the slope (free photos), themed slope sessions with festive music, hot chocolate stand, and a Christmas-decorated lobby. Regular session prices apply. Santa is on-slope from 11am–3pm Saturday and Sunday in the second and third weeks of December. Family bookings recommended; the 12pm and 1pm sessions go first.',
      schedule: '3 posts in 2 weeks before Dec 7',
      postTime: '6pm',
      hashtags: ['#christmasinauckland', '#snowplanet', '#santaonsnow', '#familyfun'],
      postLength: 'Long',
      imageHints: ['christmas santa', 'family snow', 'festive', 'holiday'],
      unsplashImages: [
        stock('1543589077-47d81606c1bf', 'Liam Walsh'),
        stock('1512389142860-9c449e58a543', 'David Park'),
        stock('1607435037-9deddebb14b5', 'Olivia Rose'),
      ],
      exampleCaptions: [
        "Santa’s on snow this Saturday and Sunday. Free photo at the bottom of the slope from 11–3, hot chocolate stand running all day. Book any session for the kids and they get the visit thrown in. The 12pm and 1pm slots go first.",
        "Christmas weekend lineup: Santa, snow, hot chocolate, way too many candy canes. The decoration crew has outdone themselves this year — the lobby smells like a giant gingerbread.",
      ],
    },
  ],
}

// =============================================================================
// 2) NEXT GEN HEALTH CLUB — AUCKLAND DOMAIN (nextgenclubs.com.au/.../auckland-domain)
// =============================================================================
const nextgen: ScopeResult = {
  businessName: 'Next Gen Auckland',
  homepageUrl: 'nextgenclubs.com.au/location/auckland-domain',
  images: [
    'https://cdn-ldmfj.nitrocdn.com/sbhYwmFMjvMnpeFnYHlBlkQteRqQVeBV/assets/images/optimized/rev-e11d76b/www.nextgenclubs.com.au/wp-content/uploads/2023/12/Welcome-banner-Image-with-text.jpg',
    'https://cdn-ldmfj.nitrocdn.com/sbhYwmFMjvMnpeFnYHlBlkQteRqQVeBV/assets/images/optimized/rev-e11d76b/www.nextgenclubs.com.au/wp-content/uploads/2023/10/Next-Gen-Photos-2023-053-380x340.jpg',
    'https://cdn-ldmfj.nitrocdn.com/sbhYwmFMjvMnpeFnYHlBlkQteRqQVeBV/assets/images/optimized/rev-e11d76b/www.nextgenclubs.com.au/wp-content/uploads/2023/10/Next-Gen-Photos-2023-059-380x340.jpg',
    'https://cdn-ldmfj.nitrocdn.com/sbhYwmFMjvMnpeFnYHlBlkQteRqQVeBV/assets/images/optimized/rev-e11d76b/www.nextgenclubs.com.au/wp-content/uploads/2023/10/Next-Gen-Photos-2023-085-380x340.jpg',
  ],
  items: [
    {
      id: 'ng-outdoor-pool',
      type: 'recurring',
      title: 'Outdoor Rooftop Pool',
      subtitle: 'Lap pool with the city skyline',
      icon: 'sparkle',
      iconColor: 'blue',
      formatBlurb:
        'A weekly post promoting the outdoor pool — the club’s flagship visual asset. Same imagery (rooftop pool with the Auckland skyline behind, swimmers doing laps, the deck at golden hour) with copy rotating between summer use, year-round heating, and member perks.',
      categoryInfo:
        'The 25-metre heated outdoor pool sits on the deck overlooking Auckland Domain and the city skyline. Open 5:30am–10pm daily, heated year-round to 28°C. Six lap lanes plus a leisure section. Member access included; day passes available. Towels provided, change rooms with full amenities. The morning lap swimmers and weekend brunchers are the regulars.',
      schedule: 'Weekly — Tuesdays',
      postTime: '7am',
      hashtags: ['#nextgenauckland', '#aucklandgym', '#swimming', '#aucklanddomain'],
      postLength: 'Short',
      imageHints: ['outdoor pool', 'lap pool', 'rooftop pool', 'skyline'],
      unsplashImages: [
        stock('1576013551627-0cc20b96c2a7', 'Aalo Lens'),
        stock('1530549387789-4c1017266635', 'James Wright'),
        stock('1571902943202-507ec2618e8f', 'Mike Chen'),
        stock('1576091160550-2173dba999ef', 'Emma Wilson'),
      ],
      exampleCaptions: [
        "5:30am, six lanes, Auckland skyline waking up behind you. The rooftop pool is heated year-round, which means even July mornings are entirely reasonable. Members swim free; day passes for the curious.",
        "Sun’s out, deck is loaded, lap lanes are open. If you’ve been hearing about ‘the pool with the view’ — yeah, this one.",
      ],
    },
    {
      id: 'ng-spa',
      type: 'recurring',
      title: 'The Spa & Recovery',
      subtitle: 'Sauna, steam, ice bath, repeat',
      icon: 'heart',
      iconColor: 'pink',
      formatBlurb:
        'A weekly post promoting the spa and recovery suite. Same vibe imagery (sauna interior, ice bath, dim recovery room) with copy that rotates between post-workout recovery, contrast therapy benefits, and the wind-down experience.',
      categoryInfo:
        'The Spa & Recovery suite includes Finnish sauna (90°C), eucalyptus steam room, plunge pool (10°C cold immersion), and a relaxation lounge with herbal teas. Open 6am–9pm daily, included with full membership. Designed for post-training recovery or a wind-down session. The contrast loop (hot → cold → rest) is the signature — 15 minutes is enough to reset most days.',
      schedule: 'Weekly — Mondays',
      postTime: '6pm',
      hashtags: ['#contrasttherapy', '#sauna', '#recovery', '#nextgenauckland'],
      postLength: 'Short',
      imageHints: ['sauna', 'spa recovery', 'ice bath', 'steam room'],
      unsplashImages: [
        stock('1583416750470-965b2707b355', 'Sara Anderson'),
        stock('1604683988155-c81d2dca22e2', 'Lucas Mendes'),
        stock('1545162598-23b86adee8e0', 'Anna Pierce'),
      ],
      exampleCaptions: [
        "Sauna, steam, plunge, repeat. The contrast loop is the simplest tool we’ve got for resetting a hard week. Fifteen minutes after work and you walk out a different person. Members access free, daily.",
        "Cold plunge sceptics: come in, do 90 seconds, see for yourself. We’ll be there. Plunge is at 10°, sauna is at 90, the herbal tea afterwards is non-negotiable.",
      ],
    },
    {
      id: 'ng-tennis',
      type: 'recurring',
      title: 'Tennis at the Domain',
      subtitle: 'Four indoor courts, all members',
      icon: 'target',
      iconColor: 'green',
      formatBlurb:
        'A fortnightly post promoting the tennis courts. Same imagery (the indoor courts, member doubles games, coaching session) with copy that rotates between court booking, member doubles ladder, and coaching options.',
      categoryInfo:
        'Four full-size indoor tennis courts available to all members. Cushioned hard surface, racquet hire available. Book up to 7 days ahead via the app, max 90 minutes per booking. Weekly doubles ladder (Tuesday and Thursday nights) — sign up at reception. Group coaching sessions Saturday mornings (6 weeks for $180). The courts are busiest 5–8pm weekdays; daytime is wide open.',
      schedule: 'Fortnightly — Wednesdays',
      postTime: '5pm',
      hashtags: ['#tennis', '#aucklandtennis', '#nextgenauckland', '#indoortennis'],
      postLength: 'Medium',
      imageHints: ['tennis court', 'indoor tennis', 'doubles', 'racquet'],
      unsplashImages: [
        stock('1622279457486-62dcc4a431d6', 'Olivia Rose'),
        stock('1551958219-acbc608c6377', 'David Park'),
        stock('1530915534045-a9d36e10b56b', 'Sophia Reed'),
      ],
      exampleCaptions: [
        "Four indoor courts, racquet hire if you forget yours, weekly doubles ladder if you want a regular game. Members book up to a week out — daytime slots are wide open, evening fills fast.",
        "Saturday morning coaching block starts next week. Six sessions, $180, all levels — the Tuesday-night ladder is full of people who started in this exact group last year.",
      ],
    },
    {
      id: 'ng-kids-club',
      type: 'recurring',
      title: 'Kids Club Crèche',
      subtitle: 'Childcare while you work out',
      icon: 'heart',
      iconColor: 'yellow',
      formatBlurb:
        'A monthly post promoting the on-site crèche. Same imagery (the kids room, qualified staff with toddlers, kids at play) with copy that rotates between hours, parent reassurance, and the convenience pitch.',
      categoryInfo:
        'The Kids Club crèche is on-site at Auckland Domain, fully supervised by qualified early-childhood educators. Ages 6 months to 5 years. Open 8am–12pm and 4pm–7pm Monday to Friday, 8am–12pm Saturday and Sunday. Free for full members, max 2 hours per session. Booking required via the app — peak slots (9am weekdays) fill the day before. Snacks and water provided; bring nappies and a favourite toy.',
      schedule: 'Monthly — first Friday',
      postTime: '9am',
      hashtags: ['#parents', '#aucklandparents', '#creche', '#nextgenauckland'],
      postLength: 'Medium',
      imageHints: ['kids play', 'creche', 'childcare', 'toddlers'],
      unsplashImages: [
        stock('1503454537195-1dcabb73ffb9', 'Hannah Liu'),
        stock('1542810634-71277d95dcbb', 'Marcus Bell'),
        stock('1607453998774-d533f65dac99', 'Ines Martin'),
      ],
      exampleCaptions: [
        "If the only thing standing between you and a workout is who watches the kids — that’s solved. Crèche is on-site, qualified ECE staff, ages 6 months to 5 years, two-hour max sessions, free with full membership.",
        "9am Wednesday: parents who got a full hour to themselves. The kids barely noticed they left.",
      ],
    },
    {
      id: 'ng-group-fitness',
      type: 'recurring',
      title: 'Saturday Yoga Flow',
      subtitle: 'Slow start to the weekend',
      icon: 'sparkle',
      iconColor: 'indigo',
      formatBlurb:
        'A weekly post promoting the Saturday yoga class — a single, consistent class slot. Same studio imagery (yoga room with morning light, mats laid out, group flow) with copy that rotates through the instructor, the format, and the post-class brunch spot.',
      categoryInfo:
        'Saturday Yoga Flow runs 7:30am–8:30am in Studio 2. Vinyasa-style 60-minute class, all levels welcome with modifications offered throughout. Led by Sophie (200hr RYT, 6 years teaching). Free for full members; $25 drop-in for non-members. Mats provided. The class regulars head to the cafe downstairs for coffee and eggs after — easy 8:45am brunch slot.',
      schedule: 'Weekly — Fridays',
      postTime: '6pm',
      hashtags: ['#aucklandyoga', '#saturdayyoga', '#nextgenauckland', '#yogaflow'],
      postLength: 'Short',
      imageHints: ['yoga class', 'vinyasa', 'morning yoga', 'studio'],
      unsplashImages: [
        stock('1545205597-3d9d02c29597', 'Liam Walsh'),
        stock('1575052814086-f385e2e2ad1b', 'David Park'),
        stock('1599447421416-3414500d18a5', 'Olivia Rose'),
      ],
      exampleCaptions: [
        "Saturday yoga, 7:30am, Studio 2. Vinyasa with Sophie, slow enough that beginners aren’t lost, deep enough that regulars get something out of it. Coffee at the cafe after, around 8:45.",
        "Easiest way to start a weekend: 60 minutes of flow, breakfast downstairs, home before the supermarket gets busy. Mats provided.",
      ],
    },
    {
      id: 'ng-membership-promo',
      type: 'event',
      title: 'New Year Membership Drive',
      subtitle: 'Joining fee waived in January',
      icon: 'gift',
      iconColor: 'red',
      formatBlurb:
        'A five-post lead-up to the January membership drive. Same imagery (the gym floor, the pool, the spa, members training) with copy that escalates from ‘thinking about joining?’ early posts to ‘offer closes Sunday’ at the end.',
      categoryInfo:
        'Each January we waive the NZ$199 joining fee for new full members (saving NZ$199 upfront). Full membership covers gym, pools (indoor + outdoor), tennis courts, group classes, spa & recovery, and Kids Club access. NZ$95/week, 12-month commitment. Offer runs the full month of January only; signups must be in by 31 Jan. Includes a free 30-minute orientation with a personal trainer in the first fortnight.',
      schedule: '5 posts in 2 weeks before Jan 1',
      postTime: '8pm',
      hashtags: ['#joinin2026', '#nextgenauckland', '#aucklandgym', '#newyearnewyou'],
      postLength: 'Long',
      imageHints: ['gym floor', 'new member', 'fitness goals', 'membership'],
      unsplashImages: [
        stock('1534438327276-14e5300c3a48', 'Marcus Bell'),
        stock('1517836357463-d25dfeac3438', 'Hannah Liu'),
        stock('1571902943202-507ec2618e8f', 'Mike Chen'),
      ],
      exampleCaptions: [
        "January joiners save $199 — we’re waiving the joining fee for the full month. Full membership covers everything we’ve got: the pools, the spa, group classes, tennis, Kids Club. $95 a week, 12-month commitment, includes a 30-min PT orientation in your first fortnight. Closes 31 Jan.",
        "Three days left on the January joining-fee waiver. $199 stays in your pocket if you sign up by Sunday.",
      ],
    },
  ],
}

// =============================================================================
// 3) WYLD CHIROPRACTIC CLINICS (wyldchiropractic.co.nz)
// =============================================================================
const wyld: ScopeResult = {
  businessName: 'Wyld Chiropractic',
  homepageUrl: 'wyldchiropractic.co.nz',
  images: [
    'https://images.squarespace-cdn.com/content/5e7c8323398f120077868700/8c2d6a12-12bc-4225-b15b-d10191e315e5/7.png',
    'https://images.squarespace-cdn.com/content/5e7c8323398f120077868700/9c90d0d9-ae07-4343-ae3b-faa3f9223d86/6.png',
    'https://images.squarespace-cdn.com/content/5e7c8323398f120077868700/e504923c-4388-4b53-b20f-eef1851a6beb/8.png',
    'https://images.squarespace-cdn.com/content/5e7c8323398f120077868700/b566842f-36d9-401d-a9bb-a5d5acd1e74a/5.png',
  ],
  items: [
    {
      id: 'wyld-initial',
      type: 'recurring',
      title: 'Initial Consultation',
      subtitle: 'Your first visit — what to expect',
      icon: 'sparkle',
      iconColor: 'indigo',
      formatBlurb:
        'A weekly post explaining what happens at a first visit. Same imagery (the consult room, a chiropractor with a new patient, the report of findings on screen) with copy that rotates between what’s included, why the history matters, and softening the nerves of first-timers.',
      categoryInfo:
        'The Initial Consultation is a 45-minute session for new patients. Includes a full health history, postural assessment, neurological and orthopaedic exams, and (if appropriate) a digital postural scan. NZ$95. A separate Report of Findings appointment follows 2–3 days later to walk through what we found and recommend a care plan. No adjustments at the first visit — we want to know what we’re working with before we touch anything.',
      schedule: 'Weekly — Tuesdays',
      postTime: '7pm',
      hashtags: ['#wyldchiropractic', '#chiropractornz', '#firstvisit', '#newpatient'],
      postLength: 'Medium',
      imageHints: ['chiropractor consultation', 'patient exam', 'health assessment', 'wellness'],
      unsplashImages: [
        stock('1559757148-5c350d0d3c56', 'Aalo Lens'),
        stock('1576091160550-2173dba999ef', 'James Wright'),
        stock('1551601651-bc60f254d532', 'Mike Chen'),
      ],
      exampleCaptions: [
        "First visit? Here’s what actually happens. 45 minutes, no adjustments yet — just a thorough look at your history, posture, and where you’re moving well or not. $95. We follow up two days later with a Report of Findings to walk through everything we saw. The order matters: understand first, treat second.",
        "If you’ve been putting off seeing a chiropractor because you don’t know what to expect — this is the most common reason. First visit is just a conversation and an assessment. Nothing dramatic. We promise.",
      ],
    },
    {
      id: 'wyld-pregnancy',
      type: 'recurring',
      title: 'Pregnancy Chiropractic',
      subtitle: 'Care through each trimester',
      icon: 'heart',
      iconColor: 'pink',
      formatBlurb:
        'A monthly post promoting pregnancy chiropractic care. Same imagery (expecting mums in consult, pillow setup for a pregnancy adjustment, the warm consult room) with copy that rotates between trimester-specific concerns, Webster Technique, and partner reassurance.',
      categoryInfo:
        'Pregnancy Chiropractic at Wyld is gentle, low-force care designed for expecting mums in any trimester. Our chiropractors are Webster Technique certified — a specific pelvic balancing approach commonly used in pregnancy. Pregnancy pillows mean you’re never face-down on the table. Most clients come weekly in the third trimester. NZ$65 per adjustment after the initial consultation. We work alongside your midwife or OB, not instead of them.',
      schedule: 'Monthly — second Wednesday',
      postTime: '7pm',
      hashtags: ['#pregnancychiropractic', '#websterTechnique', '#nzmums', '#expectingmum'],
      postLength: 'Long',
      imageHints: ['pregnant woman', 'pregnancy care', 'expecting mum', 'maternity'],
      unsplashImages: [
        stock('1531956531700-dc0ee0f1f9a5', 'Sara Anderson'),
        stock('1518049362265-d5b2a6b00b37', 'Lucas Mendes'),
        stock('1556485689-aa8e8e1d23d3', 'Anna Pierce'),
      ],
      exampleCaptions: [
        "Pregnancy chiropractic is one of the most common things we get questions about. Gentle, low-force, Webster-certified. Pregnancy pillows so you’re never face-down. We work alongside your midwife — never replacing them, just adding to the support team. Most mums come weekly in the third trimester. $65 per adjustment after the first visit.",
        "Third-trimester mums: if your hips feel like they’re held together by chewing gum, Webster Technique is the thing. Specific pelvic balancing, takes 20 minutes. The relief tends to last 4–5 days at this stage.",
      ],
    },
    {
      id: 'wyld-kids',
      type: 'recurring',
      title: 'Kids Chiropractic',
      subtitle: 'Gentle care from newborns up',
      icon: 'star',
      iconColor: 'green',
      formatBlurb:
        'A monthly post promoting paediatric chiropractic care. Same imagery (a chiropractor working gently with a baby, toddlers in the consult room, family-friendly setup) with copy that rotates through milestones, common reasons parents bring kids in, and reassurance about the gentle approach.',
      categoryInfo:
        'Kids Chiropractic at Wyld covers newborns through teenagers. Adjustments for kids are extremely gentle — about the pressure you’d use to test a ripe avocado. Common reasons parents bring children in: birth recovery (especially after caesarean or assisted births), reflux and feeding issues, sleep difficulties, postural concerns as kids grow, and sports recovery for teens. NZ$45 per adjustment after the initial consult. Pram-friendly clinic, siblings welcome in the room.',
      schedule: 'Monthly — third Friday',
      postTime: '6pm',
      hashtags: ['#kidschiro', '#paediatric', '#nzparents', '#wyldchiropractic'],
      postLength: 'Medium',
      imageHints: ['baby chiropractic', 'kids wellness', 'paediatric care', 'family chiro'],
      unsplashImages: [
        stock('1519689680058-324335c77eba', 'Olivia Rose'),
        stock('1503454537195-1dcabb73ffb9', 'David Park'),
        stock('1542810634-71277d95dcbb', 'Sophia Reed'),
      ],
      exampleCaptions: [
        "Most common question we get from new parents: ‘is it safe?’. Yes. Adjustments for babies are about the pressure you’d use to test a ripe avocado — nothing dramatic, no cracking. Common reasons we see kids: birth recovery, reflux, sleep, postural changes as they grow. $45 after the initial visit.",
        "Reminder that babies can come straight from the hospital. Especially after assisted or caesarean births — most of the families we see start in the first 4 weeks.",
      ],
    },
    {
      id: 'wyld-contrast',
      type: 'recurring',
      title: 'Contrast Therapy',
      subtitle: 'Sauna + ice bath, side by side',
      icon: 'umbrella',
      iconColor: 'blue',
      formatBlurb:
        'A fortnightly post promoting the in-clinic contrast therapy room. Same imagery (the sauna, ice bath, the contrast room interior) with copy that rotates between physiological benefits, the protocol, and the social side (it’s a great session with a mate).',
      categoryInfo:
        'Contrast Therapy at Wyld is an in-clinic sauna and ice-bath suite available to all patients. Protocol: 12–15 minutes sauna at 75–80°C, followed by 60–90 seconds in the ice bath at 4°C, repeat 3 cycles. NZ$30 for a 45-minute session. Bookings stand alone or pair with an adjustment same-day. Towels and shower facilities included. Most people come weekly once they’ve got the rhythm — Tuesday and Friday evenings are the busiest slots.',
      schedule: 'Fortnightly — Thursdays',
      postTime: '6pm',
      hashtags: ['#contrasttherapy', '#icebath', '#sauna', '#wyldchiropractic'],
      postLength: 'Medium',
      imageHints: ['sauna', 'ice bath', 'cold plunge', 'recovery'],
      unsplashImages: [
        stock('1583416750470-965b2707b355', 'Hannah Liu'),
        stock('1604683988155-c81d2dca22e2', 'Marcus Bell'),
        stock('1545162598-23b86adee8e0', 'Ines Martin'),
      ],
      exampleCaptions: [
        "Contrast room is open for bookings. 15 in the sauna, 90 seconds in the ice bath, three rounds. $30 for 45 minutes. Pair it with an adjustment same-day and you walk out feeling like the week’s been reset.",
        "Tuesday-evening crew at the contrast room. Two regulars, both swear it’s changed how they sleep. We don’t prescribe it, we just point at the door.",
      ],
    },
    {
      id: 'wyld-sports',
      type: 'recurring',
      title: 'Sports Chiropractic',
      subtitle: 'For active people who want to stay active',
      icon: 'target',
      iconColor: 'yellow',
      formatBlurb:
        'A monthly post promoting sports chiropractic. Same imagery (athletes mid-adjustment, runner consults, the rehab area) with copy that rotates through sport-specific issues, the difference vs physio, and the case-study angle ("how Sam fixed her IT band").',
      categoryInfo:
        'Sports Chiropractic at Wyld covers active people — runners, triathletes, lifters, team-sport players, weekend warriors. Approach combines spinal adjustments, soft-tissue work, movement assessment, and rehab programming. Common things we see: runners with IT band or plantar issues, lifters with thoracic restrictions, golfers with hip rotation imbalances. $65 per session after initial consult. We work alongside your physio or coach — different lens, same team.',
      schedule: 'Monthly — last Tuesday',
      postTime: '7pm',
      hashtags: ['#sportschiropractic', '#runninginjury', '#wyldchiropractic', '#mobility'],
      postLength: 'Medium',
      imageHints: ['athlete adjustment', 'sports rehab', 'runner', 'mobility'],
      unsplashImages: [
        stock('1517836357463-d25dfeac3438', 'Liam Walsh'),
        stock('1530549387789-4c1017266635', 'David Park'),
        stock('1571902943202-507ec2618e8f', 'Olivia Rose'),
      ],
      exampleCaptions: [
        "Runners — if you’re managing a niggle that won’t quit, sports chiropractic is worth a look. Combines spinal work, soft tissue, movement assessment, and a return-to-running plan. We work alongside your physio, not instead. $65 after the initial visit.",
        "Most common question from lifters: ‘can I still train this week?’. Almost always yes — we just modify what and how. The goal is to keep you moving, not bench you.",
      ],
    },
    {
      id: 'wyld-event',
      type: 'event',
      title: 'New Patient Open Day',
      subtitle: 'Free spinal screenings in March',
      icon: 'calendar',
      iconColor: 'red',
      formatBlurb:
        'A four-post lead-up to the annual open day. Same imagery (the clinic, the postural scanner, the front desk team) with copy that escalates from invitation to last-spots-left.',
      categoryInfo:
        'The New Patient Open Day runs one Saturday in March each year. Free 20-minute spinal screenings (normally part of the $95 initial consult), a digital postural scan, and a chat about whether chiropractic care is right for you. No commitment, no hard sell. Open 9am–3pm, bookings essential — slots fill in the first week each year. Designed for people who’ve been curious about chiropractic but never made the first appointment.',
      schedule: '4 posts in 2 weeks before Mar 15',
      postTime: '9am',
      hashtags: ['#wyldchiropractic', '#opendaynz', '#freescreening', '#newpatient'],
      postLength: 'Long',
      imageHints: ['open day', 'clinic event', 'screening', 'chiropractor'],
      unsplashImages: [
        stock('1576091160550-2173dba999ef', 'Marcus Bell'),
        stock('1551601651-bc60f254d532', 'Hannah Liu'),
        stock('1559757148-5c350d0d3c56', 'Ines Martin'),
      ],
      exampleCaptions: [
        "Saturday 15 March: free 20-minute spinal screenings at the clinic. Postural scan, a chat about what we’d see in your history, zero commitment. 9am–3pm, bookings essential — slots filled in a week last year. The day exists for the people who’ve been curious for years but never made the first call.",
        "Three slots left for the open day on Saturday. Free screening, no follow-up pressure — we’d rather you understand chiropractic than book a course. Link in bio.",
      ],
    },
  ],
}

export const DEMOS: Record<DemoKey, ScopeResult> = {
  snowplanet,
  nextgen,
  wyld,
}

export const DEMO_LIST: { key: DemoKey; label: string; sublabel: string }[] = [
  { key: 'snowplanet', label: 'Snowplanet', sublabel: 'Indoor snow dome — Auckland' },
  { key: 'nextgen', label: 'Next Gen Auckland', sublabel: 'Health club — Auckland Domain' },
  { key: 'wyld', label: 'Wyld Chiropractic', sublabel: 'Chiropractic clinics — NZ' },
]
