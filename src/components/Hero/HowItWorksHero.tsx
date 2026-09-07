import './Hero.css'

function HowItWorksHero() {
  return (
    <section className="hero-panel" aria-label="Health information and advice">
      <div className="hero-content">
        <div className="hero-copy">
          <h1>A little check-in. A conversation. Your next step.</h1>
          <p>See how to find a listener and make space for what’s on your mind.</p>
          <a href="/pricing">Find your listener</a>
          <p className="hero-price-note">Your first chat is $1.</p>
        </div>
        <div className="hero-preview" aria-hidden="true">
          <div className="checkin-card">
            <span className="preview-label">Quick check-in</span>
            <div className="mood-row">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="checkin-lines">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div className="listener-card">
            <span className="listener-avatar"></span>
            <div>
              <span className="preview-label">Matched listener</span>
              <span className="listener-line"></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorksHero
