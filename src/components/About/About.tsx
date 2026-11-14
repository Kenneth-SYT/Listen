import { ClipboardCheck, Milestone, UsersRound } from 'lucide-react'
import './About.css'

const aboutCards = [
  {
    icon: ClipboardCheck,
    title: 'Easy to start',
    text: 'A quick check-in helps you find a starting point that feels right.',
  },
  {
    icon: UsersRound,
    title: 'Supportive listeners',
    text: 'Space to talk openly, feel heard, and work through what’s on your mind.',
  },
  {
    icon: Milestone,
    title: 'Goal focused',
    text: 'Progress towards your goal with applicable strategies tailored to you.',
  },
]

function About() {
  return (
    <section
      className="about-section cards-visible"
      id="about"
      data-nav-section="about"
      aria-labelledby="about-heading"
    >
      <div className="about-heading" data-home-reveal>
        <h2 id="about-heading">A space to talk. Someone to listen.</h2>
        <p>
          Whether it’s study pressure, feeling disconnected, or anything you need help with, you
          can talk it through with a supportive listener.
        </p>
      </div>

      <div className="about-card-grid" data-home-reveal="scale">
        {aboutCards.map((card, index) => {
          const Icon = card.icon

          return (
            <article
              className="about-card border shadow-md"
              key={card.title}
            >
              <span className={`about-card-icon icon-${index + 1}`} aria-hidden="true">
                <Icon size={38} strokeWidth={1.8} />
              </span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default About
