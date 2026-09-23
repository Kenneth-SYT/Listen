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
  return <section className="account-page"><h1>My appointments</h1><p>Signed in as {session.user.email}</p>
    <nav className="account-actions"><a href="/get-matched?repeat=previous">Book a session</a>{admin === userId && <a href="/admin">Manage appointments and rates</a>}<button onClick={async () => { const { error } = await getSupabase().auth.signOut(); if (error) setMessage(error.message) }}>Sign out</button></nav>
    {new URLSearchParams(location.search).has('checkout') && <div className="account-checkout-return" role="status"><h2>Your payment wasn’t completed</h2><p>Your account, questionnaire and contact details are saved. Your selected time remains reserved until the checkout expires.</p></div>}
    {message && <p role="status">{message}</p>}
    {!message && !appointments.length && <p>You haven’t booked any appointments yet.</p>}
    <div className="account-list">{appointments.filter(booking => booking.user_id === userId).map(booking => <article key={booking.id} className="account-card"><h2>{names[booking.listener_id] || 'Your listener'}</h2><p>{new Date(booking.starts_at).toLocaleString('en-AU')} · {Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000)} minutes</p><p>{money(booking.amount_cents)} AUD · <strong>{booking.status}</strong>{booking.status === 'pending' && <PendingCountdown expiresAt={holdDeadline(booking.created_at, booking.checkout_expires_at)} onExpired={() => void cancelBooking(booking.id, false)} />}</p>{booking.status === 'pending' && <div className="account-card-actions"><button disabled={busy || Boolean(cancellingId)} onClick={() => resume(booking.slot_id)}>{busy ? 'Opening Stripe…' : 'Continue payment'}</button><button type="button" className="account-cancel" disabled={busy || Boolean(cancellingId)} onClick={() => cancelBooking(booking.id)}>{cancellingId === booking.id ? 'Cancelling…' : 'Cancel booking'}</button></div>}</article>)}</div>
  </section>
}
export default AccountPage
