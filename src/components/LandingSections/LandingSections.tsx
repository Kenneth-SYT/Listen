import { BadgeDollarSign, CalendarDays, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { type AnimationEvent, useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage, getSupabase, money, type Listener, type Quote } from '../../lib/supabase'
import './LandingSections.css'

function LandingSections() {
  const [listeners, setListeners] = useState<Listener[]>([])
  const [listenerMessage, setListenerMessage] = useState('Loading our listeners…')
  const [introPrice, setIntroPrice] = useState('…')
  const [start, setStart] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)
  const [visibleListenerIndex, setVisibleListenerIndex] = useState(0)
  const [staticListenerScrolling, setStaticListenerScrolling] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const remainingTime = useRef(4000)
  const touchStartX = useRef<number | null>(null)
  const listenerTrackRef = useRef<HTMLDivElement | null>(null)
  const listenerScrollAnimation = useRef<number | null>(null)
  const staticAutoplayDirection = useRef<1 | -1>(1)
  const paused = hovered || focused
  const canAnimate = listeners.length >= 3
  const canNavigate = listeners.length > 1
  const highlights = [
    { icon: CalendarDays, value: '7 days', label: 'support available each week' },
    { icon: BadgeDollarSign, value: introPrice, label: 'for your introductory chat' },
    { icon: ShieldCheck, value: 'Private', label: 'respectful and confidential' },
  ]

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

  useEffect(() => () => {
    if (listenerScrollAnimation.current !== null) cancelAnimationFrame(listenerScrollAnimation.current)
  }, [])

  useEffect(() => {
    let active = true
    const loadIntroPrice = async () => {
      try {
        const { data, error } = await getSupabase().rpc('public_session_rates')
        if (!active) return
        if (error) { setIntroPrice('—'); return }
        const introductoryRate = (data as Quote[] | null)?.find(rate => rate.rate_code === 'intro')
        setIntroPrice(introductoryRate ? money(introductoryRate.amount_cents) : '—')
      } catch { if (active) setIntroPrice('—') }
    }
    void loadIntroPrice()
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
  const trackListeners = (canAnimate ? [0, 1, 2, 3] : listeners.map((_, index) => index)).map((offset, slot) => {
    const index = (trackStart + offset) % listeners.length
    return { ...listeners[index], index, slot }
  })

  const showPreviousListeners = () => {
    if (canAnimate && !slideDirection) setSlideDirection('right')
  }

  const showNextListeners = () => {
    if (canAnimate && !slideDirection) setSlideDirection('left')
  }

  const stopStaticListenerAnimation = useCallback(() => {
    const track = listenerTrackRef.current
    if (listenerScrollAnimation.current !== null) cancelAnimationFrame(listenerScrollAnimation.current)
    listenerScrollAnimation.current = null
    track?.classList.remove('is-animating')
    setStaticListenerScrolling(false)
  }, [])

  const scrollStaticListenerTo = useCallback((nextIndex: number, duration = 900) => {
    const track = listenerTrackRef.current
    if (!track || canAnimate) return
    const cards = Array.from(track.querySelectorAll<HTMLElement>('.listener-preview-card'))
    const safeIndex = Math.max(0, Math.min(cards.length - 1, nextIndex))
    const targetCard = cards[safeIndex]
    const centredLeft = targetCard
      ? targetCard.offsetLeft - ((track.clientWidth - targetCard.offsetWidth) / 2)
      : 0
    const targetLeft = Math.max(0, Math.min(track.scrollWidth - track.clientWidth, centredLeft))
    stopStaticListenerAnimation()
    track.classList.add('is-animating')
    setStaticListenerScrolling(true)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      track.scrollLeft = targetLeft
      setVisibleListenerIndex(safeIndex)
      setStaticListenerScrolling(false)
      return
    }

    const startLeft = track.scrollLeft
    const distance = targetLeft - startLeft
    const startedAt = performance.now()
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const easedProgress = 0.5 - Math.cos(Math.PI * progress) / 2
      track.scrollLeft = startLeft + distance * easedProgress
      if (progress < 1) listenerScrollAnimation.current = requestAnimationFrame(animate)
      else {
        listenerScrollAnimation.current = null
        track.scrollLeft = targetLeft
        setVisibleListenerIndex(safeIndex)
        setStaticListenerScrolling(false)
      }
    }
    listenerScrollAnimation.current = requestAnimationFrame(animate)
  }, [canAnimate, stopStaticListenerAnimation])

  const scrollStaticListeners = (direction: -1 | 1) => {
    scrollStaticListenerTo(visibleListenerIndex + direction)
  }

  const updateStaticListenerIndex = () => {
    const track = listenerTrackRef.current
    if (!track || canAnimate || staticListenerScrolling) return
    const cards = Array.from(track.querySelectorAll<HTMLElement>('.listener-preview-card'))
    const closestIndex = cards.reduce((closest, card, index) => (
      Math.abs(card.offsetLeft - track.scrollLeft) < Math.abs((cards[closest]?.offsetLeft ?? 0) - track.scrollLeft) ? index : closest
    ), 0)
    setVisibleListenerIndex(closestIndex)
  }

  useEffect(() => {
    if (!canNavigate || canAnimate || paused || staticListenerScrolling) return
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let timer: ReturnType<typeof setTimeout> | undefined
    const scheduleNextListener = () => {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      if (motionPreference.matches || document.hidden) return
      timer = setTimeout(() => {
        timer = undefined
        if (visibleListenerIndex >= listeners.length - 1) staticAutoplayDirection.current = -1
        else if (visibleListenerIndex <= 0) staticAutoplayDirection.current = 1
        scrollStaticListenerTo(visibleListenerIndex + staticAutoplayDirection.current, 1400)
      }, 4200)
    }
    scheduleNextListener()
    motionPreference.addEventListener('change', scheduleNextListener)
    document.addEventListener('visibilitychange', scheduleNextListener)
    return () => {
      if (timer !== undefined) clearTimeout(timer)
      motionPreference.removeEventListener('change', scheduleNextListener)
      document.removeEventListener('visibilitychange', scheduleNextListener)
    }
  }, [canAnimate, canNavigate, listeners.length, paused, scrollStaticListenerTo, staticListenerScrolling, visibleListenerIndex])

  const finishSlide = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !event.animationName.startsWith('listener-track-')) return
    if (slideDirection === 'left') {
      setStart((current) => (current + 1) % listeners.length)
    } else if (slideDirection === 'right') {
      setStart((current) => (current - 1 + listeners.length) % listeners.length)
    }
    setSlideDirection(null)
  }

  const displayedListenerIndex = canAnimate
    ? slideDirection === 'left'
      ? (start + 1) % listeners.length
      : slideDirection === 'right'
        ? (start - 1 + listeners.length) % listeners.length
        : start
    : visibleListenerIndex

  return (
    <>
      <section className="trust-band" aria-labelledby="trust-heading">
        <div className="trust-band-inner" data-home-reveal="scale">
          <h2 id="trust-heading">Support designed around student life.</h2>
          <div className="trust-highlights">
            {highlights.map((item) => {
              const Icon = item.icon
              return <article key={item.label}><Icon size={34} aria-hidden="true" /><strong>{item.value}</strong><p>{item.label}</p></article>
            })}
          </div>
          <a href="/get-matched">Find your listener</a>
        </div>
      </section>

      <section className="listener-showcase" aria-labelledby="listener-heading">
        <div className="listener-showcase-heading" data-home-reveal>
          <div><span>Meet the people who listen</span><h2 id="listener-heading">Find a listener who feels right for you.</h2></div>
        </div>
        {listenerMessage ? <p className="listener-showcase-status" role="status" data-home-reveal>{listenerMessage}</p> : listeners.length ? <div
          className={`listener-carousel${canAnimate ? '' : ' static-listeners'}`}
          data-home-reveal="scale"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
          }}
        >
          {canNavigate && <button className="listener-arrow" type="button" aria-label="Show previous listener" disabled={canAnimate ? slideDirection !== null : visibleListenerIndex === 0} onClick={() => { if (canAnimate) showPreviousListeners(); else scrollStaticListeners(-1) }}><ChevronLeft aria-hidden="true" /></button>}
          <div
            ref={listenerTrackRef}
            className={`listener-track${canAnimate ? '' : ' few-listeners'}`}
            aria-live={paused ? 'polite' : 'off'}
            onScroll={updateStaticListenerIndex}
            onPointerDown={stopStaticListenerAnimation}
            onWheel={stopStaticListenerAnimation}
            onTouchStart={(event) => { stopStaticListenerAnimation(); touchStartX.current = event.touches[0]?.clientX ?? null }}
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
                <article className={`listener-preview-card listener-color-${(listener.index % 3) + 1}`} key={`listener-slot-${listener.slot}`}>
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
          {canNavigate && <div className="listener-pagination" aria-label={`Listener ${displayedListenerIndex + 1} of ${listeners.length}`}>
            <div className="listener-pagination-dots" aria-hidden="true">
              {listeners.map((listener, index) => <span className={index === displayedListenerIndex ? 'active' : ''} key={listener.name} />)}
            </div>
            <strong>{displayedListenerIndex + 1} of {listeners.length}</strong>
          </div>}
          {canNavigate && <button className="listener-arrow" type="button" aria-label="Show next listener" disabled={canAnimate ? slideDirection !== null : visibleListenerIndex === listeners.length - 1} onClick={() => { if (canAnimate) showNextListeners(); else scrollStaticListeners(1) }}><ChevronRight aria-hidden="true" /></button>}
        </div> : <p className="listener-showcase-status">Our listener profiles will appear here once they are available.</p>}
        <a className="all-listeners-link" href="/our-listeners" data-home-reveal>View all our listeners</a>
      </section>
    </>
  )
}

export default LandingSections
