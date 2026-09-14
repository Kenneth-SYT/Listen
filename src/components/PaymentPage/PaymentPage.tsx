import { ArrowRight, ExternalLink, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import './PaymentPage.css'

function PaymentPage() {
  const params = new URLSearchParams(window.location.search)
  const listener = params.get('listener') ?? 'Your selected listener'
  const rawDate = params.get('date')
  const date = rawDate ? new Date(rawDate) : null
  const time = params.get('time') ?? 'To be confirmed'
  const amount = params.get('amount') ?? '1.00'
  const stripePaymentLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK as string | undefined
  const [setupMessage, setSetupMessage] = useState(false)

  const continueToStripe = () => {
    if (!stripePaymentLink) {
      setSetupMessage(true)
      return
    }

    const checkoutUrl = new URL(stripePaymentLink)
    localStorage.setItem('lmhPendingBooking', JSON.stringify({
      listener,
      date: rawDate,
      time,
      amount,
    }))
    checkoutUrl.searchParams.set('client_reference_id', `LMH-${Date.now()}`)
    window.location.assign(checkoutUrl.toString())
  }

  return (
    <section className="payment-page" aria-labelledby="payment-heading">
      <div className="payment-shell">
        <div className="payment-content">
          <span className="payment-eyebrow"><LockKeyhole size={16} aria-hidden="true" /> Secure payment</span>
          <h1 id="payment-heading">Complete your booking.</h1>
          <p>You’ll continue to Stripe’s secure checkout to enter your payment details.</p>

          <div className="checkout-handoff">
            <div className="checkout-handoff-icon"><ExternalLink size={24} aria-hidden="true" /></div>
            <div>
              <strong>Next: secure Stripe checkout</strong>
              <p>Stripe will open in a new secure checkout screen where you can enter your card details and complete payment.</p>
            </div>
          </div>

          <button className="stripe-button" type="button" onClick={continueToStripe}>Continue to pay ${amount} AUD <ArrowRight size={19} aria-hidden="true" /></button>
          {setupMessage && <p className="stripe-setup-message" role="status">Add your Stripe Payment Link to <code>VITE_STRIPE_PAYMENT_LINK</code> to enable checkout.</p>}
          <div className="payment-security"><ShieldCheck size={19} aria-hidden="true" /><span>Stripe securely processes your payment. Listen Mental Health does not store card details.</span></div>
        </div>

        <aside className="payment-summary" aria-labelledby="payment-summary-heading">
          <span>Booking summary</span>
          <h2 id="payment-summary-heading">Introductory chat</h2>
          <dl>
            <div><dt>Listener</dt><dd>{listener}</dd></div>
            <div><dt>Date</dt><dd>{date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : 'To be confirmed'}</dd></div>
            <div><dt>Time</dt><dd>{time}</dd></div>
            <div><dt>Duration</dt><dd>30 minutes</dd></div>
          </dl>
          <div className="payment-total"><span>Total</span><strong>${amount} AUD</strong></div>
          <a href="/get-matched">← Change booking</a>
        </aside>
      </div>
    </section>
  )
}

export default PaymentPage
