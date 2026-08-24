import ColourStrip from './components/ColourStrip/ColourStrip'
import BenefitsSection from './components/BenefitsSection/BenefitsSection'
import ContactPage from './components/ContactPage/ContactPage'
import Header from './components/Header/Header'
import Hero from './components/Hero/Hero'
import OurTherapistPage from './components/OurTherapistPage/OurTherapistPage'
import PricingPage from './components/PricingPage/PricingPage'
import SupportSections from './components/SupportSections/SupportSections'
import About from './components/About/About'
import './App.css'

function App() {
  const isContactPage = window.location.pathname === '/contact'
  const isPricingPage = window.location.pathname === '/pricing'
  const isOurTherapistPage = window.location.pathname === '/our-therapist'

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
      ) : (
        <>
          <Hero />
          <About />
          <SupportSections />
          <BenefitsSection />
        </>
      )}
    </main>
  )
}

export default App
