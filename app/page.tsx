'use client'

import HeroSection from './components/HeroSection'
import QuickStart from './components/QuickStart'
import TrustStrip from './components/TrustStrip'
import BenefitCards from './components/BenefitCards'
import FeaturesGrid from './components/FeaturesGrid'
import FooterBar from './components/FooterBar'

export default function Home() {
  return (
    <>
      <HeroSection />
      <TrustStrip />
      <QuickStart />
      <BenefitCards />
      <FeaturesGrid />
      <FooterBar />
    </>
  )
}
