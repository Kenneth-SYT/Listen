import './HowItWorksSummary.css'

const previewSteps = [
  { title: 'Questionnaire', text: 'Tell us what support would help' },
  { title: 'Your match', text: 'Meet a listener suited to you' },
  { title: 'Choose a time', text: 'Book a session that fits' },
]

function HowItWorksSummary() {
  return (
    <section className="how-summary" id="how-it-works" data-nav-section="how-it-works" aria-labelledby="how-summary-heading">
      <div className="how-summary-heading" data-home-reveal>
        <h2 id="how-summary-heading">How it works</h2>
        <p>A few simple steps to a conversation that’s about you.</p>
      </div>
      <div className="how-summary-layout">
        <div className="how-product-preview" aria-label="Preview of the check-in and matching experience" data-home-reveal>
          <div className="how-preview-track" aria-hidden="true"></div>
          <ol className="how-preview-journey">
            {previewSteps.map((step, index) => {
              return <li key={step.title}>
                <span className="how-preview-node" aria-hidden="true">{index + 1}</span>
                <div><strong>{step.title}</strong><p>{step.text}</p></div>
              </li>
            })}
          </ol>
        </div>
        <div className="how-summary-content" data-home-reveal="right">
          <div className="how-summary-actions">
            <a className="how-summary-primary" href="/get-matched">Find your listener <span aria-hidden="true">→</span></a>
            <a className="how-summary-link" href="/how-it-works">More info <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSummary
