import AboutDropdown from '../AboutDropdown/AboutDropdown'
import GetStartedDropdown from '../GetStartedDropdown/GetStartedDropdown'
import './Navigation.css'

function Navigation() {
  return (
    <nav className="primary-nav" aria-label="Primary navigation">
      <a href="/how-it-works" aria-current={window.location.pathname === '/how-it-works' ? 'page' : undefined}>How it works</a>
      <GetStartedDropdown />
      <a href="/">Services</a>
      <a href="/pricing">Pricing</a>
      <AboutDropdown />
      <a href="/contact">Contact us</a>
    </nav>
  )
}

export default Navigation
