import { useEffect, useState } from 'react'
import AboutDropdown from '../AboutDropdown/AboutDropdown'
import GetStartedDropdown from '../GetStartedDropdown/GetStartedDropdown'
import './Navigation.css'

const getRouteActiveSection = () => {
  const path = window.location.pathname

  if (path === '/how-it-works') {
    return 'how-it-works'
  }

  if (path === '/our-therapist') {
    return 'get-started'
  }

  if (path === '/pricing') {
    return 'pricing'
  }

  if (path === '/contact') {
    return 'contact'
  }

  return ''
}

function Navigation() {
  const [activeSection, setActiveSection] = useState(getRouteActiveSection)

  useEffect(() => {
    const routeActiveSection = getRouteActiveSection()

    if (routeActiveSection) {
      setActiveSection(routeActiveSection)
      return
    }

    let animationFrame = 0
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-section]'))

    const updateActiveSection = () => {
      const marker = window.innerHeight * 0.34
      const currentSection = sections.reduce((current, section) => {
        return section.getBoundingClientRect().top <= marker ? section : current
      }, sections[0])

      setActiveSection(currentSection?.dataset.navSection ?? '')
    }

    const requestActiveSectionUpdate = () => {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(updateActiveSection)
    }

    updateActiveSection()
    window.addEventListener('scroll', requestActiveSectionUpdate, { passive: true })
    window.addEventListener('resize', requestActiveSectionUpdate)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('scroll', requestActiveSectionUpdate)
      window.removeEventListener('resize', requestActiveSectionUpdate)
    }
  }, [])

  return (
    <nav className="primary-nav" aria-label="Primary navigation">
      <a href="/how-it-works" aria-current={activeSection === 'how-it-works' ? 'page' : undefined}>How it works</a>
      <GetStartedDropdown isActive={activeSection === 'get-started'} />
      <a href="/#services" aria-current={activeSection === 'services' ? 'location' : undefined}>Services</a>
      <a href="/pricing" aria-current={activeSection === 'pricing' ? 'page' : undefined}>Pricing</a>
      <AboutDropdown isActive={activeSection === 'about'} />
      <a href="/contact" aria-current={activeSection === 'contact' ? 'page' : undefined}>Contact us</a>
    </nav>
  )
}

export default Navigation
