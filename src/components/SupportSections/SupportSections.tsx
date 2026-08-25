import { useEffect, useRef } from 'react'
import surveyImage from '../../assets/images/Customer Survey-cuate (1).svg'
import jobHuntImage from '../../assets/images/Job hunt-pana.svg'
import socialImage from '../../assets/images/Social interaction-pana (1).svg'
import winnersImage from '../../assets/images/Winners (1).gif'
import './SupportSections.css'

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
      const topSegmentEnd = 0.16
      const lowerSegmentStart = 0.22

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
      const topSegmentEnd = 0.16
      const lowerSegmentStart = 0.22
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
      const activeStart = window.innerHeight * 0.50
      const activeEnd = window.innerHeight * 0.18
      let progress = 0

      if (rect.top <= activeStart && rect.bottom >= activeEnd) {
        const activeRange = (rect.height + activeStart - activeEnd) * 0.82
        progress = Math.min(Math.max((activeStart - rect.top) / activeRange, 0), 1)
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
        <svg className="how-path" viewBox="0 0 1265 2648" aria-hidden="true">
          <path
            d="M633 30 V150"
            className="top-path"
            ref={topPathRef}
          />
          <path
            d="M633 310 V368 C633 440 574 496 488 496 H368 C262.514 496 177 581.514 177 687 C177 792.486 262.514 878 368 878 H927.5 C1016.14 878 1088 949.858 1088 1038.5 C1088 1127.14 1016.14 1199 927.5 1199 H366.5 C261.842 1199 177 1283.84 177 1388.5 C177 1493.16 261.842 1578 366.5 1578 H878 C993.98 1578 1088 1672.02 1088 1788 C1088 1903.98 993.98 1998 878 1998 H373.5 C264.976 1998 177 2085.98 177 2194.5 C177 2303.02 264.976 2391 373.5 2391 H913 C1009.65 2391 1088 2469.35 1088 2566"
            ref={lowerPathRef}
          />
          <circle className="start-dot" cx="633" cy="30" r="8" />
          {[0, 1, 2].map((trailDot) => (
            <circle
              className={`trail-dot trail-dot-${trailDot + 1}`}
              cx="633"
              cy="30"
              key={trailDot}
              r="7"
              ref={(element) => {
                trailDotRefs.current[trailDot] = element
              }}
            />
          ))}
          <circle className="moving-dot" cx="633" cy="30" r="8" ref={movingDotRef} />
        </svg>

        <article className="how-card how-card-main">
          <h3>
            How it works for <strong>peer support</strong>.
          </h3>
          <p>Simple steps to help university students check in, get heard, and keep moving forward.</p>
        </article>

        <article className="how-feature">
          <img src={surveyImage} alt="" aria-hidden="true" />
          <div className="how-feature-copy">
            <span className="step-dot" aria-hidden="true"></span>
            <h3>Fill out a quiz</h3>
            <p>Answer a short check-in so we can better understand how you are feeling.</p>
          </div>
        </article>

        <article className="how-feature how-feature-right">
          <div className="how-feature-copy">
            <span className="step-dot" aria-hidden="true"></span>
            <h3>Get matched</h3>
            <p>We suggest a supportive listener who fits what you need right now.</p>
          </div>
          <img src={jobHuntImage} alt="" aria-hidden="true" />
        </article>

        <article className="how-feature how-feature-left">
          <img src={socialImage} alt="" aria-hidden="true" />
          <div className="how-feature-copy">
            <span className="step-dot" aria-hidden="true"></span>
            <h3>Book into session</h3>
            <p>Choose a time to talk, get heard, and set gentle goals for the week.</p>
          </div>
        </article>

        <article className="how-feature how-feature-final">
          <div className="how-feature-copy">
            <span className="step-dot" aria-hidden="true"></span>
            <h3>Book follow up</h3>
            <p>Keep checking in and work toward your goals one step at a time.</p>
          </div>
          <img src={winnersImage} alt="" aria-hidden="true" />
        </article>
      </div>
    </section>
  )
}

export default SupportSections
