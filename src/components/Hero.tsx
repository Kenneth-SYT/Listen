import heroImage from '../assets/images/Support-16_9.png.webp'

function Hero() {
  return (
    <section className="hero-panel" aria-label="Health information and advice">
      <img
        src={heroImage}
        alt="A person offering supportive care with a hand on another person's shoulder"
      />
      <div className="hero-callout">
        <h1>Mental health is Important</h1>
      </div>
    </section>
  )
}

export default Hero
