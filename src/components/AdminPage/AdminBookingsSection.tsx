import { ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
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
const dateKey = (value: string) => {
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const pageSize = 10

export default function AdminBookingsSection({ bookings, intakes, listeners, users, search, onSearch }: Props) {
  const [listenerFilter, setListenerFilter] = useState('')
  const [appointmentFilter, setAppointmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const filteredBookings = useMemo(() => bookings.filter(booking =>
    (!listenerFilter || booking.listener_id === listenerFilter)
    && (!appointmentFilter || dateKey(booking.starts_at) === appointmentFilter)
    && (!statusFilter || booking.status === statusFilter)
  ), [appointmentFilter, bookings, listenerFilter, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const visibleBookings = filteredBookings.slice(pageStart, pageStart + pageSize)
  const activeFilterCount = [listenerFilter, appointmentFilter, statusFilter].filter(Boolean).length

  return <section className="admin-section admin-bookings-section">
    <div className="admin-section-heading">
      <div><h2>Bookings and consultants</h2><p>Every reservation is matched to its customer and assigned consultant.</p></div>
      <div className="admin-booking-heading">
        <label className="admin-search"><Search size={17} /><span className="sr-only">Search</span><input value={search} onChange={event => { setPage(1); onSearch(event.target.value) }} placeholder="Search bookings" /></label>
        <span className="admin-booking-result-count"><strong>{filteredBookings.length}</strong> {filteredBookings.length === 1 ? 'result' : 'results'}</span>
        <details className="admin-booking-filter-menu">
          <summary><SlidersHorizontal />Filter{activeFilterCount > 0 && <b>{activeFilterCount}</b>}</summary>
          <div className="admin-booking-filter-popover">
            <div><strong>Filter bookings</strong><small>Narrow the current search results.</small></div>
            <div className="admin-booking-filters" aria-label="Filter bookings">
              <label><span>Listener</span><select value={listenerFilter} onChange={event => { setPage(1); setListenerFilter(event.target.value) }}><option value="">All listeners</option>{Array.from(listeners.values()).sort((a, b) => a.name.localeCompare(b.name)).map(listener => <option key={listener.id} value={listener.id}>{listener.name}</option>)}</select></label>
              <label><span>Appointment date</span><input type="date" value={appointmentFilter} onChange={event => { setPage(1); setAppointmentFilter(event.target.value) }} /></label>
              <label><span>Status</span><select value={statusFilter} onChange={event => { setPage(1); setStatusFilter(event.target.value) }}><option value="">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="expired">Expired</option></select></label>
              <button type="button" disabled={!activeFilterCount} onClick={() => { setPage(1); setListenerFilter(''); setAppointmentFilter(''); setStatusFilter('') }}>Clear filters</button>
            </div>
          </div>
        </details>
      </div>
    </div>
    <div className="admin-booking-list">
      <div className="admin-booking-list-heading" aria-hidden="true"><span>Customer</span><span>Listener</span><span>Appointment</span><span>Status</span><span /></div>
      {visibleBookings.map(booking => {
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
      {!filteredBookings.length && <p className="admin-empty">No bookings match these search filters.</p>}
      {filteredBookings.length > 0 && <nav className="admin-booking-pagination" aria-label="Booking results pages"><span>Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filteredBookings.length)} of {filteredBookings.length}</span><div><button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeft /></button><strong>Page {currentPage} of {totalPages}</strong><button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}><ChevronRight /></button></div></nav>}
    </div>
  </section>
}
