import logoImage from '../assets/images/listen-mental-health-logo.png'
import Navigation from './Navigation'

function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="logo" href="/" aria-label="Listen Mental Health home">
          <img src={logoImage} alt="Listen Mental Health" />
        </a>

        <Navigation />

        <a className="match-button" href="/">
          Get matched
        </a>
      </div>
    </header>
  )
}

export default Header
