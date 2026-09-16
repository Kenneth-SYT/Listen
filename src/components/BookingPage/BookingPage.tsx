import { CalendarDays, Clock3 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createCheckout, errorMessage, getSupabase, money, type Listener, type Quote, type Slot } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import './BookingPage.css'
import type { CustomerDetails } from '../DetailsPage/DetailsPage'

const dayKey = (value: string) => new Date(value).toLocaleDateString('en-CA')
function BookingPage({ answers, customerDetails }: { answers: string[]; customerDetails: CustomerDetails }) {
  const { session, loading: authLoading } = useSession()
  const [listeners, setListeners] = useState<Listener[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [quote, setQuote] = useState<Quote | null>(null)
  const [selectedListener, setSelectedListener] = useState('')
  const [selectedDay, setSelectedDay] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let active = true
    const client = getSupabase()
    void Promise.all([
      client.from('listeners').select('*').eq('active', true).order('name'),
      client.rpc('available_slots'), client.rpc('booking_quote'),
    ]).then(([people, availability, pricing]) => {
      if (!active) return
      if (people.error || availability.error || pricing.error) throw people.error || availability.error || pricing.error
      const list = people.data as Listener[]
      setListeners(list); setSlots(availability.data as Slot[]); setQuote(pricing.data as Quote)
      setSelectedListener(current => current || list.find(person => person.matches.includes(answers[0]))?.id || list[0]?.id || '')
    }).catch(error => { if (active) setMessage(errorMessage(error)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId, answers, refresh])
  const usableSlots = slots.filter(slot => slot.listener_id === selectedListener && quote && Date.parse(slot.ends_at) - Date.parse(slot.starts_at) >= quote.duration_minutes * 60000)
  const days = [...new Set(usableSlots.map(slot => dayKey(slot.starts_at)))]
  const chosenDay = days.includes(selectedDay) ? selectedDay : days[0] || ''
  const daySlots = usableSlots.filter(slot => dayKey(slot.starts_at) === chosenDay)
  const chosenSlot = daySlots.find(slot => slot.id === selectedSlot) || daySlots[0]
  const listener = listeners.find(person => person.id === selectedListener)
  const checkout = async () => {
    if (!chosenSlot || !session) return
    setBusy(true); setMessage('')
    try {
      const { error } = await getSupabase().from('profiles').upsert({
        id: session.user.id, first_name: customerDetails.firstName.trim(), last_name: customerDetails.lastName.trim(),
        preferred_name: customerDetails.preferredName.trim(), date_of_birth: customerDetails.dateOfBirth, mobile: customerDetails.mobile.trim(), contact_email: customerDetails.email.trim().toLowerCase(), gender: customerDetails.gender,
      })
      if (error) throw error
      window.location.assign(await createCheckout(chosenSlot.id))
    } catch (error) { setMessage(errorMessage(error)); setBusy(false); setRefresh(value => value + 1) }
  }
  if (authLoading) return <p role="status">Checking your account…</p>
  if (!session) return <LoginPage embedded />
  return <div className="booking-flow">
    <header className="booking-heading"><h1 id="match-heading">Choose your listener and a time.</h1><p>Times are shown in your timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). <a href="/account">My appointments</a></p></header>
    {loading ? <p role="status">Loading available appointments…</p> : <div className="booking-layout">
      <div className="booking-main">
        <section className="booking-panel"><h2>1. Choose a listener</h2><div className="booking-listeners">
          {listeners.map(person => <button key={person.id} className={'booking-listener' + (person.id === selectedListener ? ' selected' : '')} type="button" aria-pressed={person.id === selectedListener} onClick={() => { setSelectedListener(person.id); setSelectedDay(''); setSelectedSlot('') }}>
            <strong>{person.name}</strong><small>{person.focus}</small>{person.matches.includes(answers[0]) && <small>Suggested for you</small>}
          </button>)}
          {!listeners.length && <p>No listeners are available for booking yet. Please contact us.</p>}
        </div></section>
        <section className="booking-panel"><h2>2. Select an available date</h2>
          {days.length ? <><label className="booking-date-picker">Date<select value={chosenDay} onChange={e => { setSelectedDay(e.target.value); setSelectedSlot('') }}>
            {days.map(day => <option key={day} value={day}>{new Date(usableSlots.find(slot => dayKey(slot.starts_at) === day)!.starts_at).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</option>)}
          </select></label><div className="booking-times">{daySlots.map(slot => <button type="button" key={slot.id} className={chosenSlot?.id === slot.id ? 'selected' : ''} aria-pressed={chosenSlot?.id === slot.id} onClick={() => setSelectedSlot(slot.id)}><Clock3 size={17} />{new Date(slot.starts_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}</button>)}</div></> : <p>No suitable times are currently available for this listener. Try another listener or contact us.</p>}
          <button type="button" onClick={() => { setLoading(true); setRefresh(value => value + 1) }}>Refresh availability</button>
        </section>
      </div>
      <aside className="booking-summary"><CalendarDays size={25} /><h2>Your booking</h2>
        <dl><div><dt>Listener</dt><dd>{listener?.name || 'Select a listener'}</dd></div><div><dt>Appointment</dt><dd>{chosenSlot ? new Date(chosenSlot.starts_at).toLocaleString('en-AU') : 'Select a time'}</dd></div><div><dt>Session</dt><dd>{quote ? quote.label + ', ' + quote.duration_minutes + ' min' : 'Unavailable'}</dd></div></dl>
        <div className="booking-total"><span>Your rate</span><strong>{quote ? money(quote.amount_cents) + ' AUD' : '—'}</strong></div>
        <p>Booking account: {session.user.email}</p>
        <button className="booking-continue" type="button" disabled={busy || !chosenSlot || !quote} onClick={checkout}>{busy ? 'Opening secure checkout…' : 'Review and pay'}</button>
        <p className="booking-reassurance">Your rate is checked again at checkout. Unpaid reservations are released after checkout expires.</p>
      </aside>
    </div>}
    {message && <p role="alert" className="booking-payment-error">{message}</p>}
  </div>
}
export default BookingPage
