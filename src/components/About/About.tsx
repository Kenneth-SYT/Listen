import { ChartNoAxesCombined, ClipboardCheck, UsersRound } from 'lucide-react'
import './About.css'

const aboutCards = [
  {
    icon: ClipboardCheck,
    title: 'Easy to start',
    text: 'Take a quick quiz to check in with your mental health and better understand what kind of support may help right now.',
  },
  {
    icon: UsersRound,
    title: 'Supportive listeners',
    text: 'Connect with listeners who can understand what you are going through and gently guide you toward your next step.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Track your progress',
    text: 'Keep track of your check-ins, mood patterns, and progress over time as you continue your mental health journey.',
  },
]

function About() {
  return (
    <section className="about-section">
      <div className="about-heading">
        <h2>We Provide Peer Support</h2>
      </div>

      <div className="about-card-grid">
        {aboutCards.map((card, index) => {
          const Icon = card.icon

          return (
            <article className="about-card" key={card.title}>
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
