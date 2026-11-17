import './HowItWorksSummary.css'

const previewSteps = [
  { title: 'Check in', text: 'Answer a few questions about how you’re feeling.' },
  { title: 'Find your listener', text: 'Get matched with someone who fits your needs.' },
  { title: 'Start talking', text: 'Choose a time and talk at your own pace.' },
]

function HowItWorksSummary() {
  return (
    <section className="how-summary" id="how-it-works" data-nav-section="how-it-works" aria-label="How it works">
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
