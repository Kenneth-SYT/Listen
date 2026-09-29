import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { errorMessage, getSupabase, type Listener, type Slot } from '../../lib/supabase'

type AdminSlot = Slot & { enabled: boolean }

type Props = {
  listeners: Listener[]
  slots: AdminSlot[]
  busy: boolean
  setBusy: (value: boolean) => void
  setMessage: (value: string) => void
  refresh: () => void
}

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const timeMinutes = (date: Date) => date.getHours() * 60 + date.getMinutes()
const inputMinutes = (value: FormDataEntryValue | null) => {
  const [hours, minutes] = String(value).split(':').map(Number)
  return hours * 60 + minutes
}

export default function AdminAvailabilityCalendar({ listeners, slots, busy, setBusy, setMessage, refresh }: Props) {
  const today = new Date()
  const [listenerId, setListenerId] = useState('all')
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(() => dateKey(today))

  const visibleSlots = useMemo(() => slots.filter(slot => listenerId === 'all' || slot.listener_id === listenerId), [listenerId, slots])
  const slotsByDay = useMemo(() => {
    const grouped = new Map<string, AdminSlot[]>()
    visibleSlots.forEach(slot => {
      const key = dateKey(new Date(slot.starts_at))
      grouped.set(key, [...(grouped.get(key) || []), slot])
    })
    return grouped
  }, [visibleSlots])
  const listenerNames = useMemo(() => new Map(listeners.map(listener => [listener.id, listener.name])), [listeners])

  const firstWeekday = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const selectedSlots = (slotsByDay.get(selectedDay) || []).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  const selectedDate = new Date(`${selectedDay}T12:00:00`)

  const shiftMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1)
    setMonth(next)
    setSelectedDay(dateKey(next))
  }

  const setSlotStatus = async (slot: AdminSlot, enabled: boolean) => {
    setBusy(true); setMessage('')
    try {
      const { error } = await getSupabase().from('availability').update({ enabled }).eq('id', slot.id)
      if (error) throw error
      setMessage(`${listenerNames.get(slot.listener_id) || 'Listener'} is now ${enabled ? 'available' : 'unavailable'} for that time.`)
      refresh()
    } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) }
  }

  const updateRange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const targetListener = String(values.get('listener'))
    const fromDate = String(values.get('from-date'))
    const toDate = String(values.get('to-date'))
    const fromTime = inputMinutes(values.get('from-time'))
    const toTime = inputMinutes(values.get('to-time'))
    const enabled = values.get('status') === 'available'
    if (toDate < fromDate) { setMessage('The end date must be on or after the start date.'); return }
    if (toTime <= fromTime) { setMessage('The end time must be later than the start time.'); return }

    const matching = slots.filter(slot => {
      if (slot.listener_id !== targetListener || slot.enabled === enabled) return false
      const start = new Date(slot.starts_at)
      const end = new Date(slot.ends_at)
      const day = dateKey(start)
      return day >= fromDate && day <= toDate && timeMinutes(start) < toTime && timeMinutes(end) > fromTime
    })
    if (!matching.length) {
      setMessage(`No published times match that listener, date range and time range.`)
      return
    }

    setBusy(true); setMessage('')
    try {
      const { error } = await getSupabase().from('availability').update({ enabled }).in('id', matching.map(slot => slot.id))
      if (error) throw error
      setMessage(`${matching.length} published ${matching.length === 1 ? 'time was' : 'times were'} marked ${enabled ? 'available' : 'unavailable'}.`)
      setListenerId(targetListener)
      const rangeStart = new Date(`${fromDate}T12:00:00`)
      setMonth(new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1))
      setSelectedDay(fromDate)
      refresh()
    } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) }
  }

  return <section className="admin-availability" aria-labelledby="availability-heading">
    <div className="admin-availability-heading">
      <div><span><CalendarDays size={18} /> Schedule</span><h3 id="availability-heading">Upcoming availability</h3><p>Review published appointment windows or change several existing times at once.</p></div>
      <label>Show calendar for<select value={listenerId} onChange={event => setListenerId(event.target.value)}><option value="all">All listeners</option>{listeners.map(listener => <option key={listener.id} value={listener.id}>{listener.name}</option>)}</select></label>
    </div>

    <form className="admin-range-form" onSubmit={updateRange}>
      <div><strong>Change a date range</strong><p>Only published times that overlap this daily time window will change.</p></div>
      <label>Listener<select name="listener" required defaultValue=""><option value="" disabled>Select listener</option>{listeners.map(listener => <option key={listener.id} value={listener.id}>{listener.name}</option>)}</select></label>
      <label>From date<input name="from-date" type="date" min={dateKey(today)} required /></label>
      <label>To date<input name="to-date" type="date" min={dateKey(today)} required /></label>
      <label>From time<input name="from-time" type="time" required /></label>
      <label>To time<input name="to-time" type="time" required /></label>
      <label>Set as<select name="status" defaultValue="unavailable"><option value="unavailable">Unavailable</option><option value="available">Available</option></select></label>
      <button disabled={busy}>Update matching times</button>
    </form>

    <div className="admin-calendar-layout">
      <div className="admin-calendar">
        <div className="admin-calendar-toolbar"><button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}><ChevronLeft /></button><strong>{month.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}><ChevronRight /></button></div>
        <div className="admin-calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}</div>
        <div className="admin-calendar-grid">
          {Array.from({ length: firstWeekday }, (_, index) => <span className="admin-calendar-blank" key={`blank-${index}`} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const date = new Date(month.getFullYear(), month.getMonth(), index + 1)
            const key = dateKey(date)
            const daySlots = slotsByDay.get(key) || []
            const available = daySlots.filter(slot => slot.enabled).length
            const unavailable = daySlots.length - available
            return <button type="button" key={key} className={selectedDay === key ? 'selected' : ''} aria-pressed={selectedDay === key} onClick={() => setSelectedDay(key)}>
              <span>{index + 1}</span>{daySlots.length > 0 && <small><i className="available-dot" />{available}{unavailable > 0 && <><i className="unavailable-dot" />{unavailable}</>}</small>}
            </button>
          })}
        </div>
        <div className="admin-calendar-key"><span><i className="available-dot" />Available</span><span><i className="unavailable-dot" />Unavailable</span></div>
      </div>

      <aside className="admin-day-schedule">
        <div><span>Selected day</span><h4>{selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</h4></div>
        {selectedSlots.length ? <div className="admin-time-list">{selectedSlots.map(slot => <article key={slot.id} className={slot.enabled ? '' : 'disabled'}>
          <Clock3 size={18} /><div><strong>{new Date(slot.starts_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}–{new Date(slot.ends_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}</strong><span>{listenerNames.get(slot.listener_id) || 'Unknown listener'}</span></div><button type="button" disabled={busy} onClick={() => void setSlotStatus(slot, !slot.enabled)}>{slot.enabled ? 'Mark unavailable' : 'Restore'}</button>
        </article>)}</div> : <p className="admin-empty">No published times on this day.</p>}
      </aside>
    </div>
  </section>
}
