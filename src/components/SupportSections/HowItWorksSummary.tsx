import { useEffect, useRef } from 'react'
import './HowItWorksSummary.css'

const steps = [
  { title: 'Check in', text: 'Answer a few questions about how you’re feeling.' },
  { title: 'Find your listener', text: 'Get matched with someone who fits your needs.' },
  { title: 'Start talking', text: 'Choose a time and talk at your own pace.' },
]

function HowItWorksSummary() {
  const stepsRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const items = Array.from(stepsRef.current?.children ?? [])
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.2 })

    items.forEach((item) => {
      item.classList.add('reveal-ready')
      observer.observe(item)
    })

    return () => {
      observer.disconnect()
      items.forEach((item) => item.classList.remove('reveal-ready', 'is-revealed'))
    }
  }, [])

  return (
    <section className="how-summary" id="how-it-works" data-nav-section="how-it-works" aria-labelledby="how-summary-heading">
      <div className="how-summary-heading">
        <h2 id="how-summary-heading">How it works</h2>
        <p>A few simple steps to a conversation that’s about you.</p>
      </div>
      <div className="how-summary-layout">
        <div className="how-product-preview" aria-label="Preview of the check-in and matching experience">
          <div className="how-preview-window">
            <span className="how-preview-label">Quick check-in</span>
            <h3>How are you feeling today?</h3>
            <div className="how-moods" aria-hidden="true"><span>Low</span><span>Okay</span><span className="selected">Good</span><span>Great</span></div>
            <div className="how-preview-lines" aria-hidden="true"><span></span><span></span></div>
          </div>
          <div className="how-match-preview">
            <span className="how-match-avatar" aria-hidden="true"></span>
            <div><small>Your match</small><strong>A listener who fits your needs</strong></div>
            <span className="how-match-status">Ready</span>
          </div>
        </div>
        <div className="how-summary-content">
          <ol className="how-summary-steps" ref={stepsRef}>
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="how-summary-number" aria-hidden="true">{index + 1}</span>
                <div><h3>{step.title}</h3><p>{step.text}</p></div>
              </li>
            ))}
          </ol>
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
