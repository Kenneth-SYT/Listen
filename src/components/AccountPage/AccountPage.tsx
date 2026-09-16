import { useEffect, useState } from 'react'
import { createCheckout, errorMessage, getSupabase, money, type Appointment } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import './AccountPage.css'

function AccountPage() {
  const { session, loading } = useSession()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [admin, setAdmin] = useState('')
  const [message, setMessage] = useState('Loading appointments…')
  const [busy, setBusy] = useState(false)
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
    try { window.location.assign(await createCheckout(slotId)) }
    catch (error) { setMessage(errorMessage(error)); setBusy(false) }
  }
  return <section className="account-page"><h1>My appointments</h1><p>Signed in as {session.user.email}</p>
    <nav className="account-actions"><a href="/get-matched">Book a session</a>{admin === userId && <a href="/admin">Manage appointments and rates</a>}<button onClick={async () => { const { error } = await getSupabase().auth.signOut(); if (error) setMessage(error.message) }}>Sign out</button></nav>
    {new URLSearchParams(location.search).has('checkout') && <p>Your checkout was closed. Your time remains reserved until checkout expires. You can resume payment below.</p>}
    {message && <p role="status">{message}</p>}
    {!message && !appointments.length && <p>You haven’t booked any appointments yet.</p>}
    <div className="account-list">{appointments.filter(booking => booking.user_id === userId).map(booking => <article key={booking.id} className="account-card"><h2>{names[booking.listener_id] || 'Your listener'}</h2><p>{new Date(booking.starts_at).toLocaleString('en-AU')} · {Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000)} minutes</p><p>{money(booking.amount_cents)} AUD · <strong>{booking.status}</strong></p>{booking.status === 'pending' && <button disabled={busy} onClick={() => resume(booking.slot_id)}>Resume / check checkout</button>}<a href={'/booking-confirmation?booking_id=' + booking.id}>View booking status</a></article>)}</div>
  </section>
}
export default AccountPage
