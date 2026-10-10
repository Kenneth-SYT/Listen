import { CalendarDays, ChevronDown, LogOut, Menu, MessageCircle, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import logoImage from '../../assets/images/LMH_sideways-transparent.png'
import Navigation from '../Navigation/Navigation'
import './Header.css'
import { useSession } from '../../lib/useSession'
import { getSupabase } from '../../lib/supabase'

function Header() {
  const { session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [workspace, setWorkspace] = useState<'admin' | 'listener' | null>(null)
  const [identity, setIdentity] = useState<{ first_name?: string; last_name?: string; preferred_name?: string } | null>(null)
  const accountMenu = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (!session?.user.id) return
    let active = true
    void Promise.all([
      getSupabase().rpc('is_admin'),
      getSupabase().from('listener_accounts').select('listener_id').eq('user_id', session.user.id).maybeSingle(),
      getSupabase().from('profiles').select('first_name,last_name,preferred_name').eq('id', session.user.id).maybeSingle(),
    ]).then(([admin, listener, profile]) => { if (active) { setWorkspace(admin.data ? 'admin' : listener.data ? 'listener' : null); setIdentity(profile.data) } })
    return () => { active = false }
  }, [session?.user.id])
  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (accountMenu.current?.open && !accountMenu.current.contains(event.target as Node)) accountMenu.current.open = false
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && accountMenu.current?.open) { accountMenu.current.open = false; accountMenu.current.querySelector('summary')?.focus() }
    }
    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeMenu); document.removeEventListener('keydown', closeOnEscape) }
  }, [])
  const fullName: string = identity?.preferred_name || [identity?.first_name, identity?.last_name].filter(Boolean).join(' ') || String(session?.user.user_metadata?.full_name || '') || session?.user.email?.split('@')[0] || 'My account'
  const initials = fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const signOut = async () => {
    const { error } = await getSupabase().auth.signOut()
    if (!error) window.location.assign('/')
  }
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
          {session ? <>
            {workspace && <a className="login-button" href={workspace === 'admin' ? '/admin' : '/listener'}>{workspace === 'admin' ? 'Admin' : 'Listener dashboard'}</a>}
            <details className="header-account-menu" ref={accountMenu}>
              <summary aria-label={`Open account menu for ${fullName}`}><span>{initials}</span><ChevronDown aria-hidden="true" /></summary>
              <div className="header-account-dropdown">
                <header><strong>{fullName}</strong><small>{session.user.email}</small></header>
                <nav aria-label="Account menu"><a href="/account?view=settings"><UserRound />Profile settings</a><a href="/account?view=bookings"><CalendarDays />Appointments</a><a href="/account?view=messages"><MessageCircle />Messages</a></nav>
                <button type="button" onClick={() => void signOut()}><LogOut />Sign out</button>
              </div>
            </details>
          </> : <><a className="login-button" href="/login">Login</a><a className="match-button" href="/get-matched">Get matched</a></>}
        </div>
      </div>
    </header>
  )
}

export default Header
