import ColourStrip from './components/ColourStrip'
import BenefitsSection from './components/BenefitsSection'
import ContactPage from './components/ContactPage'
import Header from './components/Header'
import Hero from './components/Hero'
import OurTherapistPage from './components/OurTherapistPage'
import PricingPage from './components/PricingPage'
import SupportSections from './components/SupportSections'
import SymptomChecker from './components/SymptomChecker'
import './App.css'

function App() {
  const isContactPage = window.location.pathname === '/contact'
  const isPricingPage = window.location.pathname === '/pricing'
  const isOurTherapistPage = window.location.pathname === '/our-therapist'

  return (
    <main className="page">
      <ColourStrip /> {/*THis is so useless i doubt anyone notices*/}
      <Header />
      {isContactPage ? (
        <ContactPage />
      ) : isPricingPage ? (
        <PricingPage />
      ) : isOurTherapistPage ? (
        <OurTherapistPage />
      ) : (
        <>
          <Hero />
          <SymptomChecker />
          <SupportSections />
          <BenefitsSection />
        </>
      )}
    </main>
  )
}

export default App
