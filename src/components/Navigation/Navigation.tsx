import GetStartedDropdown from '../GetStartedDropdown/GetStartedDropdown'
import './Navigation.css'

const getRouteActiveSection = () => {
  const path = window.location.pathname

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
  const activeSection = getRouteActiveSection()

  return (
    <nav className="primary-nav" aria-label="Primary navigation">
      <GetStartedDropdown />
      <a href="/pricing" aria-current={activeSection === 'pricing' ? 'page' : undefined}>Pricing</a>
      <a href="/contact" aria-current={activeSection === 'contact' ? 'page' : undefined}>Contact us</a>
    </nav>
  )
}

export default Navigation
