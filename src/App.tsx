import ColourStrip from './components/ColourStrip/ColourStrip'
import ContactPage from './components/ContactPage/ContactPage'
import Header from './components/Header/Header'
import Hero from './components/Hero/Hero'
import OurTherapistPage from './components/OurTherapistPage/OurTherapistPage'
import PricingPage from './components/PricingPage/PricingPage'
import SupportSections from './components/SupportSections/SupportSections'
import About from './components/About/About'
import HowItWorksSummary from './components/SupportSections/HowItWorksSummary'
import './App.css'
import Footer from './components/Footer/Footer'
import MatchPage from './components/MatchPage/MatchPage'
import { AboutPage, ServicesPage, StrategyPage } from './components/InfoPages/InfoPages'
import LandingSections from './components/LandingSections/LandingSections'

function App() {
  const isContactPage = window.location.pathname === '/contact'
  const isPricingPage = window.location.pathname === '/pricing'
  const isOurTherapistPage = window.location.pathname === '/our-therapist'
  const isHowItWorksPage = window.location.pathname === '/how-it-works'
  const isMatchPage = window.location.pathname === '/get-matched'
  const isServicesPage = window.location.pathname === '/services'
  const isAboutPage = window.location.pathname === '/about'
  const isStrategyPage = window.location.pathname === '/strategy'

  return (
    <>
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
        <SupportSections />
      ) : isMatchPage ? (
        <MatchPage />
      ) : isServicesPage ? (
        <ServicesPage />
      ) : isAboutPage ? (
        <AboutPage />
      ) : isStrategyPage ? (
        <StrategyPage />
      ) : (
        <>
          <Hero />
          <About />
          <HowItWorksSummary />
          <LandingSections />
        </>
      )}
    </main>
    <Footer />
    </>
  )
}

export default App
