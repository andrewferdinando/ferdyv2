'use client'

import { useCallback, useState } from 'react'
import Landing from './stages/Landing'
import Loading from './stages/Loading'
import Overview from './stages/Overview'
import Wizard from './stages/Wizard'
import End from './stages/End'
import { DEMOS } from './data/demos'
import type { DemoKey, ScopeResult } from './data/types'

type Stage = 'landing' | 'loading' | 'overview' | 'wizard' | 'end'

export default function ScopeFlow() {
  const [stage, setStage] = useState<Stage>('landing')
  const [result, setResult] = useState<ScopeResult | null>(null)
  const [keptIds, setKeptIds] = useState<Set<string>>(new Set())
  const [selections, setSelections] = useState<Record<string, number[]>>({})
  const [wizardIndex, setWizardIndex] = useState(0)
  const [landingError, setLandingError] = useState<string | null>(null)

  const startDemo = useCallback((key: DemoKey) => {
    const demo = DEMOS[key]
    setResult(demo)
    setKeptIds(new Set(demo.items.map((i) => i.id)))
    const initialSelections: Record<string, number[]> = {}
    for (const item of demo.items) {
      initialSelections[item.id] = [...item.defaultImageIndices]
    }
    setSelections(initialSelections)
    setWizardIndex(0)
    setLandingError(null)
    setStage('loading')
  }, [])

  const handleSubmitUrl = useCallback((url: string) => {
    // Live scraping isn't wired yet. Direct people to a demo until the API ships.
    void url
    setLandingError(
      "Live scanning isn’t available yet — try one of our demo sites to see how it works."
    )
  }, [])

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
    setStage('landing')
    setResult(null)
    setKeptIds(new Set())
    setSelections({})
    setWizardIndex(0)
    setLandingError(null)
  }, [])

  const handleSubmitLead = useCallback((lead: { name: string; email: string }) => {
    // TODO: POST to /api/scope/lead once we wire it up.
    if (typeof window !== 'undefined') {
      console.log('[scope] lead captured', { ...lead, business: result?.businessName })
    }
  }, [result])

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
      onSubmit={handleSubmitLead}
      onRestart={handleRestart}
    />
  )
}
