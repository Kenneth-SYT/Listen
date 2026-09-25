import { HeartHandshake, Hospital, PhoneCall, Stethoscope } from 'lucide-react'
import './SafetySupportPage.css'

function SafetySupportPage() {
  return (
    <div className="safety-support" role="alert" aria-labelledby="safety-support-heading">
      <div className="safety-support-icon" aria-hidden="true"><HeartHandshake /></div>
      <span className="match-eyebrow">A safer next step</span>
      <h1 id="safety-support-heading">Please connect with professional support.</h1>
      <p className="safety-support-lead">
        Your answers suggest that you may need more support than our peer listeners can safely provide. Listen is a peer-support service and does not provide crisis care, diagnosis or clinical treatment, so you cannot continue to account creation or booking from this questionnaire.
      </p>

      <div className="safety-support-grid">
        <article className="safety-support-card safety-support-urgent">
          <span aria-hidden="true"><Hospital /></span>
          <div>
            <h2>If you or someone else is in immediate danger</h2>
            <p>Call Triple Zero or go to the nearest hospital emergency department now.</p>
            <a className="safety-primary-action" href="tel:000">Call 000</a>
          </div>
        </article>

        <article className="safety-support-card">
          <span aria-hidden="true"><PhoneCall /></span>
          <div>
            <h2>Talk to someone now</h2>
            <p>Lifeline provides confidential crisis support throughout Australia, 24 hours a day.</p>
            <a href="tel:131114">Call Lifeline — 13 11 14</a>
            <a href="sms:0477131114">Text Lifeline — 0477 13 11 14</a>
          </div>
        </article>

        <article className="safety-support-card">
          <span aria-hidden="true"><Stethoscope /></span>
          <div>
            <h2>Arrange professional care</h2>
            <p>Make an appointment with a GP. They can assess what support you need and refer you to a psychologist or psychiatrist.</p>
            <a href="https://www.healthdirect.gov.au/australian-health-services" target="_blank" rel="noreferrer">Find a health service</a>
          </div>
        </article>
      </div>

      <p className="safety-support-note">This screening result is not a diagnosis and does not by itself mean that you are in an emergency.</p>
    </div>
  )
}

export default SafetySupportPage
