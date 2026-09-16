import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage, getSupabase, money, type Appointment, type Listener, type Slot } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import '../AccountPage/AccountPage.css'

type AdminSlot = Slot & { enabled: boolean }
type Profile = { id: string; first_name: string; last_name: string; mobile: string }
function AdminPage() {
  const { session, loading } = useSession()
  const [allowed, setAllowed] = useState('')
  const [message, setMessage] = useState('Checking administrator access…')
  const [listeners, setListeners] = useState<Listener[]>([])
  const [slots, setSlots] = useState<AdminSlot[]>([])
  const [bookings, setBookings] = useState<Appointment[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let active = true
    const load = async () => {
      const client = getSupabase()
      const role = await client.rpc('is_admin')
      if (role.error) throw role.error
      if (!role.data) throw new Error('This account does not have administrator access.')
      const results = await Promise.all([client.from('listeners').select('*').order('name'), client.from('availability').select('*').gte('ends_at', new Date().toISOString()).order('starts_at').limit(500), client.from('appointments').select('*').order('created_at', { ascending: false }).limit(100), client.from('profiles').select('id,first_name,last_name,mobile').order('first_name')])
      for (const result of results) if (result.error) throw result.error
      if (!active) return
      setAllowed(userId); setListeners(results[0].data as Listener[]); setSlots(results[1].data as AdminSlot[]); setBookings(results[2].data as Appointment[]); setProfiles(results[3].data as Profile[]); setMessage('')
    }
    void load().catch(error => { if (active) setMessage(errorMessage(error)) })
    return () => { active = false }
  }, [userId, refresh])
  const save = async (event: FormEvent<HTMLFormElement>, kind: 'listener' | 'slot' | 'rate' | 'default') => {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form)
    setBusy(true); setMessage('')
    try {
      const client = getSupabase()
      let result
      if (kind === 'listener') result = await client.from('listeners').insert({ name: String(values.get('name')).trim(), focus: String(values.get('focus')).trim(), matches: [String(values.get('match'))] })
      else if (kind === 'slot') {
        const starts = new Date(String(values.get('starts'))); const ends = new Date(String(values.get('ends')))
        if (starts <= new Date() || ends <= starts) throw new Error('Choose a future start and a later end time.')
        result = await client.from('availability').insert({ listener_id: values.get('listener'), starts_at: starts.toISOString(), ends_at: ends.toISOString() })
      } else {
        const amount = Math.round(Number(values.get('amount')) * 100)
        if (!Number.isSafeInteger(amount) || amount < 100) throw new Error('Enter an amount of at least $1.')
        result = kind === 'rate' ? await client.from('customer_rates').upsert({ user_id: values.get('customer'), amount_cents: amount })
          : await client.from('rates').update({ amount_cents: amount }).eq('code', String(values.get('code')))
      }
      if (result.error) throw result.error
      form.reset(); setRefresh(value => value + 1)
    } catch (error) { setMessage(errorMessage(error)) }
    finally { setBusy(false) }
  }
  if (loading) return <p role="status">Checking your account…</p>
  if (!session) return <LoginPage />
  return <section className="account-page"><h1>Booking administration</h1><p><a href="/account">My account</a></p>{message && <p role="status">{message}</p>}
    {allowed === userId && <><p>Dates use your local timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Publish individual appointment slots; a 60-minute slot supports either session length.</p><div className="admin-grid">
      <form className="account-card" onSubmit={e => save(e, 'listener')}><h2>Add listener</h2><label>Name<input name="name" required maxLength={100} /></label><label>Focus<input name="focus" required maxLength={200} /></label><label>Suggested for<select name="match">{['Study pressure', 'Feeling overwhelmed', 'Relationships', 'Something else'].map(value => <option key={value}>{value}</option>)}</select></label><button disabled={busy}>Add listener</button></form>
      <form className="account-card" onSubmit={e => save(e, 'slot')}><h2>Publish appointment time</h2><label>Listener<select name="listener" required><option value="">Select listener</option>{listeners.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label><label>Start<input name="starts" type="datetime-local" required /></label><label>End<input name="ends" type="datetime-local" required /></label><button disabled={busy}>Publish slot</button></form>
      <form className="account-card" onSubmit={e => save(e, 'rate')}><h2>Customer rate</h2><label>Customer<select name="customer" required><option value="">Select customer</option>{profiles.map(person => <option key={person.id} value={person.id}>{person.first_name} {person.last_name} ({person.id.slice(0, 8)})</option>)}</select></label><label>Price per appointment (AUD)<input name="amount" type="number" min="1" step="0.01" required /></label><p>Overrides introductory and standard prices for future checkouts. Existing bookings keep their agreed price.</p><button disabled={busy}>Save customer rate</button><button type="button" disabled={busy} onClick={async e => { const id = new FormData(e.currentTarget.form!).get('customer'); if (!id) { setMessage('Select a customer first.'); return } setBusy(true); try { const { error } = await getSupabase().from('customer_rates').delete().eq('user_id', id); if (error) throw error; setMessage('Customer now uses standard pricing rules.') } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) } }}>Remove override</button></form>
      <form className="account-card" onSubmit={e => save(e, 'default')}><h2>Default rates</h2><label>Session<select name="code"><option value="intro">Introductory (30 minutes)</option><option value="standard">Standard (60 minutes)</option></select></label><label>Price (AUD)<input name="amount" type="number" min="1" step="0.01" required /></label><button disabled={busy}>Update rate</button></form>
    </div><h2>Published times</h2><div className="admin-table"><table><thead><tr><th>Listener</th><th>Start</th><th>End</th><th>Availability</th></tr></thead><tbody>{slots.map(slot => <tr key={slot.id}><td>{listeners.find(person => person.id === slot.listener_id)?.name}</td><td>{new Date(slot.starts_at).toLocaleString('en-AU')}</td><td>{new Date(slot.ends_at).toLocaleTimeString('en-AU')}</td><td><button disabled={busy} onClick={async () => { setBusy(true); try { const { error } = await getSupabase().from('availability').update({ enabled: !slot.enabled }).eq('id', slot.id); if (error) throw error; setRefresh(value => value + 1) } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) } }}>{slot.enabled ? 'Disable new bookings' : 'Enable new bookings'}</button></td></tr>)}</tbody></table></div>
    <h2>Recent appointments</h2><p>Disabling a time does not cancel an existing booking.</p><div className="admin-table"><table><thead><tr><th>Customer</th><th>Listener</th><th>Time</th><th>Price</th><th>Status</th></tr></thead><tbody>{bookings.map(booking => { const person = profiles.find(profile => profile.id === booking.user_id); return <tr key={booking.id}><td>{person ? person.first_name + ' ' + person.last_name : booking.user_id}<br />{person?.mobile}</td><td>{listeners.find(listener => listener.id === booking.listener_id)?.name}</td><td>{new Date(booking.starts_at).toLocaleString('en-AU')}</td><td>{money(booking.amount_cents)}</td><td>{booking.status}</td></tr> })}</tbody></table></div></>}
  </section>
}
export default AdminPage
