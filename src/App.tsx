import ColourStrip from './components/ColourStrip/ColourStrip'
import ContactPage from './components/ContactPage/ContactPage'
import Header from './components/Header/Header'
import Hero from './components/Hero/Hero'
import OurTherapistPage from './components/OurTherapistPage/OurTherapistPage'
import PricingPage from './components/PricingPage/PricingPage'
import HowItWorksPage from './components/HowItWorksPage/HowItWorksPage'
import About from './components/About/About'
import HowItWorksSummary from './components/SupportSections/HowItWorksSummary'
import './App.css'
import Footer from './components/Footer/Footer'
import MatchPage from './components/MatchPage/MatchPage'
import { AboutPage, ServicesPage, StrategyPage } from './components/InfoPages/InfoPages'
import LandingSections from './components/LandingSections/LandingSections'
import ConfirmationPage from './components/ConfirmationPage/ConfirmationPage'
import LoginPage from './components/LoginPage/LoginPage'
import AccountPage from './components/AccountPage/AccountPage'
import AdminPage from './components/AdminPage/AdminPage'
import ListenerPage from './components/ListenerPage/ListenerPage'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { bookingPrivacyAction } from './lib/bookingPrivacy'

let privacyPreparation: Promise<void> | null = null
function preparePrivateBooking() {
  if (privacyPreparation) return privacyPreparation
  privacyPreparation = (async () => {
    const path = window.location.pathname
    const bookingPage = path === '/get-matched'
    const action = bookingPrivacyAction(path, window.location.search, window.location.hash,
      sessionStorage.getItem('listen-booking-active') === '1', sessionStorage.getItem('listen-checkout-return') === '1')
    if (action === 'checkout-return') {
      sessionStorage.removeItem('listen-checkout-return')
      if (bookingPage) sessionStorage.setItem('listen-booking-active', '1')
      else sessionStorage.removeItem('listen-booking-active')
      return
    }
    sessionStorage.removeItem('listen-checkout-return')
    if (action === 'clear') {
      const draft = sessionStorage.getItem('listen-booking-draft')
      if (draft && supabase) {
        try {
          const token = (JSON.parse(draft) as { selection?: { holdToken?: string } }).selection?.holdToken
          if (token) await supabase.rpc('release_slot_hold', { p_token: token })
        } catch { /* An expired hold releases itself. */ }
      }
      sessionStorage.removeItem('listen-booking-draft')
    }
    sessionStorage.removeItem('listen-booking-active')
    if (bookingPage) sessionStorage.setItem('listen-booking-active', '1')
  })()
  return privacyPreparation
}

function App() {
  const [privacyReady, setPrivacyReady] = useState(false)
  const [privacyError, setPrivacyError] = useState(false)
  useEffect(() => {
    let active = true
    void preparePrivateBooking().then(() => { if (active) setPrivacyReady(true) }).catch(() => { if (active) setPrivacyError(true) })
    return () => { active = false }
  }, [])
  if (privacyError) return <main className="page"><p role="alert">We couldn’t clear the previous booking draft. Please close this tab and open a new one before continuing.</p></main>
  if (!privacyReady) return <main className="page"><p role="status">Preparing your private booking…</p></main>
  const isContactPage = window.location.pathname === '/contact'
  const isPricingPage = window.location.pathname === '/pricing'
  const isOurTherapistPage = window.location.pathname === '/our-therapist'
  const isHowItWorksPage = window.location.pathname === '/how-it-works'
  const isMatchPage = window.location.pathname === '/get-matched'
  const isServicesPage = window.location.pathname === '/services'
  const isAboutPage = window.location.pathname === '/about'
  const isStrategyPage = window.location.pathname === '/strategy'
  const isConfirmationPage = window.location.pathname === '/booking-confirmation'
  const isLoginPage = window.location.pathname === '/login'

  return (
    <>
    <main className="page">
      <ColourStrip />
      <Header />
      {window.location.pathname === '/listener' ? <ListenerPage /> : window.location.pathname === '/admin' ? <AdminPage /> : window.location.pathname === '/account' ? <AccountPage /> : isContactPage ? (
        <ContactPage />
      ) : isLoginPage ? (
        <LoginPage />
      ) : isConfirmationPage ? (
        <ConfirmationPage />
      ) : isPricingPage ? (
        <PricingPage />
      ) : isOurTherapistPage ? (
        <OurTherapistPage />
      ) : isHowItWorksPage ? (
        <HowItWorksPage />
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
