import { CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react'
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

          <div className="stripe-preview" aria-hidden="true">
            <div className="stripe-preview-heading"><CreditCard size={22} /><strong>Payment details</strong></div>
            <span>Card information is entered securely on Stripe</span>
            <div className="stripe-field"></div>
            <div className="stripe-field-row"><div></div><div></div></div>
          </div>

          <button className="stripe-button" type="button" onClick={continueToStripe}>Pay ${amount} securely with Stripe <span aria-hidden="true">→</span></button>
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
