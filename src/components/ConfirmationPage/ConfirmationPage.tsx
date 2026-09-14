import { CalendarDays, CheckCircle2, Mail } from 'lucide-react'
import './ConfirmationPage.css'

type PendingBooking = {
  listener?: string
  date?: string | null
  time?: string
  amount?: string
}

function getPendingBooking(): PendingBooking {
  try {
    return JSON.parse(localStorage.getItem('lmhPendingBooking') ?? '{}')
  } catch {
    return {}
  }
}

function ConfirmationPage() {
  const booking = getPendingBooking()
  const sessionId = new URLSearchParams(window.location.search).get('session_id')
  const date = booking.date ? new Date(booking.date) : null
  const formattedDate = date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Your selected date'

  return (
    <section className="confirmation-page" aria-labelledby="confirmation-heading">
      <div className="confirmation-card">
        <div className="confirmation-icon"><CheckCircle2 size={44} aria-hidden="true" /></div>
        <span className="confirmation-eyebrow">Payment submitted</span>
        <h1 id="confirmation-heading">Your booking is on its way.</h1>
        <p className="confirmation-intro">Thanks for booking with Listen Mental Health. Keep an eye on your inbox for the final appointment details.</p>

        <div className="confirmation-details">
          <div>
            <span>Listener</span>
            <strong>{booking.listener ?? 'Your selected listener'}</strong>
          </div>
          <div>
            <span>Date</span>
            <strong>{formattedDate}</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{booking.time ?? 'Your selected time'}</strong>
          </div>
          <div>
            <span>Amount</span>
            <strong>${booking.amount ?? '1.00'} AUD</strong>
          </div>
        </div>

        <div className="confirmation-note">
          <Mail size={21} aria-hidden="true" />
          <p>A receipt will be sent by Stripe to the email address used at checkout.</p>
        </div>

        {sessionId && <p className="confirmation-reference">Stripe reference: <code>{sessionId}</code></p>}

        <div className="confirmation-actions">
          <a className="confirmation-primary" href="/">Return home</a>
          <a className="confirmation-secondary" href="/get-matched"><CalendarDays size={18} /> Book another session</a>
        </div>

        <p className="confirmation-caveat">This prototype displays the details saved in this browser. Production bookings should be verified by a secure Stripe webhook.</p>
      </div>
    </section>
  )
}

export default ConfirmationPage
