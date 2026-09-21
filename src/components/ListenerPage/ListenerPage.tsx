import { useEffect, useState } from 'react'
import { errorMessage, getSupabase, type Appointment } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import '../AccountPage/AccountPage.css'

type Profile = { id: string; preferred_name: string; first_name: string }
type LongAnswers = Record<string, string | string[] | number | null>
type Intake = {
  user_id: string; selected_slot_id: string; topics: string[]; listener_note: string; listener_gender_preference: string
  questionnaire_type: 'short' | 'long'; k6_answers: number[] | null; k6_score: number | null
  k10_answers: number[] | null; k10_score: number | null; impact_score: number | null; long_answers: LongAnswers
}
const longLabels: Record<string, string> = {
  course: 'Course', courseYear: 'Course year', studentType: 'Student type', timeInAustralia: 'Time in Australia',
  languages: 'Languages', preferredLanguage: 'Preferred session language', culturalContext: 'Cultural context',
  preferenceImportance: 'Importance of gender preference', sharedExperiences: 'Helpful shared experiences',
  matchingPriority: 'Matching priority', whatsGoingOn: 'What has been going on', supportStyle: 'What usually helps',
  sessionGoal: 'Session goal', listenerAvoid: 'What the listener should avoid', oneThing: 'One thing to know',
  conversationStart: 'Where to start', anythingElse: 'Anything else',
}
const impactLabels = ['Not at all', 'A little', 'A fair bit', 'A lot', 'A huge amount']

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
        client.from('intake_responses').select('user_id,selected_slot_id,topics,k6_answers,k6_score,k10_answers,k10_score,impact_score,long_answers,questionnaire_type,listener_note,listener_gender_preference'),
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
        {intake && <><p><strong>{intake.questionnaire_type === 'long' ? `K10 wellbeing score: ${intake.k10_score}/50` : `K6 distress score: ${intake.k6_score}/24`}</strong></p>
          <p><small>Higher totals reflect more frequent distress responses. Use this as context for the conversation, not as a diagnosis or crisis assessment.</small></p>
          {intake.questionnaire_type === 'long' && intake.impact_score !== null && <p><strong>Everyday impact:</strong> {impactLabels[intake.impact_score]}</p>}
          <p><strong>Topics:</strong> {intake.topics.join(', ')}</p><p><strong>Listener preference:</strong> {intake.listener_gender_preference}</p>
          {intake.listener_note && <p><strong>Note:</strong> {intake.listener_note}</p>}
          {intake.questionnaire_type === 'long' && <dl>{Object.entries(intake.long_answers || {}).filter(([key, value]) => key !== 'impact' && value !== '' && value !== null && (!Array.isArray(value) || value.length > 0)).map(([key, value]) => <div key={key}><dt>{longLabels[key] || key}</dt><dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}</dl>}
        </>}
      </article>
    })}</div>
  </section>
}
export default ListenerPage
