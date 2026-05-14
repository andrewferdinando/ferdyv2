'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Intro from './stages/Intro'
import Landing from './stages/Landing'
import Loading from './stages/Loading'
import Overview from './stages/Overview'
import Wizard from './stages/Wizard'
import Examples from './stages/Examples'
import End from './stages/End'
import { DEMO_URLS } from './data/demos'
import type { ExamplePost, ScopeItem, ScopeResult } from './data/types'

type Stage =
  | 'intro'
  | 'landing'
  | 'loading'
  | 'overview'
  | 'wizard'
  | 'examples'
  | 'end'

type ScrapeResponse = {
  url: string
  businessName: string
  text: string
  images: string[]
  meta?: { title?: string; description?: string; ogImage?: string }
  insufficient?: boolean
  reason?: string
  error?: string
}

type AnalyseResponse = {
  items?: ScopeItem[]
  error?: string
  insufficient?: boolean
}

type GeneratePostsResponse = {
  posts?: ExamplePost[]
  error?: string
}

export default function ScopeFlow() {
  const [stage, setStage] = useState<Stage>('intro')
  const [result, setResult] = useState<ScopeResult | null>(null)
  const [keptIds, setKeptIds] = useState<Set<string>>(new Set())
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [wizardIndex, setWizardIndex] = useState(0)
  const [landingError, setLandingError] = useState<string | null>(null)

  // Generated example posts: itemId -> array of captions. Populated by
  // /api/scope/generate-posts when the user enters the wizard. Both real
  // URL submissions and demo-picker presses go through the same pipeline.
  const [captionsByItem, setCaptionsByItem] = useState<Record<string, string[]>>({})
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsError, setPostsError] = useState<string | null>(null)
  const postsFetchedFor = useRef<string | null>(null) // id of result that's been fetched

  // Skip the booth attractor when ?start=true is on the URL.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('start') === 'true') {
      setStage('landing')
    }
  }, [])

  // Reset scroll on every stage transition.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [stage])

  const initSelectionsAndKept = useCallback((res: ScopeResult) => {
    setKeptIds(new Set(res.items.map((i) => i.id)))
    const initial: Record<string, string[]> = {}
    for (const item of res.items) initial[item.id] = []
    setSelections(initial)
    setWizardIndex(0)
    setCaptionsByItem({})
    postsFetchedFor.current = null
    setPostsError(null)
    setPostsLoading(false)
  }, [])

  const handleSubmitUrl = useCallback(
    async (url: string) => {
      setLandingError(null)
      setResult(null)
      setStage('loading')

      try {
        const scrapeRes = await fetch('/api/scope/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })

        if (!scrapeRes.ok) {
          const data = (await scrapeRes.json().catch(() => null)) as
            | ScrapeResponse
            | null
          throw new Error(
            data?.reason ||
              data?.error ||
              "We couldn't reach that site. Try a demo while we figure that out."
          )
        }

        const scrape = (await scrapeRes.json()) as ScrapeResponse
        if (scrape.insufficient) {
          throw new Error(
            scrape.reason || "Not enough on the homepage to scope. Try a demo."
          )
        }

        const analyseRes = await fetch('/api/scope/analyse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: scrape.businessName,
            homepageUrl: scrape.url,
            text: scrape.text,
            images: scrape.images,
            meta: scrape.meta,
          }),
        })

        if (!analyseRes.ok) {
          const data = (await analyseRes.json().catch(() => null)) as
            | AnalyseResponse
            | null
          throw new Error(
            data?.error || "We couldn't read patterns from that site. Try a demo."
          )
        }

        const analyse = (await analyseRes.json()) as AnalyseResponse
        if (!analyse.items || analyse.items.length === 0) {
          throw new Error("We couldn't find post-worthy patterns. Try a demo.")
        }

        const combined: ScopeResult = {
          businessName: scrape.businessName,
          homepageUrl: scrape.url,
          images: scrape.images,
          items: analyse.items,
        }
        setResult(combined)
        initSelectionsAndKept(combined)
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong. Try a demo while we sort it."
        setLandingError(message)
        setResult(null)
        setStage('landing')
      }
    },
    [initSelectionsAndKept]
  )

  const handleToggleKept = useCallback((id: string) => {
    setKeptIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleToggleImage = useCallback((itemId: string, url: string) => {
    setSelections((prev) => {
      const current = prev[itemId] ?? []
      const next = current.includes(url)
        ? current.filter((u) => u !== url)
        : [...current, url]
      return { ...prev, [itemId]: next }
    })
  }, [])

  const handleRestart = useCallback(() => {
    setStage('intro')
    setResult(null)
    setKeptIds(new Set())
    setSelections({})
    setWizardIndex(0)
    setLandingError(null)
    setCaptionsByItem({})
    setPostsError(null)
    setPostsLoading(false)
    postsFetchedFor.current = null
  }, [])

  // Eager pre-fetch: when the user enters the wizard for a real (non-demo)
  // result, kick off the post-generation call so by the time they hit Done,
  // the captions are usually already in. Runs once per result. Only generates
  // captions for the categories the user kept on the Overview — sending all
  // items would double or triple the Anthropic call time for nothing.
  useEffect(() => {
    if (stage !== 'wizard') return
    if (!result) return
    const key = result.businessName + '|' + result.homepageUrl
    if (postsFetchedFor.current === key) return
    postsFetchedFor.current = key

    const keptItems = result.items.filter((i) => keptIds.has(i.id))
    if (keptItems.length === 0) return

    setPostsLoading(true)
    setPostsError(null)

    const itemsForGen = keptItems.map((it) => ({
      id: it.id,
      title: it.title,
      categoryInfo: it.categoryInfo,
      postLength: it.postLength,
      hashtags: it.hashtags,
    }))

    fetch('/api/scope/generate-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: result.businessName,
        items: itemsForGen,
      }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as
          | GeneratePostsResponse
          | null
        if (!res.ok) {
          throw new Error(data?.error || 'Couldn’t draft posts for this category set.')
        }
        const grouped: Record<string, string[]> = {}
        for (const p of data?.posts ?? []) {
          if (!grouped[p.categoryId]) grouped[p.categoryId] = []
          grouped[p.categoryId].push(p.caption)
        }
        setCaptionsByItem(grouped)
        setPostsLoading(false)
      })
      .catch((err) => {
        setPostsError(err instanceof Error ? err.message : 'Generation failed')
        setPostsLoading(false)
      })
  }, [stage, result, keptIds])

  if (stage === 'intro') {
    return <Intro onContinue={() => setStage('landing')} />
  }

  if (stage === 'landing') {
    return (
      <Landing
        onSubmitUrl={handleSubmitUrl}
        onPickDemo={(key) => handleSubmitUrl(DEMO_URLS[key])}
        error={landingError}
      />
    )
  }

  if (stage === 'loading' || !result) {
    return (
      <Loading
        ready={result !== null}
        onComplete={() => setStage('overview')}
      />
    )
  }

  if (stage === 'overview') {
    return (
      <Overview
        result={result}
        keptIds={keptIds}
        onToggle={handleToggleKept}
        onBack={handleRestart}
        onNext={() => {
          if (keptIds.size > 0) {
            setWizardIndex(0)
            setStage('wizard')
          }
        }}
      />
    )
  }

  if (stage === 'wizard') {
    const keptItems = result.items.filter((i) => keptIds.has(i.id))
    const safeIndex = Math.min(wizardIndex, keptItems.length - 1)
    return (
      <Wizard
        result={result}
        items={keptItems}
        index={safeIndex}
        selections={selections}
        onPrev={() => setWizardIndex(Math.max(0, safeIndex - 1))}
        onNext={() => setWizardIndex(Math.min(keptItems.length - 1, safeIndex + 1))}
        onJump={(i) => setWizardIndex(i)}
        onToggleImage={handleToggleImage}
        onFinish={() => setStage('examples')}
      />
    )
  }

  if (stage === 'examples') {
    const keptItems = result.items.filter((i) => keptIds.has(i.id))
    return (
      <Examples
        result={result}
        keptItems={keptItems}
        selections={selections}
        captionsByItem={captionsByItem}
        loading={postsLoading}
        error={postsError}
        onContinue={() => setStage('end')}
      />
    )
  }

  // stage === 'end'
  return (
    <End
      businessName={result.businessName}
      keptCount={keptIds.size}
      onRestart={handleRestart}
    />
  )
}
