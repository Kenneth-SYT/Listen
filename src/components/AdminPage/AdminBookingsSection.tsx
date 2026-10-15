import { ChevronDown, Eye, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { money, type Appointment, type Listener } from '../../lib/supabase'
import { k10Options, k10Questions, k6Options, k6Questions } from '../../lib/intake'
import type { AdminUser, Intake } from './adminTypes'
import { nameFor } from './adminUtils'
import AdminResultsPagination from './AdminResultsPagination'

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
const longAnswerLabels: Record<string, string> = {
  course: 'Course or area of study', courseYear: 'Year of study', studentType: 'Student type', timeInAustralia: 'Time in Australia',
  languages: 'Languages spoken', preferredLanguage: 'Preferred session language', culturalContext: 'Cultural context',
  preferenceImportance: 'Importance of listener preference', sharedExperiences: 'Shared experiences', matchingPriority: 'Matching priority',
  whatsGoingOn: 'What is going on', supportStyle: 'Preferred support style', sessionGoal: 'What they want from the session',
  listenerAvoid: 'Anything the listener should avoid', oneThing: 'One thing they want help with', conversationStart: 'How they would like to begin', anythingElse: 'Anything else',
}

function QuestionnaireModal({ intake, customerName, onClose }: { intake: Intake; customerName: string; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  const questions = intake.questionnaire_type === 'long' ? k10Questions : k6Questions
  const options = intake.questionnaire_type === 'long' ? k10Options : k6Options
  const answers = intake.questionnaire_type === 'long' ? intake.k10_answers : intake.k6_answers
  const writtenAnswers = Object.entries(intake.long_answers || {}).filter(([key, value]) => key !== 'impact' && Boolean(Array.isArray(value) ? value.length : String(value || '').trim()))
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="admin-questionnaire-modal" role="dialog" aria-modal="true" aria-labelledby="questionnaire-modal-title">
      <header><div><span>{intake.questionnaire_type === 'long' ? 'Long questionnaire' : 'Short check-in'}</span><h2 id="questionnaire-modal-title">{customerName}’s questionnaire</h2><p>Answers submitted for this booking.</p></div><button type="button" onClick={onClose} aria-label="Close questionnaire"><X /></button></header>
      <div className="admin-questionnaire-summary"><div><span>Score</span><strong>{intake.questionnaire_type === 'long' ? `K10 ${intake.k10_score ?? '—'}/50` : `K6 ${intake.k6_score ?? '—'}/24`}</strong></div><div><span>Listener preference</span><strong>{intake.listener_gender_preference || 'No preference'}</strong></div><div><span>Topics selected</span><strong>{intake.topics.length ? intake.topics.join(', ') : 'None selected'}</strong></div></div>
      <div className="admin-questionnaire-body">
        <section><h3>Wellbeing responses</h3><div className="admin-questionnaire-answers">{questions.map((question, index) => <div key={question}><span>{index + 1}</span><p>{question}</p><strong>{answers?.[index] == null ? 'Not answered' : options[intake.questionnaire_type === 'long' ? answers[index] - 1 : answers[index]] || `Score ${answers[index]}`}</strong></div>)}</div></section>
        {(writtenAnswers.length > 0 || intake.listener_note) && <section><h3>Written responses</h3><dl className="admin-questionnaire-written">{writtenAnswers.map(([key, value]) => <div key={key}><dt>{longAnswerLabels[key] || key.replace(/([A-Z])/g, ' $1')}</dt><dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}{intake.listener_note && <div><dt>Note for the listener</dt><dd>{intake.listener_note}</dd></div>}</dl></section>}
      </div>
      <footer><button type="button" onClick={onClose}>Close</button></footer>
    </section>
  </div>
}

export default function AdminBookingsSection({ bookings, intakes, listeners, users, search, onSearch }: Props) {
  const [listenerFilter, setListenerFilter] = useState('')
  const [appointmentFilter, setAppointmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)
  const [questionnaire, setQuestionnaire] = useState<{ intake: Intake; customerName: string } | null>(null)
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
      <div><h2>Bookings and consultants</h2></div>
      <div className="admin-booking-heading">
        <label className="admin-search"><Search size={17} /><span className="sr-only">Search</span><input value={search} onChange={event => { setPage(1); onSearch(event.target.value) }} placeholder="Search bookings" /></label>
        <div className="admin-booking-filter-stack">
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
    </div>
    <div className="admin-results-container">
      <div className="admin-results-scroll admin-booking-list">
        <div className="admin-booking-list-heading" aria-hidden="true"><span>Customer</span><span>Listener</span><span>Appointment</span><span>Status</span><span /></div>
        {visibleBookings.map(booking => {
        const person = users.get(booking.user_id)
        const listener = listeners.get(booking.listener_id)
        const intake = intakes.find(item => item.user_id === booking.user_id && item.selected_slot_id === booking.slot_id)
        const duration = Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000)
        const score = intake ? intake.questionnaire_type === 'long' ? `K10 ${intake.k10_score ?? '—'}/50` : `K6 ${intake.k6_score ?? '—'}/24` : 'No intake saved'

        const isExpanded = expandedBookingId === booking.id

        return <details className="admin-booking-row" key={booking.id} open={isExpanded}>
          <summary aria-expanded={isExpanded} onClick={event => { event.preventDefault(); setExpandedBookingId(isExpanded ? null : booking.id) }}>
            <span className="admin-booking-customer"><strong>{nameFor(person)}</strong></span>
            <span className="admin-booking-listener"><strong>{listener?.name || 'Unassigned'}</strong></span>
            <span className="admin-booking-appointment"><strong>{bookingDate(booking.starts_at)} <span aria-hidden="true">–</span> {bookingTime(booking.starts_at)} <span aria-hidden="true">–</span> {duration} min</strong></span>
            <span className={'admin-status ' + booking.status}>{booking.status}</span>
            <span className="admin-row-disclosure"><span>Details</span><ChevronDown className="admin-booking-chevron" aria-hidden="true" /></span>
          </summary>
          <div className="admin-booking-details">
            <dl>
              <div><dt>Email</dt><dd>{person?.email || booking.user_id}</dd></div>
              <div><dt>Mobile</dt><dd>{person?.mobile || 'Not provided'}</dd></div>
              <div><dt>Starts</dt><dd>{new Date(booking.starts_at).toLocaleString('en-AU')}</dd></div>
              <div><dt>Session length</dt><dd>{duration} minutes</dd></div>
              <div><dt>Questionnaire</dt><dd className="admin-questionnaire-cell"><span>{score}</span>{intake && <button type="button" onClick={() => setQuestionnaire({ intake, customerName: nameFor(person) })}><Eye />View answers</button>}</dd></div>
              <div><dt>Topics</dt><dd>{intake?.topics.length ? intake.topics.join(', ') : 'None saved'}</dd></div>
              <div><dt>Payment</dt><dd>{money(booking.amount_cents)} · {booking.rate_code}{booking.paid_with_credit ? ' · Credit' : ''}</dd></div>
              <div><dt>Booking reference</dt><dd>{booking.id}</dd></div>
              {intake?.listener_note && <div className="admin-booking-note"><dt>Listener note</dt><dd>{intake.listener_note}</dd></div>}
            </dl>
          </div>
        </details>
        })}
        {!filteredBookings.length && <p className="admin-empty">No bookings match these search filters.</p>}
      </div>
      <AdminResultsPagination page={currentPage} totalItems={filteredBookings.length} onPageChange={setPage} />
    </div>
    {questionnaire && <QuestionnaireModal intake={questionnaire.intake} customerName={questionnaire.customerName} onClose={() => setQuestionnaire(null)} />}
  </section>
}
