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
import Seo from './components/Seo/Seo'

let privacyPreparation: Promise<void> | null = null
const normalizedPath = () => window.location.pathname.replace(/\/+$/, '') || '/'
function preparePrivateBooking() {
  if (privacyPreparation) return privacyPreparation
  privacyPreparation = (async () => {
    const path = normalizedPath()
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

function HomeMotion({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-home-reveal]'))
    if (!elements.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    elements.forEach(element => element.classList.add('home-reveal-ready'))
    let frame = 0
    const update = () => {
      frame = 0
      const lowerBoundary = window.innerHeight * .9
      elements.forEach(element => element.classList.toggle('home-reveal-visible', element.getBoundingClientRect().top <= lowerBoundary))
    }
    const requestUpdate = () => { if (!frame) frame = window.requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
      elements.forEach(element => element.classList.remove('home-reveal-ready', 'home-reveal-visible'))
    }
  }, [])
  return <div className="home-motion">{children}</div>
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
  const path = normalizedPath()
  const isContactPage = path === '/contact'
  const isPricingPage = path === '/pricing'
  const isOurTherapistPage = path === '/our-listeners' || path === '/our-therapist'
  const isHowItWorksPage = path === '/how-it-works'
  const isMatchPage = path === '/get-matched'
  const isServicesPage = path === '/services'
  const isAboutPage = path === '/about'
  const isStrategyPage = path === '/strategy'
  const isConfirmationPage = path === '/booking-confirmation'
  const isLoginPage = path === '/login'

  return (
    <>
    <Seo />
    <main className="page">
      <Header />
      {path === '/listener' ? <ListenerPage /> : path === '/admin' ? <AdminPage /> : path === '/account' ? <AccountPage /> : isContactPage ? (
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
        <HomeMotion>
          <Hero />
          <About />
          <HowItWorksSummary />
          <LandingSections />
        </HomeMotion>
      )}
    </main>
    <Footer />
    </>
  )
}

export default App
