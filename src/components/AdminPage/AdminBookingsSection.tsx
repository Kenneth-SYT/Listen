import { Search } from 'lucide-react'
import { money, type Appointment, type Listener } from '../../lib/supabase'
import type { AdminUser, Intake } from './adminTypes'
import { nameFor } from './adminUtils'

type Props = {
  bookings: Appointment[]
  intakes: Intake[]
  listeners: Map<string, Listener>
  users: Map<string, AdminUser>
  search: string
  onSearch: (value: string) => void
}

export default function AdminBookingsSection({ bookings, intakes, listeners, users, search, onSearch }: Props) {
  return <section className="admin-section">
    <div className="admin-section-heading">
      <div><h2>Bookings and consultants</h2><p>Every reservation is matched to its customer and assigned consultant.</p></div>
      <div className="admin-section-tools"><label className="admin-search"><Search size={17} /><span className="sr-only">Search</span><input value={search} onChange={event => onSearch(event.target.value)} placeholder="Search bookings" /></label><span>{bookings.length} shown</span></div>
    </div>
    <div className="admin-table"><table><thead><tr><th>Customer</th><th>Consultant</th><th>Appointment</th><th>Questionnaire context</th><th>Payment</th><th>Status</th></tr></thead><tbody>{bookings.map(booking => {
      const person = users.get(booking.user_id)
      const intake = intakes.find(item => item.user_id === booking.user_id && item.selected_slot_id === booking.slot_id)
      return <tr key={booking.id}><td><strong>{nameFor(person)}</strong><small>{person?.email || booking.user_id}</small><small>{person?.mobile || 'No mobile saved'}</small></td><td><strong>{listeners.get(booking.listener_id)?.name || 'Unassigned'}</strong></td><td>{new Date(booking.starts_at).toLocaleString('en-AU')}<small>{Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000)} minutes</small></td><td>{intake ? <><strong>{intake.questionnaire_type === 'long' ? `K10 ${intake.k10_score}/50` : `K6 ${intake.k6_score}/24`}</strong><small>{intake.topics.join(', ')}</small>{intake.listener_note && <small>Note: {intake.listener_note}</small>}</> : <small>No intake saved</small>}</td><td>{money(booking.amount_cents)}<small>{booking.rate_code}</small></td><td><span className={'admin-status ' + booking.status}>{booking.status}</span></td></tr>
    })}</tbody></table>{!bookings.length && <p className="admin-empty">No bookings match your search.</p>}</div>
  </section>
}

