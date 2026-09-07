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

  if (path === '/services') return 'services'
  if (path === '/about' || path === '/strategy') return 'about'

  return ''
}

function Navigation() {
  const activeSection = getRouteActiveSection()

  return (
    <nav className="primary-nav" aria-label="Primary navigation">
      <GetStartedDropdown />
      <a href="/how-it-works" aria-current={activeSection === 'how-it-works' ? 'page' : undefined}>How it works</a>
      <a href="/services" aria-current={activeSection === 'services' ? 'page' : undefined}>Services</a>
      <a href="/pricing" aria-current={activeSection === 'pricing' ? 'page' : undefined}>Pricing</a>
      <AboutDropdown isActive={activeSection === 'about'} />
      <a href="/contact" aria-current={activeSection === 'contact' ? 'page' : undefined}>Contact us</a>
    </nav>
  )
}

export default Navigation
