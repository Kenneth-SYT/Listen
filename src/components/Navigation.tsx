import AboutDropdown from './AboutDropdown'
import GetStartedDropdown from './GetStartedDropdown'

function Navigation() {
  return (
    <nav className="primary-nav" aria-label="Primary navigation">
      <GetStartedDropdown />
      <a href="/our-therapist">Our therapist</a>
      <a href="/">Services</a>
      <a href="/pricing">Pricing</a>
      <AboutDropdown />
      <a href="/contact">Contact us</a>
    </nav>
  )
}

export default Navigation
