import type { FormEvent } from 'react'
import type { Listener } from '../../lib/supabase'
import AdminAvailabilityCalendar from './AdminAvailabilityCalendar'
import type { AdminSlot } from './adminTypes'

type Props = {
  listeners: Listener[]
  slots: AdminSlot[]
  busy: boolean
  onAddWindow: (event: FormEvent<HTMLFormElement>) => void
  setBusy: (value: boolean) => void
  setMessage: (value: string) => void
  refresh: () => void
}

export default function AdminAvailabilitySection({ listeners, slots, busy, onAddWindow, setBusy, setMessage, refresh }: Props) {
  return <section className="admin-section admin-availability-section">
    <div className="admin-section-heading"><div><h2>Availability</h2><p>Manage listener appointment windows · {Intl.DateTimeFormat().resolvedOptions().timeZone} time</p></div></div>
    <form className="admin-publish-form" onSubmit={onAddWindow}>
      <div className="admin-publish-intro"><span>Quick action</span><h3>Add an appointment window</h3></div>
      <label>Listener<select name="listener" required><option value="">Select listener</option>{listeners.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
      <label>Starts<input name="starts" type="datetime-local" required /></label>
      <label>Ends<input name="ends" type="datetime-local" required /></label>
      <button disabled={busy}>Add time</button>
    </form>
    <AdminAvailabilityCalendar listeners={listeners} slots={slots} busy={busy} setBusy={setBusy} setMessage={setMessage} refresh={refresh} />
  </section>
}

