import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Clock3, Search, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { errorMessage, getSupabase, money, type Appointment, type Listener, type Slot } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import { supportTopics } from '../../lib/intake'
import './AdminPage.css'

type AdminView = 'bookings' | 'users' | 'management' | 'audit'
type AuditEntry = { id: number; actor_user_id: string | null; action: string; target_type: string; target_id: string; details: Record<string, unknown>; created_at: string }
type AdminSlot = Slot & { enabled: boolean }
type AdminUser = {
  user_id: string; email: string; account_created_at: string; email_confirmed_at: string | null; last_sign_in_at: string | null
  first_name: string | null; last_name: string | null; preferred_name: string | null; date_of_birth: string | null
  mobile: string | null; gender: string | null; booking_count: number; confirmed_booking_count: number
  next_booking_at: string | null; listener_name: string | null; administrator: boolean
}
type Intake = {
  user_id: string; selected_slot_id: string; topics: string[]; questionnaire_type: 'short' | 'long'
  k6_score: number | null; k10_score: number | null; listener_note: string
}

const when = (value: string | null) => value ? new Date(value).toLocaleString('en-AU') : '—'
const nameFor = (person?: AdminUser) => person ? [person.first_name, person.last_name].filter(Boolean).join(' ') || person.email : 'Unknown customer'

function AdminPage() {
  const { session, loading } = useSession()
  const [allowed, setAllowed] = useState(false)
  const [view, setView] = useState<AdminView>('bookings')
  const [message, setMessage] = useState('Checking administrator access…')
  const [listeners, setListeners] = useState<Listener[]>([])
  const [slots, setSlots] = useState<AdminSlot[]>([])
  const [bookings, setBookings] = useState<Appointment[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [referenceTime, setReferenceTime] = useState(0)
  const userId = session?.user.id

  useEffect(() => {
    if (!userId) return
    let active = true
    const load = async () => {
      const client = getSupabase()
      const role = await client.rpc('is_admin')
      if (role.error) throw role.error
      if (!role.data) throw new Error('This account does not have administrator access.')
      const results = await Promise.all([
        client.from('listeners').select('*').order('name'),
        client.from('availability').select('*').gte('ends_at', new Date().toISOString()).order('starts_at').limit(500),
        client.from('appointments').select('*').order('created_at', { ascending: false }).limit(500),
        client.rpc('admin_user_directory'),
        client.from('intake_responses').select('user_id,selected_slot_id,topics,questionnaire_type,k6_score,k10_score,listener_note'),
        client.from('role_audit_log').select('*').order('created_at', { ascending: false }).limit(200),
      ])
      for (const result of results) if (result.error) throw result.error
      if (!active) return
      setAllowed(true)
      setListeners(results[0].data as Listener[])
      setSlots(results[1].data as AdminSlot[])
      setBookings(results[2].data as Appointment[])
      setUsers((results[3].data || []) as AdminUser[])
      setIntakes(results[4].data as Intake[])
      setAudit((results[5].data || []) as AuditEntry[])
      setReferenceTime(Date.now())
      setMessage('')
    }
    void load().catch(error => { if (active) { setAllowed(false); setMessage(errorMessage(error)) } })
    return () => { active = false }
  }, [userId, refresh])

  const userById = useMemo(() => new Map(users.map(user => [user.user_id, user])), [users])
  const listenerById = useMemo(() => new Map(listeners.map(listener => [listener.id, listener])), [listeners])
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter(user => [user.email, user.first_name, user.last_name, user.preferred_name, user.mobile, user.listener_name].some(value => value?.toLowerCase().includes(term)))
  }, [search, users])
  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return bookings
    return bookings.filter(booking => {
      const user = userById.get(booking.user_id); const listener = listenerById.get(booking.listener_id)
      return [user?.email, nameFor(user), listener?.name, booking.status].some(value => value?.toLowerCase().includes(term))
    })
  }, [bookings, listenerById, search, userById])
  const confirmed = bookings.filter(booking => booking.status === 'confirmed').length
  const upcoming = bookings.filter(booking => booking.status === 'confirmed' && Date.parse(booking.starts_at) >= referenceTime).length

  const save = async (event: FormEvent<HTMLFormElement>, kind: 'listener' | 'slot' | 'rate' | 'default') => {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form)
    setBusy(true); setMessage('')
    try {
      const client = getSupabase(); let result
      if (kind === 'listener') {
        const matches = values.getAll('matches').map(String)
        if (!matches.length) throw new Error('Choose at least one support topic for this consultant.')
        result = await client.from('listeners').insert({ name: String(values.get('name')).trim(), focus: String(values.get('focus')).trim(), matches })
      } else if (kind === 'slot') {
        const starts = new Date(String(values.get('starts'))); const ends = new Date(String(values.get('ends')))
        if (starts <= new Date() || ends <= starts) throw new Error('Choose a future start and a later end time.')
        result = await client.from('availability').insert({ listener_id: values.get('listener'), starts_at: starts.toISOString(), ends_at: ends.toISOString() })
      } else {
        const amount = Math.round(Number(values.get('amount')) * 100)
        if (!Number.isSafeInteger(amount) || amount < 100) throw new Error('Enter an amount of at least $1.')
        result = kind === 'rate' ? await client.from('customer_rates').upsert({ user_id: values.get('customer'), amount_cents: amount }) : await client.from('rates').update({ amount_cents: amount }).eq('code', String(values.get('code')))
      }
      if (result.error) throw result.error
      form.reset(); setMessage('Saved successfully.'); setRefresh(value => value + 1)
    } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) }
  }

  if (loading) return <p role="status" className="admin-state">Checking your account…</p>
  if (!session) return <LoginPage />
  return <section className="admin-page">
    <header className="admin-hero"><div><span><ShieldCheck size={17} /> Restricted administrator area</span><h1>Admin dashboard</h1><p>Review customers, consultants, bookings and the context shared before each session.</p></div><a href="/account">My account</a></header>
    {message && <p role="status" className={'admin-notice' + (!allowed ? ' admin-error' : '')}>{message}</p>}
    {allowed && <>
      <section className="admin-stats" aria-label="Dashboard summary">
        <article><UsersRound /><div><strong>{users.length}</strong><span>Total accounts</span></div></article>
        <article><CalendarDays /><div><strong>{bookings.length}</strong><span>All bookings</span></div></article>
        <article><ShieldCheck /><div><strong>{confirmed}</strong><span>Confirmed bookings</span></div></article>
        <article><Clock3 /><div><strong>{upcoming}</strong><span>Upcoming sessions</span></div></article>
      </section>
      <div className="admin-toolbar">
        <nav aria-label="Admin sections">{(['bookings', 'users', 'management', 'audit'] as AdminView[]).map(item => <button key={item} type="button" className={view === item ? 'active' : ''} aria-pressed={view === item} onClick={() => { setView(item); setSearch('') }}>{item === 'bookings' ? 'Bookings' : item === 'users' ? 'Users' : item === 'management' ? 'Management' : 'Audit history'}</button>)}</nav>
        {(view === 'bookings' || view === 'users') && <label className="admin-search"><Search size={17} /><span className="sr-only">Search</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder={view === 'users' ? 'Search users' : 'Search bookings'} /></label>}
      </div>

      {view === 'bookings' && <section className="admin-section"><div className="admin-section-heading"><div><h2>Bookings and consultants</h2><p>Every reservation is matched to its customer and assigned consultant.</p></div><span>{filteredBookings.length} shown</span></div>
        <div className="admin-table"><table><thead><tr><th>Customer</th><th>Consultant</th><th>Appointment</th><th>Questionnaire context</th><th>Payment</th><th>Status</th></tr></thead><tbody>{filteredBookings.map(booking => {
          const person = userById.get(booking.user_id); const intake = intakes.find(item => item.user_id === booking.user_id && item.selected_slot_id === booking.slot_id)
          return <tr key={booking.id}><td><strong>{nameFor(person)}</strong><small>{person?.email || booking.user_id}</small><small>{person?.mobile || 'No mobile saved'}</small></td><td><strong>{listenerById.get(booking.listener_id)?.name || 'Unassigned'}</strong></td><td>{new Date(booking.starts_at).toLocaleString('en-AU')}<small>{Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000)} minutes</small></td><td>{intake ? <><strong>{intake.questionnaire_type === 'long' ? `K10 ${intake.k10_score}/50` : `K6 ${intake.k6_score}/24`}</strong><small>{intake.topics.join(', ')}</small>{intake.listener_note && <small>Note: {intake.listener_note}</small>}</> : <small>No intake saved</small>}</td><td>{money(booking.amount_cents)}<small>{booking.rate_code}</small></td><td><span className={'admin-status ' + booking.status}>{booking.status}</span></td></tr>
        })}</tbody></table>{!filteredBookings.length && <p className="admin-empty">No bookings match your search.</p>}</div>
      </section>}

      {view === 'users' && <section className="admin-section"><div className="admin-section-heading"><div><h2>User directory</h2><p>All Supabase Auth accounts, including accounts that have not completed a customer profile.</p></div><span>{filteredUsers.length} shown</span></div>
        <div className="admin-user-grid">{filteredUsers.map(person => <article className="admin-user-card" key={person.user_id}><div className="admin-user-title"><div className="admin-avatar"><UserRound /></div><div><h3>{nameFor(person)}</h3><p>{person.email}</p></div></div><div className="admin-badges">{person.administrator && <span>Admin</span>}{person.listener_name && <span>Consultant: {person.listener_name}</span>}{person.email_confirmed_at && <span>Email confirmed</span>}</div><dl><div><dt>Preferred name</dt><dd>{person.preferred_name || '—'}</dd></div><div><dt>Mobile</dt><dd>{person.mobile || '—'}</dd></div><div><dt>Date of birth</dt><dd>{person.date_of_birth ? new Date(`${person.date_of_birth}T12:00:00`).toLocaleDateString('en-AU') : '—'}</dd></div><div><dt>Gender</dt><dd>{person.gender || '—'}</dd></div><div><dt>Bookings</dt><dd>{person.confirmed_booking_count} confirmed / {person.booking_count} total</dd></div><div><dt>Next session</dt><dd>{when(person.next_booking_at)}</dd></div><div><dt>Account created</dt><dd>{when(person.account_created_at)}</dd></div><div><dt>Last sign-in</dt><dd>{when(person.last_sign_in_at)}</dd></div></dl></article>)}{!filteredUsers.length && <p className="admin-empty">No users match your search.</p>}</div>
      </section>}

      {view === 'management' && <section className="admin-section"><div className="admin-section-heading"><div><h2>Booking management</h2><p>Manage listener access, profile approval, availability and pricing. Dates use {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p></div></div>
      <h3 className="admin-subheading">Listener profile approval</h3><div className="admin-user-grid">{listeners.map(person => <article className="admin-user-card" key={person.id}><div className="admin-user-title"><div className="admin-avatar"><UserRound /></div><div><h3>{person.name}</h3><p>{person.focus}</p></div></div><div className="admin-badges"><span>{person.profile_status || 'draft'}</span>{person.active === false && <span>Inactive</span>}</div><p>{person.bio || 'This listener has not written a public biography yet.'}</p><p><strong>Languages:</strong> {person.languages?.join(', ') || 'Not added'}</p><div className="admin-badges"><button disabled={busy} onClick={async () => { setBusy(true); try { const { error } = await getSupabase().rpc('admin_set_listener_status', { p_listener: person.id, p_status: 'published' }); if (error) throw error; setMessage(`${person.name}'s profile is published.`); setRefresh(value => value + 1) } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) } }}>Approve and publish</button><button disabled={busy} className="admin-secondary" onClick={async () => { setBusy(true); try { const { error } = await getSupabase().rpc('admin_set_listener_status', { p_listener: person.id, p_status: 'suspended' }); if (error) throw error; setMessage(`${person.name}'s profile is suspended.`); setRefresh(value => value + 1) } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) } }}>Suspend</button></div></article>)}</div>
      <div className="admin-management-grid">
        <form className="admin-form-card" onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); setBusy(true); setMessage(''); try { const { error } = await getSupabase().rpc('link_listener_account', { p_listener: String(values.get('listener')), p_email: String(values.get('email')) }); if (error) throw error; setMessage('Consultant account linked successfully.'); form.reset(); setRefresh(value => value + 1) } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) } }}><h3>Consultant access</h3><p>Link a consultant to an existing account for the protected listener page.</p><label>Consultant<select name="listener" required><option value="">Select consultant</option>{listeners.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label>Account email<input name="email" type="email" required /></label><button disabled={busy}>Link account</button></form>
        <form className="admin-form-card" onSubmit={event => save(event, 'listener')}><h3>Add consultant</h3><label>Name<input name="name" required maxLength={100} /></label><label>Focus<input name="focus" required maxLength={200} /></label><fieldset className="admin-topic-fieldset"><legend>Supported topics</legend><div>{supportTopics.filter(topic => topic !== 'I’m not sure yet').map(topic => <label key={topic}><input type="checkbox" name="matches" value={topic} />{topic}</label>)}</div></fieldset><button disabled={busy}>Add consultant</button></form>
        <form className="admin-form-card" onSubmit={event => save(event, 'slot')}><h3>Publish appointment</h3><label>Consultant<select name="listener" required><option value="">Select consultant</option>{listeners.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label><label>Start<input name="starts" type="datetime-local" required /></label><label>End<input name="ends" type="datetime-local" required /></label><button disabled={busy}>Publish time</button></form>
        <form className="admin-form-card" onSubmit={event => save(event, 'rate')}><h3>Customer rate</h3><label>Customer<select name="customer" required><option value="">Select customer</option>{users.filter(person => person.first_name).map(person => <option key={person.user_id} value={person.user_id}>{nameFor(person)} ({person.email})</option>)}</select></label><label>Price per appointment (AUD)<input name="amount" type="number" min="1" step="0.01" required /></label><button disabled={busy}>Save customer rate</button><button type="button" className="admin-secondary" disabled={busy} onClick={async event => { const id = new FormData(event.currentTarget.form!).get('customer'); if (!id) { setMessage('Select a customer first.'); return } setBusy(true); try { const { error } = await getSupabase().from('customer_rates').delete().eq('user_id', id); if (error) throw error; setMessage('Customer now uses standard pricing.') } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) } }}>Remove override</button></form>
        <form className="admin-form-card" onSubmit={event => save(event, 'default')}><h3>Default rates</h3><label>Session<select name="code"><option value="intro">Introductory (30 minutes)</option><option value="standard">Standard (50 minutes)</option><option value="extended">Extended (2 hours)</option></select></label><label>Price (AUD)<input name="amount" type="number" min="1" step="0.01" required /></label><button disabled={busy}>Update rate</button></form>
      </div><h3 className="admin-subheading">Published upcoming times</h3><div className="admin-table"><table><thead><tr><th>Consultant</th><th>Start</th><th>End</th><th>Availability</th></tr></thead><tbody>{slots.map(slot => <tr key={slot.id}><td>{listenerById.get(slot.listener_id)?.name}</td><td>{new Date(slot.starts_at).toLocaleString('en-AU')}</td><td>{new Date(slot.ends_at).toLocaleTimeString('en-AU')}</td><td><button disabled={busy} onClick={async () => { setBusy(true); try { const { error } = await getSupabase().from('availability').update({ enabled: !slot.enabled }).eq('id', slot.id); if (error) throw error; setRefresh(value => value + 1) } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) } }}>{slot.enabled ? 'Disable' : 'Enable'}</button></td></tr>)}</tbody></table></div></section>}
      {view === 'audit' && <section className="admin-section"><div className="admin-section-heading"><div><h2>Role and profile audit history</h2><p>Recent listener profile, approval and availability changes.</p></div><span>{audit.length} events</span></div><div className="admin-table"><table><thead><tr><th>When</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>{audit.map(entry => <tr key={entry.id}><td>{when(entry.created_at)}</td><td><strong>{entry.action.replaceAll('.', ' ')}</strong></td><td>{entry.target_type}<small>{entry.target_id}</small></td><td>{JSON.stringify(entry.details)}</td></tr>)}</tbody></table>{!audit.length && <p className="admin-empty">No audited role changes yet.</p>}</div></section>}
    </>}
  </section>
}

export default AdminPage
