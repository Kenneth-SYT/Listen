import { ChartNoAxesCombined, ClipboardCheck, UsersRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  const cardGridRef = useRef<HTMLDivElement>(null)
  const [cardsVisible, setCardsVisible] = useState(false)

  useEffect(() => {
    const cardGrid = cardGridRef.current
    if (!cardGrid || !('IntersectionObserver' in window)) {
      setCardsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCardsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -18% 0px' },
    )

    observer.observe(cardGrid)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      className={`about-section${cardsVisible ? ' cards-visible' : ''}`}
      id="about"
      data-nav-section="about"
      aria-labelledby="about-heading"
    >
      <div className="about-heading">
        <h2 id="about-heading">A space to talk. Someone to listen.</h2>
        <p>
          Listen Mental Health offers peer support for university students. Whether it’s study
          pressure, feeling disconnected, or simply a difficult week, you can talk things through
          with a supportive listener.
        </p>
      </div>

      <div className="about-card-grid" ref={cardGridRef}>
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
