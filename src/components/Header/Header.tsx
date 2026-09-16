import logoImage from '../../assets/images/LMH_sideways-transparent.png'
import Navigation from '../Navigation/Navigation'
import './Header.css'
import { useSession } from '../../lib/useSession'

function Header() {
  const { session } = useSession()
  return (
    <header className="site-header shadow-[0_20px_8px_-3px_rgb(0_0_0_/_0.15)]">
      <div className="header-inner">
        <a className="logo" href="/" aria-label="Listen Mental Health home">
          <img src={logoImage} alt="Listen Mental Health" />
        </a>

        <Navigation />

        <div className="header-actions">
          <a className="login-button" href={session ? '/account' : '/login'}>{session ? 'My account' : 'Login'}</a>
          <a className="match-button" href="/get-matched">Get matched</a>
        </div>
      </div>
    </header>
  )
}

export default Header
