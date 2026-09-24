import { ArrowRight, CalendarDays, CalendarPlus, CheckCircle2, Clock3, HeartHandshake, HelpCircle, History, Home, LogOut, Settings, ShieldCheck, UserRound, UsersRound, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cancelCheckout, createCheckout, errorMessage, getSupabase, money, type Appointment } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import './AccountPage.css'

const fifteenMinutes = 15 * 60 * 1000
const secondsUntil = (expiresAt: string) => Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000))
const holdDeadline = (createdAt: string, checkoutExpiresAt: string) => new Date(Math.min(
  Date.parse(checkoutExpiresAt),
  Date.parse(createdAt) + fifteenMinutes,
)).toISOString()

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
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [admin, setAdmin] = useState('')
  const [message, setMessage] = useState('Loading appointments…')
  const [busy, setBusy] = useState(false)
  const [cancellingId, setCancellingId] = useState('')
  const [openedAt] = useState(() => Date.now())
  const [activeView, setActiveView] = useState<'home' | 'bookings' | 'history' | 'profile' | 'settings'>('home')
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let active = true
    const client = getSupabase()
    void Promise.all([client.from('appointments').select('*').eq('user_id', userId).order('starts_at', { ascending: false }), client.from('listeners').select('id,name'), client.rpc('is_admin')])
      .then(([bookings, people, role]) => {
        if (!active) return
        if (bookings.error || people.error || role.error) throw bookings.error || people.error || role.error
        setAppointments(bookings.data as Appointment[])
        setNames(Object.fromEntries(people.data.map(person => [person.id, person.name])))
        setAdmin(role.data === true ? userId : ''); setMessage('')
      }).catch(error => { if (active) setMessage(errorMessage(error)) })
    return () => { active = false }
  }, [userId])
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
  const bookingCard = (booking: Appointment, featured = false) => {
    const startsAt = new Date(booking.starts_at)
    const duration = Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000)
    return <article key={booking.id} className={`account-card ${featured ? 'featured' : ''} ${booking.status}`}>
      <div className="account-card-top"><span className={`account-status ${booking.status}`}>{booking.status === 'confirmed' ? <CheckCircle2 /> : booking.status === 'pending' ? <Clock3 /> : <XCircle />}{booking.status}</span>{booking.status === 'pending' && <PendingCountdown expiresAt={holdDeadline(booking.created_at, booking.checkout_expires_at)} onExpired={() => void cancelBooking(booking.id, false)} />}</div>
      <div className="account-card-date"><strong>{startsAt.toLocaleDateString('en-AU', { day: 'numeric' })}</strong><span>{startsAt.toLocaleDateString('en-AU', { month: 'short' })}</span></div>
      <div className="account-card-content"><span className="account-card-label">{featured ? 'Your next session' : booking.status === 'pending' ? 'Time held for you' : 'Previous booking'}</span><h3>{names[booking.listener_id] || 'Your listener'}</h3>
        <div className="account-card-meta"><span><CalendarDays />{startsAt.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><span><Clock3 />{startsAt.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })} · {duration === 120 ? '2 hours' : `${duration} minutes`}</span><span><HeartHandshake />{booking.rate_code === 'intro' ? 'Introductory chat' : booking.rate_code === 'extended' ? 'Extended support session' : 'Support session'}</span></div>
        <div className="account-card-footer"><strong>{money(booking.amount_cents)} AUD</strong>{booking.status === 'pending' && <div className="account-card-actions"><button disabled={busy || Boolean(cancellingId)} onClick={() => resume(booking.slot_id)}>{busy ? 'Opening Stripe…' : <>Continue payment <ArrowRight size={16} /></>}</button><button type="button" className="account-cancel" disabled={busy || Boolean(cancellingId)} onClick={() => cancelBooking(booking.id)}>{cancellingId === booking.id ? 'Cancelling…' : 'Cancel booking'}</button></div>}</div>
      </div>
    </article>
  }
  const signOut = async () => { const { error } = await getSupabase().auth.signOut(); if (error) setMessage(error.message) }
  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'bookings' as const, label: 'Bookings', icon: CalendarDays },
    { id: 'history' as const, label: 'Past sessions', icon: History },
    { id: 'profile' as const, label: 'Profile', icon: UserRound },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ]
  const noBookings = <section className="account-empty"><div><HeartHandshake /></div><h2>No sessions here yet</h2><p>When you’re ready, choose a listener and a time that works for you.</p><a href="/get-matched?repeat=previous">Find a session <ArrowRight /></a></section>
  return <main className="account-page">
    <header className="account-dashboard-heading"><div><span className="account-eyebrow">My support space</span><h1>Welcome back.</h1><p>Signed in as {session.user.email}</p></div><a className="account-book" href="/get-matched?repeat=previous"><CalendarPlus />Book a session</a></header>
    <div className="account-dashboard-grid">
      <aside className="account-sidebar" aria-label="Account navigation"><nav>{navItems.map(item => { const Icon = item.icon; return <button key={item.id} type="button" className={activeView === item.id ? 'active' : ''} onClick={() => setActiveView(item.id)}><Icon />{item.label}</button> })}</nav>{admin === userId && <a href="/admin"><ShieldCheck />Admin dashboard</a>}</aside>
      <div className="account-dashboard-main">
        {new URLSearchParams(location.search).has('checkout') && <div className="account-checkout-return" role="status"><Clock3 /><div><h2>Your payment wasn’t completed</h2><p>Your details are saved and the selected time remains held until the countdown ends.</p></div></div>}
        {message && <p className="account-message" role="status">{message}</p>}
        {activeView === 'home' && <>
          <section className="account-listener-overview"><div><span className="account-card-label">My listener</span><h2>{primaryListener ? names[primaryListener.listener_id] || 'Your listener' : 'Find someone who feels right for you'}</h2><p>{primaryListener ? 'Your chosen listener will support your upcoming conversation.' : 'Complete the matching questions to receive a listener recommendation based on what you want to talk about.'}</p></div><a href="/get-matched?repeat=previous"><UsersRound />{primaryListener ? 'Get matched again' : 'Get matched'}</a></section>
          {pendingBookings.length > 0 && <section className="account-section"><div className="account-section-heading"><div><span>Action needed</span><h2>Complete your booking</h2></div><p>Your appointment is held for 15 minutes while you finish payment.</p></div><div className="account-list">{pendingBookings.map(booking => bookingCard(booking))}</div></section>}
          <section className="account-section"><div className="account-section-heading"><div><span>Coming up</span><h2>Upcoming booking</h2></div></div>{upcomingBookings.length ? <div className="account-list">{upcomingBookings.slice(0, 1).map(booking => bookingCard(booking, true))}</div> : noBookings}</section>
        </>}
        {activeView === 'bookings' && <section className="account-section account-section-first"><div className="account-section-heading"><div><span>Your schedule</span><h2>Bookings</h2></div><p>Confirmed sessions and bookings awaiting payment.</p></div>{pendingBookings.length || upcomingBookings.length ? <div className="account-list">{[...pendingBookings, ...upcomingBookings].map((booking, index) => bookingCard(booking, booking.status === 'confirmed' && index === pendingBookings.length))}</div> : noBookings}</section>}
        {activeView === 'history' && <section className="account-section account-section-first account-history"><div className="account-section-heading"><div><span>Your records</span><h2>Past sessions</h2></div><p>Previous and expired booking records are kept here.</p></div>{historyBookings.length ? <div className="account-list">{historyBookings.map(booking => bookingCard(booking))}</div> : noBookings}</section>}
        {activeView === 'profile' && <section className="account-simple-panel"><span className="account-card-label">Your details</span><h2>Profile</h2><div className="account-profile-row"><div><UserRound /></div><p><small>Account email</small><strong>{session.user.email}</strong></p></div><p className="account-panel-note">Your contact details and questionnaire information are securely saved when you complete a booking.</p></section>}
        {activeView === 'settings' && <section className="account-simple-panel"><span className="account-card-label">Account controls</span><h2>Settings</h2><p className="account-panel-note">You are signed in as <strong>{session.user.email}</strong>.</p><button className="account-settings-signout" type="button" onClick={signOut}><LogOut />Sign out</button></section>}
      </div>
      <aside className="account-assistance"><div className="account-help-icon"><HelpCircle /></div><h2>Need assistance?</h2><p>Have a question about choosing a listener, your booking, or payment? We’re here to help.</p><a href="/contact">Contact us <ArrowRight /></a><hr /><span>Listen offers peer support</span><small>For immediate danger or a crisis, call 000 or Lifeline on 13 11 14.</small></aside>
    </div>
  </main>
}
export default AccountPage
