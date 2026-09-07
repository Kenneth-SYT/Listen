import { BadgeDollarSign, CalendarDays, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
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
  const visible = [0, 1, 2].map((offset) => listeners[(start + offset) % listeners.length])

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
          <div className="listener-controls" aria-label="Browse listeners">
            <button type="button" aria-label="Previous listeners" onClick={() => setStart((current) => (current - 1 + listeners.length) % listeners.length)}><ChevronLeft aria-hidden="true" /></button>
            <button type="button" aria-label="Next listeners" onClick={() => setStart((current) => (current + 1) % listeners.length)}><ChevronRight aria-hidden="true" /></button>
          </div>
        </div>
        <div className="listener-preview-grid" aria-live="polite">
          {visible.map((listener) => (
            <article className="listener-preview-card" key={`${start}-${listener.name}`}>
              <div className="listener-preview-photo" aria-hidden="true">{listener.initials}</div>
              <h3>{listener.name}</h3>
              <p className="listener-preview-focus">{listener.focus}</p>
              <p>{listener.description}</p>
              <a href="/get-matched">Find a match <span aria-hidden="true">→</span></a>
            </article>
          ))}
        </div>
        <a className="all-listeners-link" href="/our-therapist">View all our listeners</a>
      </section>
    </>
  )
}

export default LandingSections
