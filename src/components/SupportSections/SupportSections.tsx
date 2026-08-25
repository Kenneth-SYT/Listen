import { useEffect, useRef } from 'react'
import './SupportSections.css'

const howItWorksSteps = [
  {
    label: 'Fill out mental quiz',
    detail: 'Answer a short check-in so we can better understand how you are feeling.',
  },
  {
    label: 'Get matched',
    detail: 'We suggest a supportive listener who fits what you need right now.',
  },
  {
    label: 'Book into session',
    detail: 'Choose a time to talk, get heard, and set gentle goals for the week.',
  },
  {
    label: 'Book follow up',
    detail: 'Keep checking in and work toward your goals one step at a time.',
  },
]

function SupportSections() {
  const sectionRef = useRef<HTMLElement>(null)
  const topPathRef = useRef<SVGPathElement>(null)
  const lowerPathRef = useRef<SVGPathElement>(null)
  const movingDotRef = useRef<SVGCircleElement>(null)
  const trailDotRefs = useRef<Array<SVGCircleElement | null>>([])

  useEffect(() => {
    let animationFrame = 0

    const getPointFromProgress = (
      progress: number,
      topPath: SVGPathElement,
      lowerPath: SVGPathElement,
    ) => {
      const topSegmentEnd = 0.22
      const lowerSegmentStart = 0.34

      if (progress <= topSegmentEnd) {
        const topProgress = progress / topSegmentEnd
        return topPath.getPointAtLength(topPath.getTotalLength() * topProgress)
      }

      if (progress < lowerSegmentStart) {
        return lowerPath.getPointAtLength(0)
      }

      const lowerProgress = (progress - lowerSegmentStart) / (1 - lowerSegmentStart)
      return lowerPath.getPointAtLength(lowerPath.getTotalLength() * lowerProgress)
    }

    const getTrailPointFromProgress = (
      progress: number,
      trailIndex: number,
      topPath: SVGPathElement,
      lowerPath: SVGPathElement,
    ) => {
      const topSegmentEnd = 0.22
      const lowerSegmentStart = 0.34
      const trailDistance = (trailIndex + 1) * 14

      if (progress <= topSegmentEnd) {
        const topProgress = progress / topSegmentEnd
        const topLength = topPath.getTotalLength()
        const trailLength = Math.max(topLength * topProgress - trailDistance, 0)

        return topPath.getPointAtLength(trailLength)
      }

      if (progress < lowerSegmentStart) {
        return lowerPath.getPointAtLength(0)
      }

      const lowerProgress = (progress - lowerSegmentStart) / (1 - lowerSegmentStart)
      const lowerLength = lowerPath.getTotalLength()
      const trailLength = Math.max(lowerLength * lowerProgress - trailDistance, 0)

      return lowerPath.getPointAtLength(trailLength)
    }

    const updateDotPosition = () => {
      const section = sectionRef.current
      const topPath = topPathRef.current
      const lowerPath = lowerPathRef.current
      const movingDot = movingDotRef.current

      if (!section || !topPath || !lowerPath || !movingDot) {
        return  
      }

      const rect = section.getBoundingClientRect()
      const activeEnd = window.innerHeight * 0.22
      let progress = 0

      if (rect.top <= 0 && rect.bottom >= activeEnd) {
        const activeRange = rect.height - activeEnd
        progress = Math.min(Math.max(-rect.top / activeRange, 0), 1)
      } else if (rect.bottom < activeEnd) {
        progress = 1
      }
      const point = getPointFromProgress(progress, topPath, lowerPath)

      movingDot.setAttribute('cx', `${point.x}`)
      movingDot.setAttribute('cy', `${point.y}`)

      trailDotRefs.current.forEach((trailDot, index) => {
        if (!trailDot) {
          return
        }

        const trailPoint = getTrailPointFromProgress(progress, index, topPath, lowerPath)

        trailDot.setAttribute('cx', `${trailPoint.x}`)
        trailDot.setAttribute('cy', `${trailPoint.y}`)
      })
    }

    const requestDotUpdate = () => {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(updateDotPosition)
    }

    updateDotPosition()
    window.addEventListener('scroll', requestDotUpdate, { passive: true })
    window.addEventListener('resize', requestDotUpdate)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('scroll', requestDotUpdate)
      window.removeEventListener('resize', requestDotUpdate)
    }
  }, [])

  return (
    <section className="how-section" aria-labelledby="how-heading" ref={sectionRef}>
      <div className="how-header">
        <h2 id="how-heading">How it works</h2>
        <p>Start with a quick check-in, then connect with support that feels right for you.</p>
      </div>

      <div className="how-flow">
        <svg className="how-path" viewBox="0 0 1000 760" aria-hidden="true">
          <path
            d="M500 35 V120"
            className="top-path"
            ref={topPathRef}
          />
          <path
            d="M500 331 C500 438 450 520 360 526 H240 C130 526 90 570 138 620 C186 670 304 660 420 660 H604 C730 660 782 690 724 724 C690 744 626 752 548 760"
            ref={lowerPathRef}
          />
          <circle className="start-dot" cx="500" cy="35" r="8" />
          {[0, 1, 2].map((trailDot) => (
            <circle
              className={`trail-dot trail-dot-${trailDot + 1}`}
              cx="500"
              cy="35"
              key={trailDot}
              r="7"
              ref={(element) => {
                trailDotRefs.current[trailDot] = element
              }}
            />
          ))}
          <circle className="moving-dot" cx="500" cy="0" r="8" ref={movingDotRef} />
        </svg>

        <article className="how-card how-card-main">
          <h3>
            How it works for <strong>peer support</strong>.
          </h3>
          <p>Simple steps to help university students check in, get heard, and keep moving forward.</p>
        </article>

        <div className="how-steps">
          {howItWorksSteps.map((step, index) => (
            <article className={`how-step step-${index + 1}`} key={step.label}>
              <span className="step-dot" aria-hidden="true"></span>
              <h3>{step.label}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default SupportSections
