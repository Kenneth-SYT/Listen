import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, Clock3, CreditCard, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { errorMessage, getSupabase, money, type Appointment } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import './ConfirmationPage.css'
function ConfirmationPage() {
  const { session, loading } = useSession()
  const [booking, setBooking] = useState<Appointment | null>(null)
  const [listenerName, setListenerName] = useState('Your listener')
  const [message, setMessage] = useState('Checking your payment…')
  const [refresh, setRefresh] = useState(0)
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0
    const id = new URLSearchParams(location.search).get('booking_id')
    const read = async () => {
      try {
        if (!id) throw new Error('No booking reference was provided. View your appointments to check their status.')
        const { data, error } = await getSupabase().from('appointments').select('*').eq('id', id).eq('user_id', userId).maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Booking not found for this account.')
        if (!active) return
        setBooking(data as Appointment)
        const { data: listener } = await getSupabase().from('listeners').select('name').eq('id', data.listener_id).maybeSingle()
        if (active && listener?.name) setListenerName(listener.name)
        setMessage(data.status === 'confirmed' ? 'Payment verified. Your appointment is confirmed.' : data.status === 'expired' ? 'This checkout expired without a confirmed payment.' : 'Payment confirmation is still pending. You can check again or view My appointments.')
        if (data.status === 'pending' && ++attempts < 12) timer = setTimeout(read, 2500)
      } catch (error) { if (active) setMessage(errorMessage(error)) }
    }
    void read()
    return () => { active = false; clearTimeout(timer) }
  }, [userId, refresh])
  if (loading) return <p role="status">Checking your account…</p>
  if (!session) return <LoginPage />
  const confirmed = booking?.status === 'confirmed'
  const expired = booking?.status === 'expired'
  const startsAt = booking ? new Date(booking.starts_at) : null
  const duration = booking ? Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000) : 0
  return <section className="confirmation-page"><div className="confirmation-card">
    <div className={`confirmation-icon ${confirmed ? 'confirmed' : expired ? 'expired' : 'pending'}`}>{confirmed ? <CheckCircle2 /> : <AlertCircle />}</div>
    <span className="confirmation-eyebrow">{confirmed ? 'Booking confirmed' : expired ? 'Booking expired' : 'Confirming payment'}</span>
    <h1>{confirmed ? 'You’re all booked in.' : expired ? 'This booking has expired.' : 'We’re confirming your booking.'}</h1>
    <p className="confirmation-intro" role="status">{message}</p>
    {booking && <>
      <div className="confirmation-details">
        <div><CalendarDays aria-hidden="true" /><span>Date</span><strong>{startsAt?.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
        <div><Clock3 aria-hidden="true" /><span>Time and duration</span><strong>{startsAt?.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })} · {duration === 120 ? '2 hours' : `${duration} minutes`}</strong></div>
        <div><UserRound aria-hidden="true" /><span>Listener</span><strong>{listenerName}</strong></div>
        <div><CreditCard aria-hidden="true" /><span>{confirmed ? 'Paid' : 'Amount'}</span><strong>{money(booking.amount_cents)} AUD</strong></div>
      </div>
      {confirmed && <div className="confirmation-note"><CheckCircle2 aria-hidden="true" /><p>Your session now appears in My appointments. We’ll use your saved contact details if we need to reach you.</p></div>}
      <p className="confirmation-reference">Booking reference: {booking.id}</p>
    </>}
    <div className="confirmation-actions"><a className="confirmation-primary" href="/account">View my appointments <ArrowRight size={17} /></a>{confirmed ? <a className="confirmation-secondary" href="/get-matched?repeat=previous">Book another session</a> : !expired && <button type="button" className="confirmation-secondary" onClick={() => setRefresh(value => value + 1)}>Check payment again</button>}</div>
    <p className="confirmation-caveat">Listen provides peer support and is not an emergency or crisis service.</p>
  </div></section>
}
export default ConfirmationPage
