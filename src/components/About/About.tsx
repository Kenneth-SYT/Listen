import { ChartNoAxesCombined, ClipboardCheck, UsersRound } from 'lucide-react'
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
    icon: ChartNoAxesCombined,
    title: 'Track your progress',
    text: 'Notice your mood patterns and small steps forward over time.',
  },
]

function About() {
  return (
    <section className="about-section" id="about" data-nav-section="about" aria-labelledby="about-heading">
      <div className="about-heading">
        <h2 id="about-heading">A space to talk. Someone to listen.</h2>
        <p>
          Listen Mental Health offers peer support for university students. Whether it’s study
          pressure, feeling disconnected, or simply a difficult week, you can talk things through
          with a supportive listener.
        </p>
      </div>

      <div className="about-card-grid">
        {aboutCards.map((card, index) => {
          const Icon = card.icon

          return (
            <article
              className="about-card bg-white border border-[#d8e8f4] shadow-md"
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
