import { ChevronDown, Search } from 'lucide-react'
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

const bookingDate = (value: string) => new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
const bookingTime = (value: string) => new Date(value).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })

export default function AdminBookingsSection({ bookings, intakes, listeners, users, search, onSearch }: Props) {
  return <section className="admin-section">
    <div className="admin-section-heading">
      <div><h2>Bookings and consultants</h2><p>Every reservation is matched to its customer and assigned consultant.</p></div>
      <div className="admin-section-tools"><label className="admin-search"><Search size={17} /><span className="sr-only">Search</span><input value={search} onChange={event => onSearch(event.target.value)} placeholder="Search bookings" /></label><span>{bookings.length} shown</span></div>
    </div>
    <div className="admin-booking-list">
      <div className="admin-booking-list-heading" aria-hidden="true"><span>Customer</span><span>Listener</span><span>Appointment</span><span>Status</span><span /></div>
      {bookings.map(booking => {
        const person = users.get(booking.user_id)
        const listener = listeners.get(booking.listener_id)
        const intake = intakes.find(item => item.user_id === booking.user_id && item.selected_slot_id === booking.slot_id)
        const duration = Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000)
        const score = intake ? intake.questionnaire_type === 'long' ? `K10 ${intake.k10_score ?? '—'}/50` : `K6 ${intake.k6_score ?? '—'}/24` : 'No intake saved'

        return <details className="admin-booking-row" key={booking.id}>
          <summary>
            <span className="admin-booking-customer"><strong>{nameFor(person)}</strong></span>
            <span className="admin-booking-listener"><strong>{listener?.name || 'Unassigned'}</strong></span>
            <span className="admin-booking-appointment"><strong>{bookingDate(booking.starts_at)}</strong><small>{bookingTime(booking.starts_at)}</small></span>
            <span className={'admin-status ' + booking.status}>{booking.status}</span>
            <ChevronDown className="admin-booking-chevron" aria-hidden="true" />
          </summary>
          <div className="admin-booking-details">
            <dl>
              <div><dt>Email</dt><dd>{person?.email || booking.user_id}</dd></div>
              <div><dt>Mobile</dt><dd>{person?.mobile || 'Not provided'}</dd></div>
              <div><dt>Starts</dt><dd>{new Date(booking.starts_at).toLocaleString('en-AU')}</dd></div>
              <div><dt>Session length</dt><dd>{duration} minutes</dd></div>
              <div><dt>Questionnaire</dt><dd>{score}</dd></div>
              <div><dt>Topics</dt><dd>{intake?.topics.length ? intake.topics.join(', ') : 'None saved'}</dd></div>
              <div><dt>Payment</dt><dd>{money(booking.amount_cents)} · {booking.rate_code}{booking.paid_with_credit ? ' · Credit' : ''}</dd></div>
              <div><dt>Booking reference</dt><dd>{booking.id}</dd></div>
              {intake?.listener_note && <div className="admin-booking-note"><dt>Listener note</dt><dd>{intake.listener_note}</dd></div>}
            </dl>
          </div>
        </details>
      })}
      {!bookings.length && <p className="admin-empty">No bookings match your search.</p>}
    </div>
  </section>
}
