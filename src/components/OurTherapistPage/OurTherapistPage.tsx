import { Languages, MessageCircleHeart, SlidersHorizontal, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import './OurTherapistPage.css'

const listeners = [
  {
    name: 'Aiden',
    role: 'General peer support',
    details: 'Available to listen and offer peer support around study pressure, feeling overwhelmed, loneliness and relationships.',
    gender: 'Man',
    languages: ['English'],
    topics: ['Study pressure', 'Feeling overwhelmed', 'Loneliness', 'Relationships'],
  },
]

function OurTherapistPage() {
  const [gender, setGender] = useState('')
  const [topic, setTopic] = useState('')
  const [language, setLanguage] = useState('')
  const topics = useMemo(() => [...new Set(listeners.flatMap(listener => listener.topics))].sort(), [])
  const languages = useMemo(() => [...new Set(listeners.flatMap(listener => listener.languages))].sort(), [])
  const filteredListeners = listeners.filter(listener =>
    (!gender || listener.gender === gender) &&
    (!topic || listener.topics.includes(topic)) &&
    (!language || listener.languages.includes(language)))
  const filtersActive = !!gender || !!topic || !!language

  return (
    <section className="therapist-page" aria-labelledby="therapist-heading">
      <div className="therapist-container">
        <div className="therapist-heading">
          <h1 id="therapist-heading">Our listeners</h1>
          <p>Meet the people available to listen, learn what they support and find someone who feels right for you.</p>
        </div>

        <div className="listener-directory">
          <aside className="listener-filters" aria-labelledby="listener-filter-heading">
            <div className="listener-filter-heading"><SlidersHorizontal size={20} aria-hidden="true" /><h2 id="listener-filter-heading">Filter listeners</h2></div>
            <label><span><UserRound size={18} aria-hidden="true" />Gender preference</span><select value={gender} onChange={event => setGender(event.target.value)}><option value="">No preference</option><option>Woman</option><option>Man</option><option>Non-binary or another gender</option></select></label>
            <label><span><MessageCircleHeart size={18} aria-hidden="true" />Topic of interest</span><select value={topic} onChange={event => setTopic(event.target.value)}><option value="">All topics</option>{topics.map(value => <option key={value}>{value}</option>)}</select></label>
            <label><span><Languages size={18} aria-hidden="true" />Language spoken</span><select value={language} onChange={event => setLanguage(event.target.value)}><option value="">All languages</option>{languages.map(value => <option key={value}>{value}</option>)}</select></label>
            {filtersActive && <button type="button" onClick={() => { setGender(''); setTopic(''); setLanguage('') }}>Clear filters</button>}
          </aside>

          <div className="listener-results">
            <p className="listener-result-count" aria-live="polite">{filteredListeners.length} {filteredListeners.length === 1 ? 'listener' : 'listeners'} available</p>
            <div className="therapist-grid">
              {filteredListeners.map((listener) => (
                <article className="therapist-card" key={listener.name}>
                  <div className="therapist-photo" aria-hidden="true">{listener.name.split(' ').map((part) => part[0]).join('')}</div>
                  <div><h2>{listener.name}</h2><p className="therapist-role">{listener.role}</p><p>{listener.details}</p></div>
                  <div className="listener-tags">{listener.languages.map(value => <span key={value}>{value}</span>)}<span>{listener.gender}</span></div>
                  <a href="/get-matched">View profile</a>
                </article>
              ))}
              {!filteredListeners.length && <div className="listener-empty"><h2>No listeners match those filters yet.</h2><p>Try changing a preference or clearing the filters.</p><button type="button" onClick={() => { setGender(''); setTopic(''); setLanguage('') }}>Clear filters</button></div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OurTherapistPage
