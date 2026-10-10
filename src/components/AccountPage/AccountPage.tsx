import { ArrowRight, CalendarDays, CalendarPlus, CheckCircle2, Clock3, HeartHandshake, HelpCircle, History, Home, Layers3, LogOut, Mail, Phone, Save, Settings, ShieldCheck, UserRound, UsersRound, XCircle } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { cancelCheckout, createBundleCheckout, createCheckout, errorMessage, getSupabase, money, reconcileBundleCheckout, type Appointment, type BundleProduct, type CreditSummary } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import './AccountPage.css'

const fifteenMinutes = 15 * 60 * 1000
const secondsUntil = (expiresAt: string) => Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000))
const holdDeadline = (createdAt: string, checkoutExpiresAt: string) => new Date(Math.min(
  Date.parse(checkoutExpiresAt),
  Date.parse(createdAt) + fifteenMinutes,
)).toISOString()
type CustomerProfile = { first_name: string; last_name: string; preferred_name: string; date_of_birth: string; mobile: string; contact_email: string; gender: string }
type CreditAnimation = { from: number; added: number; to: number; phase: 'add' | 'merge' }
const emptyProfile: CustomerProfile = { first_name: '', last_name: '', preferred_name: '', date_of_birth: '', mobile: '', contact_email: '', gender: '' }

function ListenerMark() {
  return <img className="account-listener-mark" src="/favicon-transparent-512x512.png" alt="" aria-hidden="true" />
}

function PendingCountdown({ expiresAt, onExpired }: { expiresAt: string; onExpired: () => void }) {
  const [seconds, setSeconds] = useState(() => secondsUntil(expiresAt))
  const expirationHandled = useRef(false)
  useEffect(() => {
    const tick = () => {
      const next = secondsUntil(expiresAt)
      setSeconds(next)
      if (next === 0 && !expirationHandled.current) {
        expirationHandled.current = true
        onExpired()
      }
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt, onExpired])
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  return <span className="account-countdown" aria-label={`Time remaining ${time}`}>{time}</span>
}

function AccountPage() {
  const { session, loading } = useSession()
  const bundleResult = new URLSearchParams(location.search).get('bundle')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [admin, setAdmin] = useState('')
  const [listenerAccount, setListenerAccount] = useState(false)
  const [message, setMessage] = useState(() => bundleResult === 'cancelled' ? 'Bundle checkout was cancelled. No credits were added and you were not charged.' : '')
  const [busy, setBusy] = useState(false)
  const [cancellingId, setCancellingId] = useState('')
  const [bundles, setBundles] = useState<BundleProduct[]>([])
  const [credits, setCredits] = useState<CreditSummary>({ standard_credits: 0, eligible_for_bundles: false })
  const [creditAnimation, setCreditAnimation] = useState<CreditAnimation | null>(null)
  const [profile, setProfile] = useState<CustomerProfile>(emptyProfile)
  const [savingProfile, setSavingProfile] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const bundleStarted = useRef(false)
  const bundleReconciliationStarted = useRef(false)
  const [openedAt] = useState(() => Date.now())
  const [activeView, setActiveView] = useState<'home' | 'bookings' | 'history' | 'profile' | 'settings'>('home')
  const userId = session?.user.id
  const userEmail = session?.user.email || ''
  useEffect(() => {
    if (!userId) return
    let active = true
    const client = getSupabase()
    void Promise.all([client.from('appointments').select('*').eq('user_id', userId).order('starts_at', { ascending: false }), client.from('listeners').select('id,name'), client.rpc('is_admin'), client.from('profiles').select('first_name,last_name,preferred_name,date_of_birth,mobile,contact_email,gender').eq('id', userId).maybeSingle(), client.from('listener_accounts').select('listener_id').eq('user_id', userId).maybeSingle()])
      .then(([bookings, people, role, profileResult, listenerResult]) => {
        if (!active) return
        if (bookings.error || people.error || role.error || profileResult.error || listenerResult.error) throw bookings.error || people.error || role.error || profileResult.error || listenerResult.error
        setAppointments(bookings.data as Appointment[])
        setNames(Object.fromEntries(people.data.map(person => [person.id, person.name])))
        if (profileResult.data) setProfile({ ...emptyProfile, ...profileResult.data, contact_email: profileResult.data.contact_email || userEmail, gender: profileResult.data.gender || '' })
        setAdmin(role.data === true ? userId : ''); setListenerAccount(Boolean(listenerResult.data)); setMessage(current => bundleResult ? current : '')
      }).catch(error => { if (active) setMessage(errorMessage(error)) })
    void Promise.all([client.rpc('bundle_options'), client.rpc('credit_summary')]).then(([products, creditResult]) => {
      if (!active) return
      if (!products.error) setBundles((products.data || []) as BundleProduct[])
      if (!creditResult.error) setCredits(creditResult.data as CreditSummary)
    })
    return () => { active = false }
  }, [userId, userEmail, refresh, bundleResult])
  useEffect(() => {
    if (!userId || bundleResult !== 'success' || bundleReconciliationStarted.current) return
    bundleReconciliationStarted.current = true
    let active = true
    let timer: number | undefined
    const check = async (attempt: number) => {
      try {
        const sessionId = new URLSearchParams(window.location.search).get('bundle_session_id') || undefined
        const result = await reconcileBundleCheckout(sessionId)
        if (!active) return
        if (result.status === 'paid') {
          setCredits({ standard_credits: result.standard_credits, eligible_for_bundles: true })
          setMessage('')
          const animationKey = result.order_id ? `listen-bundle-animation-${result.order_id}` : ''
          if (result.added_credits > 0 && (!animationKey || !sessionStorage.getItem(animationKey))) {
            if (animationKey) sessionStorage.setItem(animationKey, '1')
            setCreditAnimation({ from: Math.max(0, result.standard_credits - result.added_credits), added: result.added_credits, to: result.standard_credits, phase: 'add' })
            timer = window.setTimeout(() => {
              if (!active) return
              setCreditAnimation(current => current ? { ...current, phase: 'merge' } : null)
              timer = window.setTimeout(() => { if (active) setCreditAnimation(null) }, 650)
            }, 1400)
          }
          setRefresh(value => value + 1)
          return
        }
        if (result.status === 'expired') {
          setMessage('This bundle checkout expired without a completed payment. No session credits were added.')
          return
        }
        if (attempt < 3) timer = window.setTimeout(() => void check(attempt + 1), 2500)
        else setMessage('Your payment is still being confirmed. Refresh this page shortly, or contact us if your receipt shows the payment completed.')
      } catch (error) {
        if (!active) return
        if (attempt < 3) timer = window.setTimeout(() => void check(attempt + 1), 2500)
        else setMessage(errorMessage(error))
      }
    }
    void check(0)
    return () => { active = false; if (timer) window.clearTimeout(timer) }
  }, [userId, bundleResult])
  if (loading) return <p role="status">Checking your account…</p>
  if (!session) return <LoginPage />
  const resume = async (slotId: string) => {
    setBusy(true)
    try {
      const checkoutUrl = await createCheckout(slotId)
      sessionStorage.setItem('listen-checkout-return', '1')
      window.location.assign(checkoutUrl)
    }
    catch (error) { setMessage(errorMessage(error)); setBusy(false) }
  }
  const purchaseBundle = async (code: string) => {
    if (busy || bundleStarted.current) return
    bundleStarted.current = true; setBusy(true); setMessage('Opening secure bundle checkout…')
    try {
      const checkoutUrl = await createBundleCheckout(code)
      window.location.assign(checkoutUrl)
    } catch (error) { bundleStarted.current = false; setBusy(false); setMessage(errorMessage(error)) }
  }
  const removeExpired = (bookingId: string) => setAppointments(current => current.filter(booking => booking.id !== bookingId))
  const cancelBooking = async (bookingId: string, askForConfirmation = true) => {
    if (askForConfirmation && !window.confirm('Cancel this booking and release the appointment time?')) return
    setCancellingId(bookingId)
    setMessage('')
    try {
      await cancelCheckout(bookingId)
      removeExpired(bookingId)
      sessionStorage.removeItem('listen-booking-draft')
      sessionStorage.removeItem('listen-checkout-return')
      setMessage(askForConfirmation ? 'Your pending booking has been cancelled and the appointment time is available again.' : 'Your 15-minute booking hold expired and the appointment time is available again.')
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setCancellingId('')
    }
  }
  const customerBookings = appointments.filter(booking => booking.user_id === userId)
  const pendingBookings = customerBookings.filter(booking => booking.status === 'pending')
  const upcomingBookings = customerBookings.filter(booking => booking.status === 'confirmed' && Date.parse(booking.starts_at) >= openedAt).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  const historyBookings = customerBookings.filter(booking => booking.status === 'expired' || (booking.status === 'confirmed' && Date.parse(booking.starts_at) < openedAt))
  const primaryListener = upcomingBookings[0] || customerBookings.find(booking => booking.status === 'confirmed')
  const bookingCard = (booking: Appointment, featured = false, showPayment = true) => {
    const startsAt = new Date(booking.starts_at)
    const duration = Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000)
    return <article key={booking.id} className={`account-card ${featured ? 'featured' : ''} ${booking.status}`}>
      <div className="account-card-top"><span className={`account-status ${booking.status}`}>{booking.status === 'confirmed' ? <CheckCircle2 /> : booking.status === 'pending' ? <Clock3 /> : <XCircle />}{booking.status}</span>{booking.status === 'pending' && <PendingCountdown expiresAt={holdDeadline(booking.created_at, booking.checkout_expires_at)} onExpired={() => void cancelBooking(booking.id, false)} />}</div>
      <div className="account-card-date"><strong>{startsAt.toLocaleDateString('en-AU', { day: 'numeric' })}</strong><span>{startsAt.toLocaleDateString('en-AU', { month: 'short' })}</span></div>
      <div className="account-card-content"><span className="account-card-label">{featured ? 'Your next session' : booking.status === 'pending' ? 'Time held for you' : 'Previous booking'}</span><h3>{names[booking.listener_id] || 'Your listener'}</h3>
        <div className="account-card-meta"><span><CalendarDays />{startsAt.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><span><Clock3 />{startsAt.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })} · {duration === 120 ? '2 hours' : `${duration} minutes`}</span><span><HeartHandshake />{booking.rate_code === 'intro' ? 'Introductory chat' : booking.rate_code === 'extended' ? 'Extended support session' : 'Support session'}</span></div>
        {(showPayment || booking.status === 'pending') && <div className="account-card-footer">{showPayment && <strong>{booking.paid_with_credit ? 'Session credit used' : `${money(booking.amount_cents)} AUD`}</strong>}{booking.status === 'pending' && <div className="account-card-actions"><button disabled={busy || Boolean(cancellingId)} onClick={() => resume(booking.slot_id)}>{busy ? 'Opening Stripe…' : <>Continue payment <ArrowRight size={16} /></>}</button><button type="button" className="account-cancel" disabled={busy || Boolean(cancellingId)} onClick={() => cancelBooking(booking.id)}>{cancellingId === booking.id ? 'Cancelling…' : 'Cancel booking'}</button></div>}</div>}
      </div>
    </article>
  }
  const signOut = async () => { const { error } = await getSupabase().auth.signOut(); if (error) setMessage(error.message) }
  const updateProfile = (field: keyof CustomerProfile, value: string) => setProfile(current => ({ ...current, [field]: value }))
  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSavingProfile(true); setMessage('')
    try {
      const { error } = await getSupabase().from('profiles').update({ first_name: profile.first_name.trim(), last_name: profile.last_name.trim(), preferred_name: profile.preferred_name.trim(), date_of_birth: profile.date_of_birth, mobile: profile.mobile.trim(), gender: profile.gender || null }).eq('id', userId)
      if (error) throw error
      setProfile(current => ({ ...current, first_name: current.first_name.trim(), last_name: current.last_name.trim(), preferred_name: current.preferred_name.trim() }))
      setMessage('Your profile details have been updated.')
    } catch (error) { setMessage(errorMessage(error)) } finally { setSavingProfile(false) }
  }
  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'bookings' as const, label: 'Bookings', icon: CalendarDays },
    { id: 'history' as const, label: 'Past sessions', icon: History },
    { id: 'profile' as const, label: 'Profile', icon: UserRound },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ]
  const noBookings = <section className="account-empty"><div><HeartHandshake /></div><h2>No upcoming bookings</h2><p>You do not have any sessions scheduled. When you’re ready, complete a new check-in and choose a listener and time that works for you.</p><a href="/get-matched?fresh=1">Start a new check-in <ArrowRight /></a></section>
  return <main className="account-page">
    <header className="account-dashboard-heading"><div><span className="account-eyebrow">My support space</span><h1>Welcome back.</h1><p>Signed in as {session.user.email}</p></div><a className="account-book" href="/get-matched?repeat=previous"><CalendarPlus />Book a session</a></header>
    <div className="account-dashboard-grid">
      <div className="account-sidebar-column"><aside className="account-sidebar" aria-label="Account navigation"><nav>{navItems.map(item => { const Icon = item.icon; return <button key={item.id} type="button" className={activeView === item.id ? 'active' : ''} onClick={() => setActiveView(item.id)}><Icon />{item.label}</button> })}</nav>{(listenerAccount || admin === userId) && <a href="/listener"><ListenerMark />Listener dashboard</a>}{admin === userId && <a href="/admin"><ShieldCheck />Admin dashboard</a>}</aside><button type="button" className="account-sidebar-signout" onClick={signOut}><LogOut />Sign out</button></div>
      <div className="account-dashboard-main">
        {new URLSearchParams(location.search).has('checkout') && <div className="account-checkout-return" role="status"><Clock3 /><div><h2>Your payment wasn’t completed</h2><p>Your details are saved and the selected time remains held until the countdown ends.</p></div></div>}
        {message && <p className="account-message" role="status">{message}</p>}
        {activeView === 'home' && <>
          <section className="account-listener-overview"><div><span className="account-card-label">My listener</span><h2>{primaryListener ? names[primaryListener.listener_id] || 'Your listener' : 'Find someone who feels right for you'}</h2><p>{primaryListener ? 'Your chosen listener will support your upcoming conversation.' : 'Complete the matching questions to receive a listener recommendation based on what you want to talk about.'}</p></div><a href="/get-matched?repeat=previous"><UsersRound />{primaryListener ? 'Get matched again' : 'Get matched'}</a></section>
          {pendingBookings.length > 0 && <section className="account-section"><div className="account-section-heading"><div><span>Action needed</span><h2>Complete your booking</h2></div><p>Your appointment is held for 15 minutes while you finish payment.</p></div><div className="account-list">{pendingBookings.map(booking => bookingCard(booking))}</div></section>}
          <section className="account-section"><div className="account-section-heading"><div><span>Coming up</span><h2>Upcoming booking</h2></div></div>{upcomingBookings.length ? <div className="account-list">{upcomingBookings.slice(0, 1).map(booking => bookingCard(booking, true))}</div> : noBookings}</section>
          <section className="account-section account-bundles"><div className="account-section-heading"><div><span>Save on follow-up support</span><h2>Session bundles</h2></div><p>Buy a bundle now, then schedule each included appointment separately.</p></div><div className="account-bundle-grid">{bundles.map(bundle => <article key={bundle.code}><span>{bundle.session_count} sessions</span><h3>{bundle.label}</h3><strong>{money(bundle.amount_cents)} AUD</strong><small>{money(Math.round(bundle.amount_cents / bundle.session_count))} per session</small><button type="button" disabled={busy} onClick={() => void purchaseBundle(bundle.code)}>{busy ? 'Opening checkout…' : 'Buy bundle'}</button></article>)}</div><p className="account-bundle-locked">Bundle credits cover standard sessions. If you have not completed your introductory session, book that first and use your credits for later appointments.</p></section>
        </>}
        {activeView === 'bookings' && <section className="account-section account-section-first"><div className="account-section-heading"><div><span>Your schedule</span><h2>Bookings</h2></div><p>Confirmed sessions and bookings awaiting payment.</p></div>{pendingBookings.length || upcomingBookings.length ? <div className="account-list">{[...pendingBookings, ...upcomingBookings].map((booking, index) => bookingCard(booking, booking.status === 'confirmed' && index === pendingBookings.length))}</div> : noBookings}</section>}
        {activeView === 'history' && <section className="account-section account-section-first account-history"><div className="account-section-heading"><div><span>Your records</span><h2>Past sessions</h2></div><p>Previous and expired booking records are kept here.</p></div>{historyBookings.length ? <div className="account-list">{historyBookings.map(booking => bookingCard(booking, false, false))}</div> : noBookings}</section>}
        {activeView === 'profile' && <section className="account-simple-panel"><span className="account-card-label">Your details</span><h2>Profile</h2><div className="account-profile-name"><div><UserRound /></div><div><small>Preferred name</small><h3>{profile.preferred_name || profile.first_name || 'Your profile'}</h3><p>{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Complete your details in Settings'}</p></div></div><dl className="account-profile-details"><div><dt><Mail />Email</dt><dd>{profile.contact_email || session.user.email || '—'}</dd></div><div><dt><Phone />Mobile</dt><dd>{profile.mobile || '—'}</dd></div><div><dt><CalendarDays />Date of birth</dt><dd>{profile.date_of_birth ? new Date(`${profile.date_of_birth}T12:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</dd></div><div><dt><UserRound />Gender</dt><dd>{profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Prefer not to say'}</dd></div></dl><button type="button" className="account-edit-profile" onClick={() => setActiveView('settings')}>Edit profile <ArrowRight /></button><p className="account-panel-note">These contact details are used for your bookings. Your questionnaire answers remain private and are not displayed here.</p></section>}
        {activeView === 'settings' && <section className="account-simple-panel"><span className="account-card-label">Account details</span><h2>Settings</h2><form className="account-settings-form" onSubmit={saveProfile}><div className="account-settings-row"><label><span>First name</span><input value={profile.first_name} onChange={event => updateProfile('first_name', event.target.value)} maxLength={100} autoComplete="given-name" required /></label><label><span>Last name</span><input value={profile.last_name} onChange={event => updateProfile('last_name', event.target.value)} maxLength={100} autoComplete="family-name" required /></label></div><label><span>Preferred name <small>Optional</small></span><input value={profile.preferred_name} onChange={event => updateProfile('preferred_name', event.target.value)} maxLength={100} autoComplete="nickname" /></label><div className="account-settings-row"><label><span>Mobile</span><input type="tel" inputMode="numeric" value={profile.mobile} onChange={event => updateProfile('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))} pattern="04[0-9]{8}" title="Enter 10 digits starting with 04" autoComplete="tel" required /></label><label><span>Date of birth</span><input type="date" value={profile.date_of_birth} onChange={event => updateProfile('date_of_birth', event.target.value)} max={new Date().toISOString().slice(0, 10)} autoComplete="bday" required /></label></div><label><span>Gender <small>Optional</small></span><select value={profile.gender} onChange={event => updateProfile('gender', event.target.value)}><option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label><label><span>Account email</span><input type="email" value={profile.contact_email || session.user.email || ''} readOnly aria-describedby="account-email-help" /></label><small id="account-email-help" className="account-field-help">Your verified sign-in email cannot be changed here.</small><div className="account-settings-actions"><button type="submit" className="account-save-profile" disabled={savingProfile}><Save />{savingProfile ? 'Saving…' : 'Save changes'}</button></div></form></section>}
      </div>
      <aside className="account-dashboard-rail">
        {activeView === 'home' && <section className="account-rail-credit"><div className="account-rail-credit-label"><Layers3 /><span>Standard-session credits</span></div><strong className={creditAnimation ? `account-credit-value ${creditAnimation.phase}` : 'account-credit-value'} aria-label={`${credits.standard_credits} session credits`}><b>{creditAnimation?.phase === 'add' ? creditAnimation.from : credits.standard_credits}</b>{creditAnimation && <em aria-hidden="true">+{creditAnimation.added}</em>}</strong><p>50-minute standard sessions</p>{credits.standard_credits > 0 && <a href="/get-matched?repeat=previous">Book with a credit <ArrowRight /></a>}</section>}
        <section className="account-assistance"><div className="account-help-icon"><HelpCircle /></div><h2>Need assistance?</h2><p>Have a question about choosing a listener, your booking, or payment? We’re here to help.</p><a href="/contact">Contact us <ArrowRight /></a><hr /><span>Listen offers peer support</span><small>For immediate danger or a crisis, call 000 or Lifeline on 13 11 14.</small></section>
      </aside>
    </div>
  </main>
}
export default AccountPage
