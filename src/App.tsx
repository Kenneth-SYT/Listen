import ColourStrip from './components/ColourStrip/ColourStrip'
import BenefitsSection from './components/BenefitsSection/BenefitsSection'
import ContactPage from './components/ContactPage/ContactPage'
import Header from './components/Header/Header'
import Hero from './components/Hero/Hero'
import OurTherapistPage from './components/OurTherapistPage/OurTherapistPage'
import PricingPage from './components/PricingPage/PricingPage'
import SupportSections from './components/SupportSections/SupportSections'
import About from './components/About/About'
import HowItWorksSummary from './components/SupportSections/HowItWorksSummary'
import './App.css'

function App() {
  const isContactPage = window.location.pathname === '/contact'
  const isPricingPage = window.location.pathname === '/pricing'
  const isOurTherapistPage = window.location.pathname === '/our-therapist'
  const isHowItWorksPage = window.location.pathname === '/how-it-works'

  return (
    <main className="page">
      <ColourStrip />
      <Header />
      {isContactPage ? (
        <ContactPage />
      ) : isPricingPage ? (
        <PricingPage />
      ) : isOurTherapistPage ? (
        <OurTherapistPage />
      ) : isHowItWorksPage ? (
        <>
          <Hero />
          <SupportSections />
        </>
      ) : (
        <>
          <Hero />
          <About />
          <HowItWorksSummary />
          <BenefitsSection />
        </>
      )}
    </main>
  )
}

export default App
