import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import './BookingPage.css'
import type { CustomerDetails } from '../DetailsPage/DetailsPage'

const listeners = [
  { name: 'Alex Morgan', initials: 'AM', focus: 'Study pressure and stress', matches: ['Study pressure'] },
  { name: 'Casey Nguyen', initials: 'CN', focus: 'Feeling overwhelmed', matches: ['Feeling overwhelmed'] },
  { name: 'Jamie Lee', initials: 'JL', focus: 'Relationships and connection', matches: ['Relationships'] },
  { name: 'Sam Taylor', initials: 'ST', focus: 'Confidence and routines', matches: ['Something else'] },
]

const times = ['9:00 am', '10:30 am', '1:00 pm', '3:30 pm', '5:00 pm']

type BookingPageProps = {
  answers: string[]
  customerDetails: CustomerDetails
}

function getAvailableDates() {
  const dates: Date[] = []
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  const finalDate = new Date(cursor)
  finalDate.setDate(finalDate.getDate() + 28)

  while (cursor < finalDate) {
    cursor.setDate(cursor.getDate() + 1)
    if (cursor.getDay() !== 0) dates.push(new Date(cursor))
  }

  return dates
}

const dateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

function getCalendarDays(month: Date) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const numberOfDays = new Date(year, monthIndex + 1, 0).getDate()
  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: numberOfDays }, (_, index) => new Date(year, monthIndex, index + 1, 12)),
  ]
}

function BookingPage({ answers, customerDetails }: BookingPageProps) {
  const availableDates = useMemo(() => getAvailableDates(), [])
  const recommended = listeners.find((listener) => listener.matches.includes(answers[0])) ?? listeners[0]
  const [selectedListener, setSelectedListener] = useState(recommended.name)
  const [selectedDate, setSelectedDate] = useState(availableDates[0])
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(availableDates[0].getFullYear(), availableDates[0].getMonth(), 1))
  const [selectedTime, setSelectedTime] = useState(times[1])
  const [paymentError, setPaymentError] = useState(false)
  const stripePaymentLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK as string | undefined
  const availableDateKeys = useMemo(() => new Set(availableDates.map(dateKey)), [availableDates])
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth])
  const firstAvailableMonth = availableDates[0].getFullYear() * 12 + availableDates[0].getMonth()
  const lastAvailableDate = availableDates[availableDates.length - 1]
  const lastAvailableMonth = lastAvailableDate.getFullYear() * 12 + lastAvailableDate.getMonth()
  const visibleMonthIndex = visibleMonth.getFullYear() * 12 + visibleMonth.getMonth()

  const changeMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const continueToStripe = () => {
    if (!stripePaymentLink) {
      setPaymentError(true)
      return
    }

    localStorage.setItem('lmhPendingBooking', JSON.stringify({
      listener: selectedListener,
      date: selectedDate.toISOString(),
      time: selectedTime,
      amount: '1.00',
      customerName: customerDetails.preferredName || customerDetails.firstName,
      email: customerDetails.email,
    }))

    const checkoutUrl = new URL(stripePaymentLink)
    checkoutUrl.searchParams.set('client_reference_id', `LMH-${Date.now()}`)
    checkoutUrl.searchParams.set('prefilled_email', customerDetails.email)
    window.location.assign(checkoutUrl.toString())
  }

  return (
    <div className="booking-flow">
      <header className="booking-heading">
        <span><Sparkles size={16} aria-hidden="true" /> Your recommendations</span>
        <h1 id="match-heading">Choose your listener and a time.</h1>
        <p>Based on your check-in, we think {recommended.name} could be a good place to start. You are always free to choose someone else.</p>
      </header>

      <div className="booking-layout">
        <div className="booking-main">
          <section className="booking-panel" aria-labelledby="listener-choice-heading">
            <div className="booking-panel-heading">
              <span className="booking-step">1</span>
              <div><h2 id="listener-choice-heading">Choose a listener</h2><p>Pick the person who feels most comfortable for you.</p></div>
            </div>
            <div className="booking-listeners">
              {listeners.map((listener) => {
                const selected = listener.name === selectedListener
                const isRecommended = listener.name === recommended.name
                return (
                  <button
                    className={`booking-listener${selected ? ' selected' : ''}`}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedListener(listener.name)}
                    key={listener.name}
                  >
                    {isRecommended && <span className="recommended-label">Best match</span>}
                    <span className="booking-avatar" aria-hidden="true">{listener.initials}</span>
                    <strong>{listener.name}</strong>
                    <small>{listener.focus}</small>
                    <span className="booking-check" aria-hidden="true"><Check size={15} /></span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="booking-panel" aria-labelledby="date-choice-heading">
            <div className="booking-panel-heading">
              <span className="booking-step">2</span>
              <div><h2 id="date-choice-heading">Select an available date</h2><p>Times are shown in your local timezone.</p></div>
            </div>
            <div className="booking-schedule">
              <div className="booking-calendar">
              <div className="calendar-toolbar">
                <strong>{visibleMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}</strong>
                <div>
                  <button type="button" aria-label="Previous month" disabled={visibleMonthIndex <= firstAvailableMonth} onClick={() => changeMonth(-1)}><ChevronLeft size={19} /></button>
                  <button type="button" aria-label="Next month" disabled={visibleMonthIndex >= lastAvailableMonth} onClick={() => changeMonth(1)}><ChevronRight size={19} /></button>
                </div>
              </div>
              <div className="calendar-weekdays" aria-hidden="true">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="calendar-grid" role="grid" aria-label="Available appointment dates">
                {calendarDays.map((date, index) => {
                  if (!date) return <span className="calendar-blank" aria-hidden="true" key={`blank-${index}`}></span>
                  const available = availableDateKeys.has(dateKey(date))
                  const selected = dateKey(date) === dateKey(selectedDate)
                  return (
                    <button
                      type="button"
                      className={selected ? 'selected' : ''}
                      disabled={!available}
                      aria-label={date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                      aria-pressed={selected}
                      onClick={() => setSelectedDate(date)}
                      key={dateKey(date)}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
              </div>
              <div className="booking-time-panel">
                <p className="time-heading"><Clock3 size={17} aria-hidden="true" /> Available times</p>
                <span className="time-date">{selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                <div className="booking-times" role="group" aria-label="Available times">
                  {times.map((time) => (
                    <button type="button" className={time === selectedTime ? 'selected' : ''} aria-pressed={time === selectedTime} onClick={() => setSelectedTime(time)} key={time}>
                      <Clock3 size={17} aria-hidden="true" /> {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="booking-summary" aria-labelledby="booking-summary-heading">
          <span className="summary-icon"><CalendarDays size={25} aria-hidden="true" /></span>
          <h2 id="booking-summary-heading">Your booking</h2>
          <dl>
            <div><dt>Listener</dt><dd>{selectedListener}</dd></div>
            <div><dt>Date</dt><dd>{selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</dd></div>
            <div><dt>Time</dt><dd>{selectedTime}</dd></div>
            <div><dt>Session</dt><dd>Introductory chat, 30 min</dd></div>
          </dl>
          <div className="booking-total"><span>Total</span><strong>$1.00 AUD</strong></div>
          <button className="booking-continue" type="button" onClick={continueToStripe}>Review and pay <span aria-hidden="true">→</span></button>
          {paymentError && <p className="booking-payment-error" role="status">Stripe checkout is not configured. Please try again later.</p>}
          <p className="booking-reassurance">You’ll enter your payment details securely on Stripe.</p>
        </aside>
      </div>
    </div>
  )
}

export default BookingPage
