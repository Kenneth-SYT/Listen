import { useEffect, useState } from 'react'
import { errorMessage, getSupabase, type Appointment } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import '../AccountPage/AccountPage.css'

type Profile = { id: string; preferred_name: string; first_name: string }
type Intake = { user_id: string; selected_slot_id: string; topics: string[]; k6_answers: number[]; k6_score: number; listener_note: string; listener_gender_preference: string }

function ListenerPage() {
  const { session, loading } = useSession()
  const [bookings, setBookings] = useState<Appointment[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [message, setMessage] = useState('Loading your upcoming sessions…')
  useEffect(() => {
    if (!session?.user.id) return
    let active = true
    const load = async () => {
      const client = getSupabase()
      const account = await client.from('listener_accounts').select('listener_id').eq('user_id', session.user.id).maybeSingle()
      if (account.error) throw account.error
      if (!account.data) { setMessage('Your account has not been linked to a listener profile. Ask an administrator to link it.'); return }
      const result = await Promise.all([
        client.from('appointments').select('*').eq('listener_id', account.data.listener_id).eq('status', 'confirmed').gte('starts_at', new Date().toISOString()).order('starts_at').limit(100),
        client.from('profiles').select('id,preferred_name,first_name'),
        client.from('intake_responses').select('user_id,selected_slot_id,topics,k6_answers,k6_score,listener_note,listener_gender_preference'),
      ])
      for (const item of result) if (item.error) throw item.error
      if (!active) return
      setBookings(result[0].data as Appointment[]); setProfiles(result[1].data as Profile[]); setIntakes(result[2].data as Intake[]); setMessage('')
    }
    void load().catch(error => { if (active) setMessage(errorMessage(error)) })
    return () => { active = false }
  }, [session?.user.id])
  if (loading) return <p role="status">Checking your account…</p>
  if (!session) return <LoginPage />
  return <section className="account-page"><h1>My listener sessions</h1><p>Upcoming confirmed sessions and information shared by each customer. K6 is a distress screen, not a diagnosis or a crisis assessment.</p>
    {message && <p role="status">{message}</p>}
    {!message && bookings.length === 0 && <p>You have no upcoming confirmed sessions.</p>}
    <div className="account-list">{bookings.map(booking => {
      const profile = profiles.find(item => item.id === booking.user_id)
      const intake = intakes.find(item => item.user_id === booking.user_id && item.selected_slot_id === booking.slot_id)
      return <article className="account-card" key={booking.id}><h2>{profile?.preferred_name || profile?.first_name || 'Your customer'}</h2><p>{new Date(booking.starts_at).toLocaleString('en-AU')}</p>
        {intake && <><p><strong>K6 distress score: {intake.k6_score}/24</strong></p><p>Topics: {intake.topics.join(', ')}</p><p>Listener preference: {intake.listener_gender_preference}</p>{intake.listener_note && <p>Note: {intake.listener_note}</p>}</>}
      </article>
    })}</div>
  </section>
}
export default ListenerPage
