import { BadgeDollarSign, CalendarDays, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { errorMessage, getSupabase, type Listener } from '../../lib/supabase'
import './LandingSections.css'

const highlights = [
  { icon: CalendarDays, value: '7 days', label: 'support available each week' },
  { icon: BadgeDollarSign, value: '$1', label: 'for your introductory chat' },
  { icon: ShieldCheck, value: 'Private', label: 'respectful and confidential' },
]

function LandingSections() {
  const [listeners, setListeners] = useState<Listener[]>([])
  const [listenerMessage, setListenerMessage] = useState('Loading our listeners…')
  const [start, setStart] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const remainingTime = useRef(4000)
  const touchStartX = useRef<number | null>(null)
  const paused = hovered || focused
  const canAnimate = listeners.length >= 4

  useEffect(() => {
    let active = true
    const loadListeners = async () => {
      try {
        const { data, error } = await getSupabase().from('listeners')
        .select('id,name,focus,bio,profile_image_url')
        .eq('active', true)
        .eq('profile_status', 'published')
        .order('name')
        if (!active) return
        if (error) setListenerMessage(errorMessage(error))
        else {
          setListeners((data || []) as Listener[])
          setListenerMessage('')
        }
      } catch (error) {
        if (active) setListenerMessage(errorMessage(error))
      }
    }
    void loadListeners()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!canAnimate || paused || slideDirection) return

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
  }, [canAnimate, paused, slideDirection])
  const trackStart = slideDirection === 'right'
    ? (start - 1 + listeners.length) % listeners.length
    : start
  const trackListeners = (canAnimate ? [0, 1, 2, 3] : listeners.map((_, index) => index)).map((offset) => {
    const index = (trackStart + offset) % listeners.length
    return { ...listeners[index], index }
  })

  const showPreviousListeners = () => {
    if (canAnimate && !slideDirection) setSlideDirection('right')
  }

  const showNextListeners = () => {
    if (canAnimate && !slideDirection) setSlideDirection('left')
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
        {listenerMessage ? <p className="listener-showcase-status" role="status">{listenerMessage}</p> : listeners.length ? <div
          className={`listener-carousel${canAnimate ? '' : ' static-listeners'}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
          }}
        >
          {canAnimate && <button className="listener-arrow" type="button" aria-label="Show previous listeners" disabled={slideDirection !== null} onClick={showPreviousListeners}><ChevronLeft aria-hidden="true" /></button>}
          <div
            className={`listener-track${canAnimate ? '' : ' few-listeners'}`}
            aria-live={paused ? 'polite' : 'off'}
            onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null }}
            onTouchEnd={(event) => {
              if (touchStartX.current === null || slideDirection) return
              const distance = event.changedTouches[0]?.clientX - touchStartX.current
              touchStartX.current = null
              if (Math.abs(distance) < 45) return
              if (distance < 0) showNextListeners()
              else showPreviousListeners()
            }}
          >
            <div
              className={`listener-slider-track${slideDirection ? ` slide-${slideDirection}` : ''}`}
              onAnimationEnd={finishSlide}
            >
              {trackListeners.map((listener) => (
                <article className={`listener-preview-card listener-color-${(listener.index % 3) + 1}`} key={`${listener.id}-${listener.index}`}>
                  {listener.profile_image_url
                    ? <img className="listener-preview-photo" src={listener.profile_image_url} alt="" />
                    : <div className="listener-preview-photo" aria-hidden="true">{listener.name.split(' ').map(part => part[0]).join('')}</div>}
                  <h3>{listener.name}</h3>
                  <p className="listener-preview-focus">{listener.focus}</p>
                  <p>{listener.bio}</p>
                  <a href="/get-matched">Find a match <span aria-hidden="true">→</span></a>
                </article>
              ))}
            </div>
          </div>
          {canAnimate && <div className="listener-pagination" aria-hidden="true">
            {listeners.map((listener, index) => <span className={index === start ? 'active' : ''} key={listener.name} />)}
          </div>}
          {canAnimate && <button className="listener-arrow" type="button" aria-label="Show next listeners" disabled={slideDirection !== null} onClick={showNextListeners}><ChevronRight aria-hidden="true" /></button>}
        </div> : <p className="listener-showcase-status">Our listener profiles will appear here once they are available.</p>}
        <a className="all-listeners-link" href="/our-listeners">View all our listeners</a>
      </section>
    </>
  )
}

export default LandingSections
