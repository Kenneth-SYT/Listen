import { Clock3, MessageCircleHeart, Timer } from 'lucide-react'
import { useState } from 'react'
import { createBundleCheckout, errorMessage } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import './PricingPage.css'

const sessions = [
  {
    icon: MessageCircleHeart,
    label: '30 minutes',
    title: 'Introductory chat',
    description: 'A low-pressure first chat to share what’s on your mind and see whether peer support feels right for you.',
    price: '$20',
    note: 'One introductory chat per student',
  },
  {
    icon: Clock3,
    label: '50 minutes',
    title: 'Standard support session',
    description: 'Time with a supportive listener to talk things through, reflect and decide on your next step.',
    price: '$35',
    note: 'Book sessions when you need them',
  },
  {
    icon: Timer,
    label: '2 hours',
    title: 'Extended support session',
    description: 'A longer conversation when you want more time to unpack what is happening without feeling rushed.',
    price: '$80',
    note: 'Extra time for a deeper conversation',
  },
]
const bundles = [
  { code: 'standard_3', sessions: 3, title: 'Three-session bundle', price: '$99 AUD', detail: '$33 per session · save $6' },
  { code: 'standard_5', sessions: 5, title: 'Five-session bundle', price: '$160 AUD', detail: '$32 per session · save $15' },
]

function PricingPage() {
  const { session, loading } = useSession()
  const [buying, setBuying] = useState('')
  const [message, setMessage] = useState('')
  const buyBundle = async (code: string) => {
    if (loading || buying) return
    if (!session) {
      window.location.assign('/account')
      return
    }
    setBuying(code); setMessage('')
    try { window.location.assign(await createBundleCheckout(code)) }
    catch (error) { setBuying(''); setMessage(errorMessage(error)) }
  }
  return (
    <section className="pricing-page" aria-labelledby="pricing-heading">
      <header className="pricing-heading">
        <span>Simple session pricing</span>
        <h1 id="pricing-heading">Start at your own pace.</h1>
        <p>Choose a session length that gives you the time and space you need.</p>
      </header>

      <div className="pricing-card-grid">
        {sessions.map((session, index) => {
          const Icon = session.icon
          return (
            <article className={`pricing-card${index === 0 ? ' featured' : ''}`} key={session.title}>
              {index === 0 && <span className="pricing-badge">A gentle first step</span>}
              <div className="pricing-duration"><Icon size={25} aria-hidden="true" /><span>{session.label}</span></div>
              <h2>{session.title}</h2>
              <p className="pricing-description">{session.description}</p>
              <p className="pricing-price"><strong>{session.price}</strong><span> per session</span></p>
              <p className="pricing-note">{session.note}</p>
              <a className="pricing-book-button" href="/get-matched">Get started</a>
            </article>
          )
        })}
      </div>

      <section className="pricing-bundles" aria-labelledby="bundle-heading">
        <div className="pricing-bundle-heading"><span>Plan ahead and save</span><h2 id="bundle-heading">Standard-session bundles</h2><p>Pay once, then schedule each 50-minute session separately whenever you’re ready. Your remaining credits stay visible in your account.</p></div>
        <div className="pricing-bundle-grid">
          {bundles.map(bundle => <article key={bundle.code}><strong>{bundle.sessions}</strong><div><h3>{bundle.title}</h3><p><b>{bundle.price}</b><span>{bundle.detail}</span></p></div><button type="button" disabled={loading || Boolean(buying)} onClick={() => void buyBundle(bundle.code)}>{buying === bundle.code ? 'Opening secure checkout…' : 'Buy bundle'}</button></article>)}
        </div>
        {message && <p className="pricing-bundle-error" role="alert">{message}</p>}
        <p className="pricing-bundle-note">You can purchase a bundle at any time. Each credit covers one standard session and is deducted only when that separately selected appointment is confirmed. New customers complete the introductory session before using bundle credits.</p>
      </section>

      <div className="pricing-help">
        <h2>Not sure which session to choose?</h2>
        <p>Start with the introductory chat, or contact us if you have a question before booking.</p>
        <a href="/contact">Ask us a question <span aria-hidden="true">→</span></a>
      </div>
    </section>
  )
}

export default PricingPage
