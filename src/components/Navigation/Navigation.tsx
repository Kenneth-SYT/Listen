import AboutDropdown from '../AboutDropdown/AboutDropdown'
import GetStartedDropdown from '../GetStartedDropdown/GetStartedDropdown'
import './Navigation.css'

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
