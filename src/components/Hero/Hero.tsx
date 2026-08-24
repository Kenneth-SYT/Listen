import heroImage from '../../assets/images/Support-16_9.png.webp'
import './Hero.css'

function Hero() {
  return (
    <section className="hero-panel" aria-label="Health information and advice">
      <img
        src={heroImage}
        alt="A person offering supportive care with a hand on another person's shoulder"
      />
      <div className="hero-callout">
        <h1>First Chat for only $1</h1>
      </div>
    </section>
  )
}

export default Hero
