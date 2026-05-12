import type { DemoKey } from './types'

/**
 * Demo sites for the booth. Picking one runs the real scrape + analyse +
 * generate-posts pipeline against the URL, exactly the same code path as
 * a prospect typing their own URL into the landing form.
 *
 * Order in this list = order in the picker on the Landing page.
 */
export const DEMO_LIST: {
  key: DemoKey
  label: string
  sublabel: string
  url: string
}[] = [
  {
    key: 'snowplanet',
    label: 'Snowplanet',
    sublabel: 'Indoor snow dome — Auckland',
    url: 'https://snowplanet.co.nz',
  },
  {
    key: 'nextgen',
    label: 'Next Gen Auckland',
    sublabel: 'Health club — Auckland Domain',
    url: 'https://www.nextgenclubs.com.au/location/auckland-domain/',
  },
  {
    key: 'wyld',
    label: 'Wyld Chiropractic',
    sublabel: 'Chiropractic clinics — NZ',
    url: 'https://wyldchiropractic.co.nz',
  },
]

export const DEMO_URLS: Record<DemoKey, string> = DEMO_LIST.reduce(
  (acc, d) => {
    acc[d.key] = d.url
    return acc
  },
  {} as Record<DemoKey, string>
)
