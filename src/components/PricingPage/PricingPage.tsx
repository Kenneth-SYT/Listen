import { Clock3, MessageCircleHeart } from 'lucide-react'
import './PricingPage.css'

const sessions = [
  {
    icon: MessageCircleHeart,
    label: 'First conversation',
    title: 'Introductory chat',
    description: 'A low-pressure first chat to share what’s on your mind and see whether peer support feels right for you.',
    price: '$1',
    note: 'One introductory chat per student',
  },
  {
    icon: Clock3,
    label: '60 minutes',
    title: 'Standard support session',
    description: 'A full hour with a supportive listener to talk things through, reflect and decide on your next step.',
    price: '$35',
    note: 'Book sessions when you need them',
  },
]

function PricingPage() {
  return (
    <section className="pricing-page" aria-labelledby="pricing-heading">
      <header className="pricing-heading">
        <span>Simple session pricing</span>
        <h1 id="pricing-heading">Start at your own pace.</h1>
        <p>Choose the conversation that feels right for you. There are no complicated plans or package levels.</p>
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

      <div className="pricing-help">
        <h2>Not sure which session to choose?</h2>
        <p>Start with the introductory chat, or contact us if you have a question before booking.</p>
        <a href="/contact">Ask us a question <span aria-hidden="true">→</span></a>
      </div>
    </section>
  )
}

export default PricingPage
