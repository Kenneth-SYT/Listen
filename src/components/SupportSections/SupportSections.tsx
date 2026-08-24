import './SupportSections.css'

const howItWorksSteps = [
  {
    label: 'Fill out mental quiz',
    detail: 'Answer a short check-in so we can better understand how you are feeling.',
  },
  {
    label: 'Get matched',
    detail: 'We suggest a supportive listener who fits what you need right now.',
  },
  {
    label: 'Book into session',
    detail: 'Choose a time to talk, get heard, and set gentle goals for the week.',
  },
  {
    label: 'Book follow up',
    detail: 'Keep checking in and work toward your goals one step at a time.',
  },
]

function SupportSections() {
  return (
    <section className="how-section" aria-labelledby="how-heading">
      <div className="how-header">
        <h2 id="how-heading">How it works</h2>
        <p>Start with a quick check-in, then connect with support that feels right for you.</p>
      </div>

      <div className="how-flow">
        <svg className="how-path" viewBox="0 0 1000 760" aria-hidden="true">
          <path d="M500 120 C500 215 452 260 360 260 H240 C130 260 90 330 138 392 C186 454 304 440 420 440 H604 C730 440 782 520 724 596 C690 642 626 674 548 760" />
        </svg>

        <article className="how-card how-card-main">
          <h3>
            How it works for <strong>peer support</strong>.
          </h3>
          <p>Simple steps to help university students check in, get heard, and keep moving forward.</p>
        </article>

        <div className="how-steps">
          {howItWorksSteps.map((step, index) => (
            <article className={`how-step step-${index + 1}`} key={step.label}>
              <span className="step-dot" aria-hidden="true"></span>
              <h3>{step.label}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default SupportSections
