import { CalendarDays, Check, Clock3, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import './BookingPage.css'

const listeners = [
  { name: 'Alex Morgan', initials: 'AM', focus: 'Study pressure and stress', matches: ['Study pressure'] },
  { name: 'Casey Nguyen', initials: 'CN', focus: 'Feeling overwhelmed', matches: ['Feeling overwhelmed'] },
  { name: 'Jamie Lee', initials: 'JL', focus: 'Relationships and connection', matches: ['Relationships'] },
  { name: 'Sam Taylor', initials: 'ST', focus: 'Confidence and routines', matches: ['Something else'] },
]

const times = ['9:00 am', '10:30 am', '1:00 pm', '3:30 pm', '5:00 pm']

type BookingPageProps = {
  answers: string[]
}

function getAvailableDates() {
  const dates: Date[] = []
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)

  while (dates.length < 10) {
    cursor.setDate(cursor.getDate() + 1)
    if (cursor.getDay() !== 0) dates.push(new Date(cursor))
  }

  return dates
}

function BookingPage({ answers }: BookingPageProps) {
  const availableDates = useMemo(() => getAvailableDates(), [])
  const recommended = listeners.find((listener) => listener.matches.includes(answers[0])) ?? listeners[0]
  const [selectedListener, setSelectedListener] = useState(recommended.name)
  const [selectedDate, setSelectedDate] = useState(availableDates[0])
  const [selectedTime, setSelectedTime] = useState(times[1])

  const paymentParams = new URLSearchParams({
    listener: selectedListener,
    date: selectedDate.toISOString(),
    time: selectedTime,
    amount: '1.00',
  })

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
            <div className="booking-dates" role="group" aria-label="Available dates">
              {availableDates.map((date) => {
                const selected = date.toDateString() === selectedDate.toDateString()
                return (
                  <button type="button" className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => setSelectedDate(date)} key={date.toISOString()}>
                    <span>{date.toLocaleDateString('en-AU', { weekday: 'short' })}</span>
                    <strong>{date.getDate()}</strong>
                    <small>{date.toLocaleDateString('en-AU', { month: 'short' })}</small>
                  </button>
                )
              })}
            </div>
            <div className="booking-times" role="group" aria-label="Available times">
              {times.map((time) => (
                <button type="button" className={time === selectedTime ? 'selected' : ''} aria-pressed={time === selectedTime} onClick={() => setSelectedTime(time)} key={time}>
                  <Clock3 size={17} aria-hidden="true" /> {time}
                </button>
              ))}
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
          <a className="booking-continue" href={`/payment?${paymentParams.toString()}`}>Continue to payment <span aria-hidden="true">→</span></a>
          <p className="booking-reassurance">You can review everything before paying.</p>
        </aside>
      </div>
    </div>
  )
}

export default BookingPage
