import Hero from '@/components/marketing/Hero'
import Features from '@/components/marketing/Features'
import HowItWorks from '@/components/marketing/HowItWorks'
import Examples from '@/components/marketing/Examples'
import Comparison from '@/components/marketing/Comparison'
import Pricing from '@/components/marketing/Pricing'
import BottomCTA from '@/components/marketing/BottomCTA'

export const metadata = {
  title: 'Ferdy – Social Media Automation for Small Businesses',
  description: 'Ferdy automates repeatable social media posts. Posts are created from website content, offers and brand info. Full control — edit, approve or skip. Designed for SMBs.',
}

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Examples />
      <Comparison />
      <Pricing />
      <BottomCTA />
    </>
  )
}
