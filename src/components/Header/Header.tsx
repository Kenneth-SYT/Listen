import logoImage from '../../assets/images/listen-mental-health-logo.png'
import Navigation from '../Navigation/Navigation'
import './Header.css'

function Header() {
  return (
    <header className="site-header shadow-[0_20px_8px_-3px_rgb(0_0_0_/_0.15)]">
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
