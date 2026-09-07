import './Hero.css'
import TestimonialsColumn from '../ui/testimonial-v2'

function Hero() {
  return (
    <section className="hero-panel" id="home" data-nav-section="get-started" aria-label="Health information and advice">
      <div className="hero-content landing-hero">
        <div className="hero-copy">
          <h1>Uni life is a lot. You don’t have to carry it alone.</h1>
          <p>Talk things through with a supportive listener, at your own pace.</p>
          <a href="/get-matched">Find your listener</a>
          <p className="hero-price-note">Your first chat is $1.</p>
        </div>
        <TestimonialsColumn />
        <div className="hero-preview landing-hidden-preview" aria-hidden="true">
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

export default Hero
