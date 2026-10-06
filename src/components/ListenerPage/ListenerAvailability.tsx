import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { errorMessage, getSupabase } from '../../lib/supabase'

export type ListenerAvailabilitySlot = { id: string; listener_id: string; starts_at: string; ends_at: string; enabled: boolean }
type Shift = { id: string; start: string; end: string }
type Props = { listenerId: string; profileStatus?: string; active?: boolean; onOpenProfile: () => void; slots: ListenerAvailabilitySlot[]; busy: boolean; setBusy: (value: boolean) => void; setMessage: (value: string) => void; refresh: () => void; toggleSlot: (slot: ListenerAvailabilitySlot) => Promise<void>; deleteSlot: (slot: ListenerAvailabilitySlot) => Promise<void> }

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const todayKey = () => dayKey(new Date())
const parseLocalDate = (value: string) => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day, 12) }
const atTime = (day: Date, time: string) => { const [hours, minutes] = time.split(':').map(Number); return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes) }
const displayTime = (value: string) => new Date(value).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
const storedShifts = (listenerId: string) => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(`listen-listener-shifts-${listenerId}`) || '[]') as Array<Shift & { durationMinutes?: number }>
    return stored.map(slot => {
      if (slot.end) return slot
      const [hours, minutes] = slot.start.split(':').map(Number)
      const total = hours * 60 + minutes + (slot.durationMinutes || 120)
      return { id: slot.id, start: slot.start, end: `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}` }
    })
  }
  catch { return [] }
}

export default function ListenerAvailability({ listenerId, profileStatus, active, onOpenProfile, slots, busy, setBusy, setMessage, refresh, toggleSlot, deleteSlot }: Props) {
  const now = new Date()
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(todayKey)
  const [shifts, setShifts] = useState<Shift[]>(() => storedShifts(listenerId))
  const [chosenShifts, setChosenShifts] = useState<string[]>(() => storedShifts(listenerId).map(shift => shift.id))
  const storageKey = `listen-listener-shifts-${listenerId}`

  const saveShifts = (next: Shift[]) => { setShifts(next); window.localStorage.setItem(storageKey, JSON.stringify(next)) }
  const slotsByDay = useMemo(() => {
    const grouped = new Map<string, ListenerAvailabilitySlot[]>()
    slots.forEach(slot => { const key = dayKey(new Date(slot.starts_at)); grouped.set(key, [...(grouped.get(key) || []), slot]) })
    return grouped
  }, [slots])
  const selectedSlots = (slotsByDay.get(selectedDay) || []).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  const firstWeekday = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const selectedDate = parseLocalDate(selectedDay)

  const shiftMonth = (offset: number) => { const next = new Date(month.getFullYear(), month.getMonth() + offset, 1); setMonth(next); setSelectedDay(dayKey(next)) }
  const addShift = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const start = String(values.get('shift-start')); const end = String(values.get('shift-end'))
    if (end <= start) { setMessage('The available-until time must be later than the start time.'); return }
    if (shifts.some(shift => shift.start === start && shift.end === end)) { setMessage('That reusable availability window already exists.'); return }
    const next = [...shifts, { id: crypto.randomUUID(), start, end }].sort((a, b) => a.start.localeCompare(b.start)); saveShifts(next); setChosenShifts(next.map(shift => shift.id)); form.reset(); setMessage('Reusable availability window saved.')
  }
  const removeShift = (id: string) => { saveShifts(shifts.filter(shift => shift.id !== id)); setChosenShifts(current => current.filter(value => value !== id)) }

  const applyShifts = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget); const from = String(values.get('from')); const to = String(values.get('to')); const group = String(values.get('days')); const selected = shifts.filter(shift => chosenShifts.includes(shift.id))
    if (!selected.length) { setMessage('Tick at least one saved slot to apply.'); return }
    if (to < from) { setMessage('The end date must be on or after the start date.'); return }
    const startDay = parseLocalDate(from); const endDay = parseLocalDate(to); const additions: Array<{ starts: Date; ends: Date }> = []
    for (const day = new Date(startDay); day <= endDay; day.setDate(day.getDate() + 1)) {
      const weekday = day.getDay(); const included = group === 'weekdays' ? weekday >= 1 && weekday <= 5 : group === 'weekends' ? weekday === 0 || weekday === 6 : true
      if (!included) continue
      selected.forEach(shift => additions.push({ starts: atTime(day, shift.start), ends: atTime(day, shift.end) }))
    }
    const existing = new Set(slots.map(slot => `${new Date(slot.starts_at).getTime()}-${new Date(slot.ends_at).getTime()}`))
    const unique = additions.filter(item => !existing.has(`${item.starts.getTime()}-${item.ends.getTime()}`))
    if (!unique.length) { setMessage('Those slots are already on your calendar for this date range.'); return }
    if (unique.length > 100) { setMessage('Please choose a shorter date range so no more than 100 times are added at once.'); return }
    setBusy(true); setMessage(`Adding ${unique.length} appointment ${unique.length === 1 ? 'time' : 'times'}…`)
    try {
      for (const item of unique) {
        const { error } = await getSupabase().rpc('listener_create_availability_window', { p_starts: item.starts.toISOString(), p_ends: item.ends.toISOString() })
        if (error) throw error
      }
      setMonth(new Date(startDay.getFullYear(), startDay.getMonth(), 1)); setSelectedDay(from); setMessage(`${unique.length} appointment ${unique.length === 1 ? 'time has' : 'times have'} been added.`); refresh()
    } catch (error) { setMessage(errorMessage(error)); refresh() } finally { setBusy(false) }
  }

  return <div className="listener-availability-workspace">
    {(profileStatus !== 'published' || active === false) && <div className="listener-visibility-notice" role="status"><div><strong>Your hours are saved but are not visible on the booking page yet.</strong><span>{active === false || profileStatus === 'suspended' ? 'An administrator needs to reactivate your listener access.' : 'Complete and save your public profile to make your hours bookable.'}</span></div><button type="button" onClick={onOpenProfile}>Review public profile</button></div>}
    <section className="listener-shift-builder" aria-labelledby="listener-hours-title">
      <div className="listener-section-heading"><span><Clock3 size={17} /> Your working hours</span><h2 id="listener-hours-title">Set your usual availability</h2><p>Save the hours you like to work, then add them to your calendar in a few clicks. Customers can book any session length that fits inside a window.</p></div>
      <div className="listener-hours-layout">
        <div className="listener-hours-panel"><div className="listener-panel-heading"><span className="listener-step-number">1</span><div><h3>Create a time window</h3><p>For example, 9:00 am to 1:00 pm.</p></div></div>
          <form className="listener-add-shift" onSubmit={addShift}><label>From<input name="shift-start" type="time" required /></label><label>Until<input name="shift-end" type="time" required /></label><button type="submit"><Plus size={17} /> Save window</button></form>
          <div className="listener-saved-heading"><strong>Saved windows</strong><span>Tick the hours you want to apply</span></div>
          <div className="listener-saved-shifts">
            {shifts.map(shift => <div key={shift.id}><label><input type="checkbox" checked={chosenShifts.includes(shift.id)} onChange={event => setChosenShifts(current => event.target.checked ? [...current, shift.id] : current.filter(value => value !== shift.id))} /><strong>{shift.start}–{shift.end}</strong></label><button type="button" aria-label={`Delete ${shift.start} to ${shift.end} availability window`} onClick={() => removeShift(shift.id)}><Trash2 size={16} /></button></div>)}
            {!shifts.length && <p>No saved windows yet. Add one above to get started.</p>}
          </div>
        </div>
        <div className="listener-hours-panel listener-apply-panel"><div className="listener-panel-heading"><span className="listener-step-number">2</span><div><h3>Add to your calendar</h3><p>Choose the days and dates these hours repeat.</p></div></div>
          <form className="listener-apply-shifts" onSubmit={applyShifts}><label>Days<select name="days" defaultValue="weekdays"><option value="weekdays">Weekdays (Mon–Fri)</option><option value="weekends">Weekends (Sat–Sun)</option><option value="everyday">Every day</option></select></label><div className="listener-date-fields"><label>From<input name="from" type="date" min={todayKey()} required /></label><label>Until<input name="to" type="date" min={todayKey()} required /></label></div><button disabled={busy || !shifts.length}>Apply working hours <ChevronRight size={17} /></button></form>
        </div>
      </div>
    </section>

    <section className="listener-calendar-card" aria-labelledby="listener-calendar-title">
      <div className="listener-section-heading"><span><CalendarDays size={17} /> Your schedule</span><h2 id="listener-calendar-title">Availability calendar</h2><p>Review your published hours, or select a date to pause or restore a window.</p></div>
      <div className="listener-calendar-layout"><div className="listener-calendar">
        <div className="listener-calendar-toolbar"><strong>{month.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}</strong><div><button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}><ChevronLeft size={19} /></button><button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}><ChevronRight size={19} /></button></div></div>
        <div className="listener-calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}</div>
        <div className="listener-calendar-grid">{Array.from({ length: firstWeekday }, (_, index) => <span className="listener-calendar-blank" key={`blank-${index}`} />)}
          {Array.from({ length: daysInMonth }, (_, index) => { const date = new Date(month.getFullYear(), month.getMonth(), index + 1); const key = dayKey(date); const daySlots = slotsByDay.get(key) || []; const enabled = daySlots.filter(slot => slot.enabled).length
            return <button type="button" key={key} className={[selectedDay === key ? 'selected' : '', key === todayKey() ? 'today' : '', enabled ? 'has-hours' : ''].filter(Boolean).join(' ')} aria-label={`${date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}, ${enabled} available ${enabled === 1 ? 'window' : 'windows'}`} aria-pressed={selectedDay === key} onClick={() => setSelectedDay(key)}><span>{index + 1}</span>{daySlots.length > 0 && <small>{enabled ? `${enabled} ${enabled === 1 ? 'window' : 'windows'}` : 'Paused'}</small>}</button> })}
        </div>
      </div><aside className="listener-day-panel"><span className="listener-day-eyebrow">Selected day</span><h3>{selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</h3><p className="listener-day-count">{selectedSlots.filter(slot => slot.enabled).length} active {selectedSlots.filter(slot => slot.enabled).length === 1 ? 'window' : 'windows'}</p>
        {selectedSlots.length ? <div className="listener-day-slots">{selectedSlots.map(slot => <article className={slot.enabled ? '' : 'disabled'} key={slot.id}><div className="listener-slot-time"><Clock3 size={17} /><strong>{displayTime(slot.starts_at)}–{displayTime(slot.ends_at)}</strong></div><span>{slot.enabled ? 'Available for booking' : 'Paused — hidden from booking'}</span><div className="listener-slot-actions"><button type="button" disabled={busy} onClick={() => void toggleSlot(slot)}>{slot.enabled ? 'Pause window' : 'Restore window'}</button>{!slot.enabled && <button className="delete" type="button" disabled={busy} onClick={() => void deleteSlot(slot)}>Delete</button>}</div></article>)}</div> : <p className="listener-day-empty">No availability on this day yet. Add working hours above to open this date for bookings.</p>}
      </aside></div>
    </section>
  </div>
}
