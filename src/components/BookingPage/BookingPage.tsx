import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { errorMessage, getSupabase, money, type BookingSelection, type CreditSummary, type Listener, type Quote, type Slot } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import type { IntakeAnswers } from '../../lib/intake'
import { rankListeners, recommendedListener } from '../../lib/listenerMatching'
import './BookingPage.css'

const localDayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dayKey = (value: string) => localDayKey(new Date(value))
function BookingPage({ answers, onContinue }: { answers: IntakeAnswers; onContinue: (selection: BookingSelection) => void | Promise<void> }) {
  const { session, loading: authLoading } = useSession()
  const [listeners, setListeners] = useState<Listener[]>([])
  const [fixedSlots, setFixedSlots] = useState<Slot[]>([])
  const [windowSlots, setWindowSlots] = useState<Slot[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [selectedRate, setSelectedRate] = useState('')
  const [selectedListener, setSelectedListener] = useState('')
  const [selectedDay, setSelectedDay] = useState('')
  const [viewedMonth, setViewedMonth] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [holding, setHolding] = useState(false)
  const [credits, setCredits] = useState(0)
  const [useCredit, setUseCredit] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const topics = answers.topics.join('|')
  const signedIn = Boolean(session)

  useEffect(() => {
    if (authLoading) return
    let active = true
    void Promise.all([
      getSupabase().from('listeners').select('*').eq('active', true).order('name'),
      getSupabase().rpc('available_slots'), getSupabase().rpc('booking_options'),
      signedIn ? getSupabase().rpc('credit_summary') : Promise.resolve({ data: null, error: null }),
    ]).then(async ([people, availability, pricing, creditResult]) => {
      if (!active) return
      if (people.error || availability.error || pricing.error) throw people.error || availability.error || pricing.error
      const list = people.data as Listener[]
      const fixed = availability.data as Slot[]
      const rates = pricing.data as Quote[]
      const rate = rates[0]
      if (!rate) throw new Error('No session prices are currently available.')
      const chosenRate = rates.find(option => option.rate_code === selectedRate) || rate
      const { data: starts, error: startsError } = await getSupabase().rpc('available_window_starts', { p_duration_minutes: chosenRate.duration_minutes })
      if (!active) return
      if (startsError) throw startsError
      const windows = (starts || []).map((slot: { selection_key: string; window_id: string; listener_id: string; starts_at: string; ends_at: string }) => ({ id: slot.selection_key, window_id: slot.window_id, listener_id: slot.listener_id, starts_at: slot.starts_at, ends_at: slot.ends_at }))
      const available = [...fixed, ...windows]
      const ranked = rankListeners(list, available, topics.split('|'), chosenRate.duration_minutes)
      const suggested = recommendedListener(ranked)
      setListeners(list); setFixedSlots(fixed); setWindowSlots(windows); setQuotes(rates)
      setCredits(((creditResult.data as CreditSummary | null)?.standard_credits) || 0)
      setSelectedRate(current => rates.some(option => option.rate_code === current) ? current : rate.rate_code)
      setSelectedListener(current => list.some(person => person.id === current) ? current : suggested?.listener.id || ranked[0]?.listener.id || '')
      setMessage('')
    }).catch(error => { if (active) setMessage(errorMessage(error)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [signedIn, authLoading, topics, refresh, selectedRate])

  const activeQuote = quotes.find(option => option.rate_code === selectedRate) || quotes[0] || null
  useEffect(() => {
    if (authLoading) return
    let active = true
    const updateAvailability = async () => {
      if (document.hidden) return
      const [fixedResult, windowsResult] = await Promise.all([
        getSupabase().rpc('available_slots'),
        activeQuote ? getSupabase().rpc('available_window_starts', { p_duration_minutes: activeQuote.duration_minutes }) : Promise.resolve({ data: [], error: null }),
      ])
      if (!active) return
      if (fixedResult.error || windowsResult.error) { setMessage(errorMessage(fixedResult.error || windowsResult.error)); return }
      const fixed = fixedResult.data as Slot[]
      const windows = (windowsResult.data || []).map((slot: { selection_key: string; window_id: string; listener_id: string; starts_at: string; ends_at: string }) => ({ id: slot.selection_key, window_id: slot.window_id, listener_id: slot.listener_id, starts_at: slot.starts_at, ends_at: slot.ends_at }))
      const available = [...fixed, ...windows]
      if (selectedSlot && !available.some(slot => slot.id === selectedSlot)) {
        setSelectedSlot('')
        setMessage('That time is temporarily being held by someone else. Please choose another available time.')
      }
      setFixedSlots(fixed); setWindowSlots(windows)
    }
    const timer = window.setInterval(() => void updateAvailability(), 4000)
    const whenVisible = () => { if (!document.hidden) void updateAvailability() }
    document.addEventListener('visibilitychange', whenVisible)
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', whenVisible) }
  }, [authLoading, selectedSlot, activeQuote])

  const quote = activeQuote
  const slots = [...fixedSlots, ...windowSlots]
  const rankedListeners = rankListeners(listeners, slots, answers.topics, quote?.duration_minutes ?? 0)
  const suggested = recommendedListener(rankedListeners)
  const usableSlots = slots.filter(slot => {
    if (slot.listener_id !== selectedListener || !quote) return false
    const duration = Date.parse(slot.ends_at) - Date.parse(slot.starts_at)
    return slot.window_id ? duration === quote.duration_minutes * 60000 : duration >= quote.duration_minutes * 60000
  }).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  const days = [...new Set(usableSlots.map(slot => dayKey(slot.starts_at)))].sort()
  const chosenDay = days.includes(selectedDay) ? selectedDay : days[0] || ''
  const monthKey = viewedMonth || chosenDay.slice(0, 7)
  const [year, month] = monthKey.split('-').map(Number)
  const monthDate = new Date(year, month - 1, 1)
  const firstWeekday = (monthDate.getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()
  const calendarDays = new Set(days)
  const firstMonth = days[0]?.slice(0, 7)
  const lastMonth = days[days.length - 1]?.slice(0, 7)
  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1)
    const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    setViewedMonth(nextMonth)
    const firstAvailable = days.find(day => day.startsWith(nextMonth))
    if (firstAvailable) { setSelectedDay(firstAvailable); setSelectedSlot('') }
  }
  const daySlots = usableSlots.filter(slot => dayKey(slot.starts_at) === chosenDay)
  const chosenSlot = daySlots.find(slot => slot.id === selectedSlot)
  const listener = listeners.find(person => person.id === selectedListener)
  const holdSelectedSlot = async () => {
    if (!chosenSlot || !quote || !listener || holding) return
    setHolding(true); setMessage('')
    try {
      const holdToken = crypto.randomUUID()
      if (chosenSlot.window_id) {
        const { data, error } = await getSupabase().rpc('claim_window_start', { p_window: chosenSlot.window_id, p_starts: chosenSlot.starts_at, p_duration_minutes: quote.duration_minutes, p_token: holdToken })
        if (error) throw error
        const claimed = data as { slot_id: string; expires_at: string }
        await onContinue({ listener, slot: { ...chosenSlot, id: claimed.slot_id }, quote, holdToken, holdExpiresAt: claimed.expires_at, useCredit: useCredit && quote.rate_code === 'standard' })
      } else {
        const { data, error } = await getSupabase().rpc('claim_slot_hold', { p_slot: chosenSlot.id, p_token: holdToken })
        if (error) throw error
        await onContinue({ listener, slot: chosenSlot, quote, holdToken, holdExpiresAt: data as string, useCredit: useCredit && quote.rate_code === 'standard' })
      }
    } catch (error) {
      setMessage(errorMessage(error))
      setRefresh(value => value + 1)
    } finally { setHolding(false) }
  }

  return <div className="booking-flow">
    <header className="booking-heading"><h1 id="match-heading">Choose your listener and a time.</h1><p>Times are shown in your timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</p></header>
    {authLoading || loading ? <p role="status">Loading available appointments…</p> : <div className="booking-layout">
      <div className="booking-main">
        <section className="booking-panel"><h2>1. Choose a listener</h2><p className="booking-match-intro">{suggested?.matchedTopics.length ? 'Recommended based on the topics you selected. You can choose any listener.' : listeners.length === 1 ? `${listeners[0].name} is currently the only listed listener. You can review their available times below.` : 'Choose the listener you feel comfortable with.'}</p><div className="booking-listeners">
          {rankedListeners.map(({ listener: person, matchedTopics, availableSlots }) => <button key={person.id} className={'booking-listener' + (person.id === selectedListener ? ' selected' : '')} type="button" aria-pressed={person.id === selectedListener} onClick={() => { setSelectedListener(person.id); setSelectedDay(''); setSelectedSlot(''); setViewedMonth('') }}>
            {person.id === suggested?.listener.id && <span className="recommended-label">Recommended for you</span>}
            <strong>{person.name}</strong><small>{person.focus}</small>
            {matchedTopics.length > 0 ? <small className="booking-match-reason">Matches: {matchedTopics.join(', ')}</small> : listeners.length === 1 ? <small className="booking-match-reason">Available listener</small> : null}
            {!availableSlots && <small className="booking-no-times">No times available</small>}
          </button>)}
          {!listeners.length && <p>No listeners are available for booking yet. Please contact us.</p>}
        </div></section>
        <section className="booking-panel"><h2>2. Select an available date</h2>
          {days.length ? <div className="booking-schedule"><div className="booking-calendar">
            <div className="calendar-toolbar"><strong>{monthDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}</strong><div>
              <button type="button" aria-label="Previous month" disabled={monthKey <= firstMonth} onClick={() => shiftMonth(-1)}><ChevronLeft size={19} /></button>
              <button type="button" aria-label="Next month" disabled={monthKey >= lastMonth} onClick={() => shiftMonth(1)}><ChevronRight size={19} /></button>
            </div></div>
            <div className="calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}</div>
            <div className="calendar-grid">{Array.from({ length: firstWeekday }, (_, index) => <span className="calendar-blank" key={`blank-${index}`} />)}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const date = new Date(year, month - 1, index + 1)
                const key = localDayKey(date)
                return <button type="button" key={key} disabled={!calendarDays.has(key)} className={chosenDay === key ? 'selected' : ''} aria-label={date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} aria-pressed={chosenDay === key} onClick={() => { setSelectedDay(key); setSelectedSlot('') }}>{index + 1}</button>
              })}</div>
          </div><div className="booking-time-panel"><p className="time-heading"><Clock3 size={17} />Available times</p><span className="time-date">{new Date(`${chosenDay}T12:00:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <div className="booking-times">{daySlots.map(slot => <button type="button" key={slot.id} className={chosenSlot?.id === slot.id ? 'selected' : ''} aria-pressed={chosenSlot?.id === slot.id} onClick={() => setSelectedSlot(slot.id)}>{new Date(slot.starts_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}</button>)}</div>
          </div></div> : <p>No suitable times are currently available for this listener. Try another listener or contact us.</p>}
          <button type="button" onClick={() => { setLoading(true); setRefresh(value => value + 1) }}>Refresh availability</button>
        </section>
      </div>
      <aside className="booking-summary"><CalendarDays size={25} /><h2>Your booking</h2>
        {quotes.length > 1 && <div className="booking-summary-session"><span>Choose your session</span><div role="group" aria-label="Session length">{quotes.map(option => <button key={option.rate_code} type="button" className={option.rate_code === quote?.rate_code ? 'selected' : ''} aria-pressed={option.rate_code === quote?.rate_code} onClick={() => { setSelectedRate(option.rate_code); setSelectedDay(''); setSelectedSlot(''); setViewedMonth('') }}>
          <strong>{option.duration_minutes === 120 ? '2 hours' : `${option.duration_minutes} min`}</strong><small>{money(option.amount_cents)}</small>
        </button>)}</div></div>}
        {quote?.rate_code === 'standard' && credits > 0 && <label className="booking-credit-choice"><input type="checkbox" checked={useCredit} onChange={event => setUseCredit(event.target.checked)} /><span><strong>Use 1 session credit</strong><small>You have {credits} standard-session {credits === 1 ? 'credit' : 'credits'} available.</small></span></label>}
        <dl><div><dt>Listener</dt><dd>{listener?.name || 'Select a listener'}</dd></div><div><dt>Appointment</dt><dd>{chosenSlot ? new Date(chosenSlot.starts_at).toLocaleString('en-AU') : 'Select a time'}</dd></div><div><dt>Session</dt><dd>{quote ? `${quote.label}, ${quote.duration_minutes === 120 ? '2 hours' : `${quote.duration_minutes} min`}` : 'Unavailable'}</dd></div></dl>
        <div className="booking-total"><span>{useCredit && quote?.rate_code === 'standard' ? 'Credit used' : 'Estimated rate'}</span><strong>{useCredit && quote?.rate_code === 'standard' ? '1 session credit' : quote ? money(quote.amount_cents) + ' AUD' : '—'}</strong></div>
        <button className="booking-continue" type="button" disabled={holding || !chosenSlot || !quote || !listener} onClick={holdSelectedSlot}>{holding ? session ? useCredit ? 'Holding your time…' : 'Opening secure payment…' : 'Holding your time…' : session ? useCredit && quote?.rate_code === 'standard' ? 'Continue with session credit' : 'Proceed to payment' : 'Continue to account details'}</button>
        <p className="booking-reassurance">{useCredit && quote?.rate_code === 'standard' ? 'One credit is deducted only after this appointment is confirmed.' : 'Your time is confirmed only after checkout. Your rate is checked again before payment.'}</p>
      </aside>
    </div>}
    {message && <p role="alert" className="booking-payment-error">{message}</p>}
  </div>
}
export default BookingPage
