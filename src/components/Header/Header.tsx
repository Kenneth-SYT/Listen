import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import logoImage from '../../assets/images/LMH_sideways-transparent.png'
import Navigation from '../Navigation/Navigation'
import './Header.css'
import { useSession } from '../../lib/useSession'
import { getSupabase } from '../../lib/supabase'

function Header() {
  const { session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [workspace, setWorkspace] = useState<'admin' | 'listener' | null>(null)
  useEffect(() => {
    if (!session?.user.id) return
    let active = true
    void Promise.all([
      getSupabase().rpc('is_admin'),
      getSupabase().from('listener_accounts').select('listener_id').eq('user_id', session.user.id).maybeSingle(),
    ]).then(([admin, listener]) => { if (active) setWorkspace(admin.data ? 'admin' : listener.data ? 'listener' : null) })
    return () => { active = false }
  }, [session?.user.id])
  return (
    <header className={`site-header shadow-[0_20px_8px_-3px_rgb(0_0_0_/_0.15)]${mobileMenuOpen ? ' mobile-menu-open' : ''}`}>
      <div className="header-inner">
        <a className="logo" href="/" aria-label="Listen Mental Health home">
          <img src={logoImage} alt="Listen Mental Health" />
        </a>

        <button
          className="mobile-menu-toggle"
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-controls="primary-navigation"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMobileMenuOpen(open => !open)}
        >
          {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>

        <Navigation />

        <div className="header-actions">
          {session && workspace && <a className="login-button" href={workspace === 'admin' ? '/admin' : '/listener'}>{workspace === 'admin' ? 'Admin' : 'Listener dashboard'}</a>}
          <a className="login-button" href={session ? '/account' : '/login'}>{session ? 'My account' : 'Login'}</a>
          <a className="match-button" href="/get-matched">Get matched</a>
        </div>
      </div>
    </header>
  )
}

export default Header
