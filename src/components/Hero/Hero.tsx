import heroImage from '../../assets/images/LMH.png'
import './Hero.css'

function Hero() {
  return (
    <section className="hero-panel" aria-label="Health information and advice">
      <div className="hero-content">
        <div className="hero-copy">
          <h1>First Chat for only $1</h1>
          <p>Connect with a supportive listener when university life feels heavy.</p>
          <a href="/pricing">Book now</a>
        </div>
        <img
          src={heroImage}
          alt="Listen Mental Health preview"
        />
      </div>
    </section>
  )
}

export default Hero
