'use client'

import { useCallback, useEffect, useState } from 'react'
import Intro from './stages/Intro'
import Landing from './stages/Landing'
import Loading from './stages/Loading'
import Overview from './stages/Overview'
import Wizard from './stages/Wizard'
import End from './stages/End'
import { DEMOS } from './data/demos'
import type { DemoKey, ScopeItem, ScopeResult } from './data/types'

type Stage = 'intro' | 'landing' | 'loading' | 'overview' | 'wizard' | 'end'

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

export default function ScopeFlow() {
  const [stage, setStage] = useState<Stage>('intro')
  const [result, setResult] = useState<ScopeResult | null>(null)
  const [keptIds, setKeptIds] = useState<Set<string>>(new Set())
  const [selections, setSelections] = useState<Record<string, number[]>>({})
  const [wizardIndex, setWizardIndex] = useState(0)
  const [landingError, setLandingError] = useState<string | null>(null)

  // Skip the booth attractor when ?start=true is on the URL — useful for testing the URL flow
  // without clicking through the intro every time.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('start') === 'true') {
      setStage('landing')
    }
  }, [])

  // Reset scroll on every stage transition so users always land at the top of the next view.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [stage])

  const initSelectionsAndKept = useCallback((res: ScopeResult) => {
    setKeptIds(new Set(res.items.map((i) => i.id)))
    const initial: Record<string, number[]> = {}
    for (const item of res.items) {
      initial[item.id] = [...item.defaultImageIndices]
    }
    setSelections(initial)
    setWizardIndex(0)
  }, [])

  const startDemo = useCallback(
    (key: DemoKey) => {
      const demo = DEMOS[key]
      setResult(demo)
      initSelectionsAndKept(demo)
      setLandingError(null)
      setStage('loading')
    },
    [initSelectionsAndKept]
  )

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

  const handleToggleImage = useCallback((itemId: string, imgIdx: number) => {
    setSelections((prev) => {
      const current = prev[itemId] ?? []
      const next = current.includes(imgIdx)
        ? current.filter((i) => i !== imgIdx)
        : [...current, imgIdx]
      return { ...prev, [itemId]: next }
    })
  }, [])

  const handleRestart = useCallback(() => {
    // Restart sends users back to the booth attractor — between visitors at the
    // booth, the page should reset to the headline rather than the URL prompt.
    setStage('intro')
    setResult(null)
    setKeptIds(new Set())
    setSelections({})
    setWizardIndex(0)
    setLandingError(null)
  }, [])

  if (stage === 'intro') {
    return <Intro onContinue={() => setStage('landing')} />
  }

  if (stage === 'landing') {
    return (
      <Landing
        onSubmitUrl={handleSubmitUrl}
        onPickDemo={startDemo}
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
        onFinish={() => setStage('end')}
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
