import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage, getSupabase, type Appointment, type Listener } from '../../lib/supabase'
import { supportTopics } from '../../lib/intake'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import '../AccountPage/AccountPage.css'
import './ListenerPage.css'

type Profile = { id: string; preferred_name: string; first_name: string }
type Intake = { user_id: string; selected_slot_id: string; topics: string[]; listener_note: string; listener_gender_preference: string; questionnaire_type: 'short' | 'long'; k6_score: number | null; k10_score: number | null }
type Availability = { id: string; listener_id: string; starts_at: string; ends_at: string; enabled: boolean }
type View = 'sessions' | 'profile' | 'availability'

function ListenerPage() {
  const { session, loading } = useSession()
  const [view, setView] = useState<View>('sessions')
  const [listener, setListener] = useState<Listener | null>(null)
  const [bookings, setBookings] = useState<Appointment[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [slots, setSlots] = useState<Availability[]>([])
  const [message, setMessage] = useState('Loading your listener dashboard…')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    if (!session?.user.id) return
    let active = true
    const load = async () => {
      const client = getSupabase()
      const account = await client.from('listener_accounts').select('listener_id').eq('user_id', session.user.id).maybeSingle()
      if (account.error) throw account.error
      if (!account.data) { setMessage('Your account has not been linked to a listener profile. Ask an administrator to link it.'); return }
      const result = await Promise.all([
        client.from('listeners').select('*').eq('id', account.data.listener_id).single(),
        client.from('appointments').select('*').eq('listener_id', account.data.listener_id).eq('status', 'confirmed').gte('starts_at', new Date().toISOString()).order('starts_at').limit(100),
        client.from('profiles').select('id,preferred_name,first_name'),
        client.from('intake_responses').select('user_id,selected_slot_id,topics,k6_score,k10_score,questionnaire_type,listener_note,listener_gender_preference'),
        client.from('availability').select('*').eq('listener_id', account.data.listener_id).gte('ends_at', new Date().toISOString()).order('starts_at').limit(200),
      ])
      for (const item of result) if (item.error) throw item.error
      if (!active) return
      setListener(result[0].data as Listener); setBookings(result[1].data as Appointment[]); setProfiles(result[2].data as Profile[]); setIntakes(result[3].data as Intake[]); setSlots(result[4].data as Availability[]); setMessage('')
    }
    void load().catch(error => { if (active) setMessage(errorMessage(error)) })
    return () => { active = false }
  }, [session?.user.id, refresh])
  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setMessage('')
    try {
      const languages = String(data.get('languages')).split(',').map(value => value.trim()).filter(Boolean)
      const matches = data.getAll('matches').map(String)
      const { error } = await getSupabase().rpc('update_listener_profile', { p_focus: String(data.get('focus')), p_bio: String(data.get('bio')), p_gender: String(data.get('gender')), p_pronouns: String(data.get('pronouns')), p_languages: languages, p_matches: matches, p_profile_image_url: String(data.get('image')) })
      if (error) throw error
      setMessage('Profile submitted for administrator approval.'); setRefresh(value => value + 1)
    } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) }
  }
  const addAvailability = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const starts = new Date(String(data.get('starts'))); const ends = new Date(String(data.get('ends'))); setBusy(true); setMessage('')
    try { const { error } = await getSupabase().rpc('listener_create_availability', { p_starts: starts.toISOString(), p_ends: ends.toISOString() }); if (error) throw error; form.reset(); setMessage('Availability added.'); setRefresh(value => value + 1) }
    catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) }
  }
  const toggleSlot = async (slot: Availability) => { setBusy(true); setMessage(''); try { const { error } = await getSupabase().rpc('listener_set_availability', { p_slot: slot.id, p_enabled: !slot.enabled }); if (error) throw error; setRefresh(value => value + 1) } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) } }
  if (loading) return <p role="status">Checking your account…</p>
  if (!session) return <LoginPage />
  return <section className="account-page listener-dashboard"><header><div><span className="listener-kicker">Listener workspace</span><h1>{listener?.name || 'My listener dashboard'}</h1><p>Manage your public profile, availability and confirmed sessions.</p></div><a href="/account">My account</a></header>
    <nav className="listener-tabs" aria-label="Listener dashboard sections">{(['sessions', 'profile', 'availability'] as View[]).map(item => <button type="button" className={view === item ? 'active' : ''} onClick={() => { setView(item); setMessage('') }} key={item}>{item === 'sessions' ? 'Upcoming sessions' : item === 'profile' ? 'Public profile' : 'Availability'}</button>)}</nav>
    {message && <p className="listener-notice" role="status">{message}</p>}
    {listener && view === 'sessions' && <div className="account-list">{bookings.map(booking => { const profile = profiles.find(item => item.id === booking.user_id); const intake = intakes.find(item => item.user_id === booking.user_id && item.selected_slot_id === booking.slot_id); return <article className="account-card" key={booking.id}><h2>{profile?.preferred_name || profile?.first_name || 'Your customer'}</h2><p>{new Date(booking.starts_at).toLocaleString('en-AU')}</p>{intake && <><p><strong>{intake.questionnaire_type === 'long' ? `K10 wellbeing score: ${intake.k10_score}/50` : `K6 distress score: ${intake.k6_score}/24`}</strong></p><p><strong>Topics:</strong> {intake.topics.join(', ')}</p><p><strong>Listener preference:</strong> {intake.listener_gender_preference}</p>{intake.listener_note && <p><strong>Note:</strong> {intake.listener_note}</p>}</>}</article> })}{bookings.length === 0 && <p>You have no upcoming confirmed sessions.</p>}</div>}
    {listener && view === 'profile' && <form className="listener-form" onSubmit={submitProfile}><div className="listener-form-heading"><div><h2>Public listener profile</h2><p>Changes stay private until an administrator approves them.</p></div><span className={`profile-state ${listener.profile_status}`}>{listener.profile_status}</span></div><label>Role or focus<input name="focus" defaultValue={listener.focus} maxLength={200} required /></label><label>About you<textarea name="bio" defaultValue={listener.bio} maxLength={2000} rows={5} required /></label><div className="listener-form-row"><label>Gender<select name="gender" defaultValue={listener.gender}><option value="">Prefer not to say</option><option>Woman</option><option>Man</option><option>Non-binary or another gender</option></select></label><label>Pronouns<input name="pronouns" defaultValue={listener.pronouns} placeholder="e.g. he/him" /></label></div><label>Languages, separated by commas<input name="languages" defaultValue={listener.languages?.join(', ')} required /></label><label>Profile image URL<input name="image" type="url" defaultValue={listener.profile_image_url || ''} placeholder="https://…" /></label><fieldset><legend>Topics you support</legend><div className="listener-topic-grid">{supportTopics.filter(value => value !== 'I’m not sure yet').map(value => <label key={value}><input type="checkbox" name="matches" value={value} defaultChecked={listener.matches.includes(value)} />{value}</label>)}</div></fieldset><button disabled={busy}>Submit profile for approval</button></form>}
    {listener && view === 'availability' && <><form className="listener-form compact" onSubmit={addAvailability}><h2>Add available time</h2><div className="listener-form-row"><label>Start<input name="starts" type="datetime-local" required /></label><label>End<input name="ends" type="datetime-local" required /></label></div><button disabled={busy}>Add availability</button></form><div className="listener-slot-list"><h2>Upcoming availability</h2>{slots.map(slot => <article key={slot.id}><div><strong>{new Date(slot.starts_at).toLocaleString('en-AU')}</strong><span> until {new Date(slot.ends_at).toLocaleTimeString('en-AU')}</span></div><button disabled={busy} onClick={() => void toggleSlot(slot)}>{slot.enabled ? 'Disable' : 'Enable'}</button></article>)}{!slots.length && <p>No upcoming availability has been added.</p>}</div></>}
  </section>
}
export default ListenerPage
