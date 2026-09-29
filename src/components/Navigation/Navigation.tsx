import './Navigation.css'

const getRouteActiveSection = () => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  if (path === '/') {
    return 'home'
  }

  if (path === '/our-listeners' || path === '/our-therapist') {
    return 'our-listeners'
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
    <nav id="primary-navigation" className="primary-nav" aria-label="Primary navigation">
      <a href="/" aria-current={activeSection === 'home' ? 'page' : undefined}>Home</a>
      <a href="/our-listeners" aria-current={activeSection === 'our-listeners' ? 'page' : undefined}>Our listeners</a>
      <a href="/pricing" aria-current={activeSection === 'pricing' ? 'page' : undefined}>Pricing</a>
      <a href="/contact" aria-current={activeSection === 'contact' ? 'page' : undefined}>Contact us</a>
    </nav>
  )
}

export default Navigation
