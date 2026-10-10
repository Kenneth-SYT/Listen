import { Clock3, Plus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import type { Listener } from '../../lib/supabase'
import { adminTimeOptions } from './adminUtils'

type Props = {
  listeners: Listener[]
  busy: boolean
  initialDate: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>
  onCancel: () => void
}

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

const fromMinutes = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export default function AdminAddWindowForm({ listeners, busy, initialDate, onSubmit, onCancel }: Props) {
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [date, setDate] = useState(initialDate >= todayKey ? initialDate : todayKey)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const duration = toMinutes(endTime) - toMinutes(startTime)
  const durationLabel = useMemo(() => {
    if (duration <= 0) return 'Choose an end time later than the start time.'
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    return `${hours ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : ''}${hours && minutes ? ' ' : ''}${minutes ? `${minutes} minutes` : ''} availability window`
  }, [duration])

  const addDuration = (minutes: number) => {
    const nextEnd = toMinutes(startTime) + minutes
    if (nextEnd < 24 * 60) setEndTime(fromMinutes(nextEnd))
  }

  return <form className="admin-drawer-form" onSubmit={async event => {
    const saved = await onSubmit(event)
    if (saved) onCancel()
  }}>
    <label>Listener<select name="listener" required defaultValue=""><option value="" disabled>Select listener</option>{listeners.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
    <label>Date<input name="appointment-date" type="date" min={todayKey} value={date} onChange={event => setDate(event.target.value)} required /></label>
    <div className="admin-time-selector-row">
      <label>Start time<select value={startTime} onChange={event => setStartTime(event.target.value)}>{adminTimeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <span>to</span>
      <label>End time<select value={endTime} onChange={event => setEndTime(event.target.value)}>{adminTimeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    </div>
    <input type="hidden" name="starts" value={`${date}T${startTime}`} />
    <input type="hidden" name="ends" value={`${date}T${endTime}`} />
    <div className="admin-duration-options"><span>Quick duration</span><div>{[[30, '30 min'], [60, '1 hour'], [120, '2 hours']].map(([minutes, label]) => <button type="button" key={minutes} onClick={() => addDuration(Number(minutes))}>+ {label}</button>)}</div></div>
    <p className={'admin-window-summary' + (duration <= 0 ? ' invalid' : '')}><Clock3 size={17} /> {durationLabel}</p>
    <div className="admin-drawer-footer"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button disabled={busy || duration <= 0}><Plus size={16} /> Add appointment</button></div>
  </form>
}
