import './HowItWorksSummary.css'

const steps = [
  { title: 'Check in', text: 'Answer a few questions about how you’re feeling.' },
  { title: 'Find your listener', text: 'Get matched with someone who fits your needs.' },
  { title: 'Start talking', text: 'Choose a time and talk at your own pace.' },
]

function HowItWorksSummary() {
  return (
    <section className="how-summary" aria-labelledby="how-summary-heading">
      <h2 id="how-summary-heading">How it works</h2>
      <p className="how-summary-intro">A few simple steps to a conversation that’s about you.</p>
      <ol className="how-summary-steps">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="how-summary-number" aria-hidden="true">{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
      <a className="how-summary-link" href="/how-it-works">More about how it works <span aria-hidden="true">→</span></a>
    </section>
  )
}

export default HowItWorksSummary
