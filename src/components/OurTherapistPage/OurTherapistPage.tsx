import { Languages, MessageCircleHeart, SlidersHorizontal, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { errorMessage, getSupabase, type Listener } from '../../lib/supabase'
import './OurTherapistPage.css'

function OurTherapistPage() {
  const [listeners, setListeners] = useState<Listener[]>([])
  const [gender, setGender] = useState('')
  const [topic, setTopic] = useState('')
  const [language, setLanguage] = useState('')
  const [message, setMessage] = useState('Loading our listeners…')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const filterCloseRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    let active = true
    void getSupabase().from('listeners').select('id,name,focus,matches,bio,gender,pronouns,languages,profile_image_url,profile_status').eq('active', true).eq('profile_status', 'published').order('name').then(({ data, error }) => {
      if (!active) return
      if (error) setMessage(errorMessage(error))
      else { setListeners((data || []) as Listener[]); setMessage('') }
    })
    return () => { active = false }
  }, [])
  const topics = useMemo(() => [...new Set(listeners.flatMap(listener => listener.matches || []))].sort(), [listeners])
  const languages = useMemo(() => [...new Set(listeners.flatMap(listener => listener.languages || []))].sort(), [listeners])
  const filteredListeners = listeners.filter(listener => (!gender || listener.gender === gender) && (!topic || listener.matches.includes(topic)) && (!language || listener.languages?.includes(language)))
  const filtersActive = !!gender || !!topic || !!language
  const activeFilterCount = [gender, topic, language].filter(Boolean).length
  const clear = () => { setGender(''); setTopic(''); setLanguage('') }
  const closeFilters = () => {
    setFiltersOpen(false)
    requestAnimationFrame(() => filterTriggerRef.current?.focus())
  }
  useEffect(() => {
    if (!filtersOpen) return
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFilters()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    requestAnimationFrame(() => filterCloseRef.current?.focus())
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [filtersOpen])
  return <section className="therapist-page" aria-labelledby="therapist-heading"><div className="therapist-container">
    <div className="therapist-heading"><h1 id="therapist-heading">Our listeners</h1><p>Meet the people available to listen, learn what they support and find someone who feels right for you.</p></div>
    <div className="listener-directory">
      <div className={`listener-filter-backdrop${filtersOpen ? ' open' : ''}`} role={filtersOpen ? 'dialog' : undefined} aria-modal={filtersOpen ? 'true' : undefined} aria-labelledby="listener-filter-heading" onMouseDown={event => { if (event.target === event.currentTarget) closeFilters() }}>
      <aside id="listener-filters-panel" className="listener-filters" aria-labelledby="listener-filter-heading">
      <div className="listener-filter-heading"><SlidersHorizontal size={20} aria-hidden="true" /><h2 id="listener-filter-heading">Filter listeners</h2><button ref={filterCloseRef} className="listener-filter-close" type="button" aria-label="Close filters" onClick={closeFilters}><X size={20} aria-hidden="true" /></button></div>
      <label><span><UserRound size={18} aria-hidden="true" />Gender preference</span><select value={gender} onChange={event => setGender(event.target.value)}><option value="">No preference</option><option>Woman</option><option>Man</option><option>Non-binary or another gender</option></select></label>
      <label><span><MessageCircleHeart size={18} aria-hidden="true" />Topic of interest</span><select value={topic} onChange={event => setTopic(event.target.value)}><option value="">All topics</option>{topics.map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span><Languages size={18} aria-hidden="true" />Language spoken</span><select value={language} onChange={event => setLanguage(event.target.value)}><option value="">All languages</option>{languages.map(value => <option key={value}>{value}</option>)}</select></label>
      <div className="listener-filter-actions">
        <button className="listener-clear-filters" type="button" onClick={clear} disabled={!filtersActive}>Clear filters</button>
        <button className="listener-filter-apply" type="button" onClick={closeFilters}>Apply filters</button>
      </div></aside>
      </div>
      <div className="listener-results"><div className="listener-results-toolbar">{message ? <p role="status" className="listener-result-count">{message}</p> : <p className="listener-result-count" aria-live="polite">{filteredListeners.length} {filteredListeners.length === 1 ? 'listener' : 'listeners'} available</p>}
        <button ref={filterTriggerRef} className="listener-filter-trigger" type="button" aria-controls="listener-filters-panel" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={19} aria-hidden="true" />Filters{activeFilterCount > 0 && <span>{activeFilterCount}</span>}</button></div>
        <div className="therapist-grid">{filteredListeners.map(listener => <article className="therapist-card" key={listener.id}>
          {listener.profile_image_url ? <img className="therapist-photo" src={listener.profile_image_url} alt="" /> : <div className="therapist-photo" aria-hidden="true">{listener.name.split(' ').map(part => part[0]).join('')}</div>}
          <div><h2>{listener.name}</h2><p className="therapist-role">{listener.focus}</p><p>{listener.bio}</p></div>
          <div className="listener-tags">{listener.languages?.map(value => <span key={value}>{value}</span>)}{listener.gender && <span>{listener.gender}</span>}</div></article>)}
          {!message && !filteredListeners.length && <div className="listener-empty"><h2>No listeners match those filters yet.</h2><p>Try changing a preference or clearing the filters.</p><button type="button" onClick={clear}>Clear filters</button></div>}
        </div></div>
    </div>
  </div></section>
}
export default OurTherapistPage
