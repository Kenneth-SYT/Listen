import { BadgeDollarSign, CalendarDays, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import './LandingSections.css'

const highlights = [
  { icon: CalendarDays, value: '7 days', label: 'support available each week' },
  { icon: BadgeDollarSign, value: '$1', label: 'for your introductory chat' },
  { icon: ShieldCheck, value: 'Private', label: 'respectful and confidential' },
]

const listeners = [
  { name: 'Alex Morgan', initials: 'AM', focus: 'Study pressure and stress', description: 'A calm listener for busy weeks, burnout and moments when everything feels like too much.' },
  { name: 'Jamie Lee', initials: 'JL', focus: 'Relationships and connection', description: 'A supportive space to talk through communication, boundaries and feeling disconnected.' },
  { name: 'Sam Taylor', initials: 'ST', focus: 'Confidence and routines', description: 'Gentle, practical conversations about motivation, change and finding your next small step.' },
  { name: 'Casey Nguyen', initials: 'CN', focus: 'Feeling overwhelmed', description: 'Patient support centred on feeling safe, heard and able to talk at your own pace.' },
]

function LandingSections() {
  const [start, setStart] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const remainingTime = useRef(4000)
  const paused = hovered || focused

  useEffect(() => {
    if (paused || slideDirection) return

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let timer: ReturnType<typeof setTimeout> | undefined
    let startedAt = 0

    const stopTimer = () => {
      if (timer === undefined) return
      clearTimeout(timer)
      remainingTime.current = Math.max(0, remainingTime.current - (performance.now() - startedAt))
      timer = undefined
    }
    const startTimer = () => {
      stopTimer()
      if (motionPreference.matches || document.hidden) return
      startedAt = performance.now()
      timer = setTimeout(() => {
        timer = undefined
        remainingTime.current = 4000
        setSlideDirection('left')
      }, remainingTime.current)
    }

    startTimer()
    motionPreference.addEventListener('change', startTimer)
    document.addEventListener('visibilitychange', startTimer)
    return () => {
      stopTimer()
      motionPreference.removeEventListener('change', startTimer)
      document.removeEventListener('visibilitychange', startTimer)
    }
  }, [paused, slideDirection])
  const trackStart = slideDirection === 'right'
    ? (start - 1 + listeners.length) % listeners.length
    : start
  const trackListeners = [0, 1, 2, 3].map((offset) => {
    const index = (trackStart + offset) % listeners.length
    return { ...listeners[index], index }
  })

  const showPreviousListeners = () => {
    if (!slideDirection) setSlideDirection('left')
  }

  const showNextListeners = () => {
    if (!slideDirection) setSlideDirection('right')
  }

  const finishSlide = () => {
    if (slideDirection === 'left') {
      setStart((current) => (current + 1) % listeners.length)
    } else if (slideDirection === 'right') {
      setStart((current) => (current - 1 + listeners.length) % listeners.length)
    }
    setSlideDirection(null)
  }

  return (
    <>
      <section className="trust-band" aria-labelledby="trust-heading">
        <div className="trust-band-inner">
          <h2 id="trust-heading">Support designed around student life.</h2>
          <div className="trust-highlights">
            {highlights.map((item) => {
              const Icon = item.icon
              return <article key={item.value}><Icon size={34} aria-hidden="true" /><strong>{item.value}</strong><p>{item.label}</p></article>
            })}
          </div>
          <a href="/get-matched">Find your listener</a>
        </div>
      </section>

      <section className="listener-showcase" aria-labelledby="listener-heading">
        <div className="listener-showcase-heading">
          <div><span>Meet the people who listen</span><h2 id="listener-heading">Find a listener who feels right for you.</h2></div>
        </div>
        <div
          className="listener-carousel"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
          }}
        >
          <button className="listener-arrow" type="button" aria-label="Slide listeners left" disabled={slideDirection !== null} onClick={showPreviousListeners}><ChevronLeft aria-hidden="true" /></button>
          <div className="listener-track" aria-live={paused ? 'polite' : 'off'}>
            <div
              className={`listener-slider-track${slideDirection ? ` slide-${slideDirection}` : ''}`}
              onAnimationEnd={finishSlide}
            >
              {trackListeners.map((listener) => (
                <article className={`listener-preview-card listener-color-${(listener.index % 3) + 1}`} key={listener.name}>
                  <div className="listener-preview-photo" aria-hidden="true">{listener.initials}</div>
                  <h3>{listener.name}</h3>
                  <p className="listener-preview-focus">{listener.focus}</p>
                  <p>{listener.description}</p>
                  <a href="/get-matched">Find a match <span aria-hidden="true">→</span></a>
                </article>
              ))}
            </div>
          </div>
          <button className="listener-arrow" type="button" aria-label="Slide listeners right" disabled={slideDirection !== null} onClick={showNextListeners}><ChevronRight aria-hidden="true" /></button>
        </div>
        <a className="all-listeners-link" href="/our-therapist">View all our listeners</a>
      </section>
    </>
  )
}

export default LandingSections
