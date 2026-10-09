import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, CalendarDays, Clock3, Search, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { errorMessage, getSupabase, money, type Appointment, type Listener, type Slot } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import { supportTopics } from '../../lib/intake'
import './AdminPage.css'
import AdminAvailabilityCalendar from './AdminAvailabilityCalendar'

type AdminView = 'bookings' | 'users' | 'availability' | 'management' | 'audit'
type UserRoleFilter = 'all' | 'admin' | 'listener' | 'user'
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
const auditLabel = (value: string) => value
  .replaceAll('.', ' ')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, letter => letter.toUpperCase())
const shortId = (value: string) => value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value

const auditDetailSummary = (details: Record<string, unknown> | null) => {
  if (!details) return ''
  const identityFields = new Set(['actor_user_id', 'actor_name', 'actor_email', 'target_id', 'target_user_id', 'target_listener_id', 'user_id', 'listener_id', 'email', 'user_email', 'target_email', 'name', 'target_name', 'listener_name'])
  return Object.entries(details)
    .filter(([key, value]) => !identityFields.has(key) && ['string', 'number', 'boolean'].includes(typeof value))
    .slice(0, 3)
    .map(([key, value]) => `${auditLabel(key)}: ${typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}`)
    .join(' · ')
}

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
  const [roleBusy, setRoleBusy] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('all')
  const [managementListenerId, setManagementListenerId] = useState('')
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
      const loadedListeners = results[0].data as Listener[]
      setListeners(loadedListeners)
      setManagementListenerId(current => loadedListeners.some(listener => listener.id === current) ? current : loadedListeners[0]?.id || '')
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
  const managementListener = listenerById.get(managementListenerId) || listeners[0]
  const auditIdentity = (entry: AuditEntry, kind: 'actor' | 'target') => {
    const details = entry.details || {}
    const detailString = (...keys: string[]) => keys.map(key => details[key]).find(value => typeof value === 'string' && value) as string | undefined
    if (kind === 'actor') {
      if (!entry.actor_user_id) return { name: 'System', detail: 'Automated action' }
      const savedName = detailString('actor_name')
      const savedEmail = detailString('actor_email')
      if (savedName || savedEmail) return { name: savedName || savedEmail!, detail: savedEmail || shortId(entry.actor_user_id) }
      const actor = userById.get(entry.actor_user_id)
      if (actor) return { name: nameFor(actor), detail: actor.email }
      if (entry.actor_user_id === userId) return { name: session?.user.user_metadata?.full_name || session?.user.email || 'Current administrator', detail: session?.user.email || shortId(entry.actor_user_id) }
      return { name: 'Unknown administrator', detail: shortId(entry.actor_user_id) }
    }

    const savedName = detailString('target_name')
    const savedEmail = detailString('target_email')
    if (savedName || savedEmail) return { name: savedName || savedEmail!, detail: savedEmail || auditLabel(entry.target_type) }
    const targetUserId = detailString('target_user_id', 'user_id')
    const listenerId = detailString('target_listener_id', 'listener_id')
    const person = userById.get(entry.target_id) || (targetUserId ? userById.get(targetUserId) : undefined)
    if (person) return { name: nameFor(person), detail: person.email }
    const listener = listenerById.get(entry.target_id) || (listenerId ? listenerById.get(listenerId) : undefined)
    if (listener) return { name: listener.name, detail: 'Listener' }
    const suppliedName = detailString('target_name', 'listener_name', 'name')
    const suppliedEmail = detailString('target_email', 'user_email', 'email')
    if (suppliedName || suppliedEmail) return { name: suppliedName || suppliedEmail!, detail: suppliedName && suppliedEmail ? suppliedEmail : auditLabel(entry.target_type) }
    return { name: auditLabel(entry.target_type), detail: shortId(entry.target_id) }
  }
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users.filter(user => {
      const role = user.administrator ? 'admin' : user.listener_name ? 'listener' : 'user'
      const matchesRole = roleFilter === 'all' || role === roleFilter
      const matchesSearch = !term || [user.email, user.first_name, user.last_name, user.preferred_name, user.mobile, user.listener_name].some(value => value?.toLowerCase().includes(term))
      return matchesRole && matchesSearch
    })
  }, [roleFilter, search, users])
  const roleCounts = useMemo(() => ({
    all: users.length,
    admin: users.filter(user => user.administrator).length,
    listener: users.filter(user => !user.administrator && Boolean(user.listener_name)).length,
    user: users.filter(user => !user.administrator && !user.listener_name).length,
  }), [users])
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
  const adminNavItems = [
    { id: 'bookings' as const, label: 'Bookings', icon: CalendarDays },
    { id: 'users' as const, label: 'Users', icon: UsersRound },
    { id: 'availability' as const, label: 'Availability', icon: Clock3 },
    { id: 'management' as const, label: 'Management', icon: UserRound },
    { id: 'audit' as const, label: 'Audit history', icon: ShieldCheck },
  ]

  const changeUserRole = async (person: AdminUser) => {
    const nextRole = person.listener_name ? 'user' : 'listener'
    if (nextRole === 'user' && !window.confirm(`Return ${nameFor(person)} to a regular user account? Their listener profile will be suspended and they will lose listener dashboard access.`)) return
    setRoleBusy(person.user_id); setMessage('')
    try {
      const { error } = await getSupabase().rpc('admin_set_user_role', { p_user: person.user_id, p_role: nextRole })
      if (error) throw error
      setMessage(nextRole === 'listener' ? `${nameFor(person)} is now a listener. Their public profile will appear once they complete and save it.` : `${nameFor(person)} is now a regular user.`)
      setRefresh(value => value + 1)
    } catch (error) { setMessage(errorMessage(error)) } finally { setRoleBusy(null) }
  }

  const saveListenerProfile = async (event: FormEvent<HTMLFormElement>, listenerId: string) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setMessage('')
    try {
      const languages = String(data.get('languages')).split(',').map(value => value.trim()).filter(Boolean)
      const matches = data.getAll('matches').map(String)
      const { error } = await getSupabase().rpc('admin_update_listener_profile', {
        p_listener: listenerId,
        p_name: String(data.get('name')),
        p_focus: String(data.get('focus')),
        p_bio: String(data.get('bio')),
        p_gender: String(data.get('gender')),
        p_pronouns: String(data.get('pronouns')),
        p_languages: languages,
        p_matches: matches,
        p_profile_image_url: String(data.get('image')),
      })
      if (error) throw error
      setMessage('Listener profile updated. Published profiles are updated on the public listener page.')
      setRefresh(value => value + 1)
    } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) }
  }

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
        result = await client.rpc('admin_create_availability', { p_listener: values.get('listener'), p_starts: starts.toISOString(), p_ends: ends.toISOString() })
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
    <header className="admin-hero"><div><span><ShieldCheck size={17} /> Restricted administrator area</span><h1>Admin dashboard</h1><p>Review customers, consultants, bookings and the context shared before each session.</p></div></header>
    {message && <p role="status" className={'admin-notice' + (!allowed ? ' admin-error' : '')}>{message}</p>}
    {allowed && <div className="admin-dashboard-layout">
      <aside className="admin-dashboard-sidebar" aria-label="Admin navigation">
        <div className="admin-dashboard-sidebar-heading"><span>Admin workspace</span><strong>Dashboard</strong></div>
        <nav>{adminNavItems.map(item => { const Icon = item.icon; return <button key={item.id} type="button" className={view === item.id ? 'active' : ''} aria-pressed={view === item.id} onClick={() => { setView(item.id); setSearch(''); setRoleFilter('all') }}><Icon />{item.label}</button> })}</nav>
        <a href="/account"><ArrowLeft />My account</a>
      </aside>
      <div className="admin-dashboard-main">
      <section className="admin-stats" aria-label="Dashboard summary">
        <article><UsersRound /><div><strong>{users.length}</strong><span>Total accounts</span></div></article>
        <article><CalendarDays /><div><strong>{bookings.length}</strong><span>All bookings</span></div></article>
        <article><ShieldCheck /><div><strong>{confirmed}</strong><span>Confirmed bookings</span></div></article>
        <article><Clock3 /><div><strong>{upcoming}</strong><span>Upcoming sessions</span></div></article>
      </section>
      {view === 'bookings' && <section className="admin-section"><div className="admin-section-heading"><div><h2>Bookings and consultants</h2><p>Every reservation is matched to its customer and assigned consultant.</p></div><div className="admin-section-tools"><label className="admin-search"><Search size={17} /><span className="sr-only">Search</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search bookings" /></label><span>{filteredBookings.length} shown</span></div></div>
        <div className="admin-table"><table><thead><tr><th>Customer</th><th>Consultant</th><th>Appointment</th><th>Questionnaire context</th><th>Payment</th><th>Status</th></tr></thead><tbody>{filteredBookings.map(booking => {
          const person = userById.get(booking.user_id); const intake = intakes.find(item => item.user_id === booking.user_id && item.selected_slot_id === booking.slot_id)
          return <tr key={booking.id}><td><strong>{nameFor(person)}</strong><small>{person?.email || booking.user_id}</small><small>{person?.mobile || 'No mobile saved'}</small></td><td><strong>{listenerById.get(booking.listener_id)?.name || 'Unassigned'}</strong></td><td>{new Date(booking.starts_at).toLocaleString('en-AU')}<small>{Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000)} minutes</small></td><td>{intake ? <><strong>{intake.questionnaire_type === 'long' ? `K10 ${intake.k10_score}/50` : `K6 ${intake.k6_score}/24`}</strong><small>{intake.topics.join(', ')}</small>{intake.listener_note && <small>Note: {intake.listener_note}</small>}</> : <small>No intake saved</small>}</td><td>{money(booking.amount_cents)}<small>{booking.rate_code}</small></td><td><span className={'admin-status ' + booking.status}>{booking.status}</span></td></tr>
        })}</tbody></table>{!filteredBookings.length && <p className="admin-empty">No bookings match your search.</p>}</div>
      </section>}

      {view === 'users' && <section className="admin-section"><div className="admin-section-heading"><div><h2>User directory</h2><p>View account status and manage listener access without opening every profile.</p></div><div className="admin-section-tools"><label className="admin-search"><Search size={17} /><span className="sr-only">Search</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search users" /></label><span>{filteredUsers.length} shown</span></div></div>
        <div className="admin-role-filters" role="group" aria-label="Filter users by role">{(['all', 'admin', 'listener', 'user'] as UserRoleFilter[]).map(role => <button type="button" key={role} className={roleFilter === role ? 'active' : ''} aria-pressed={roleFilter === role} onClick={() => setRoleFilter(role)}><span>{role === 'all' ? 'All accounts' : role === 'admin' ? 'Admins' : role === 'listener' ? 'Listeners' : 'Users'}</span><strong>{roleCounts[role]}</strong></button>)}</div>
        <div className="admin-user-list">{filteredUsers.map(person => {
          const role = person.administrator ? 'admin' : person.listener_name ? 'listener' : 'user'
          return <article className="admin-user-row" key={person.user_id}>
            <div className="admin-user-title"><div className="admin-avatar"><UserRound /></div><div><h3>{nameFor(person)}</h3><p>{person.email}</p></div></div>
            <span className={`admin-role-badge ${role}`}>{role}</span>
            <div className="admin-user-summary"><span><strong>{person.confirmed_booking_count}</strong> confirmed</span><span>Last seen <strong>{when(person.last_sign_in_at)}</strong></span></div>
            <div className="admin-role-action">{person.administrator ? <small>Administrator access is managed separately</small> : <button type="button" disabled={roleBusy !== null} className={role === 'listener' ? 'admin-secondary' : ''} onClick={() => void changeUserRole(person)}>{roleBusy === person.user_id ? 'Updating…' : role === 'listener' ? 'Return to user' : 'Make listener'}</button>}</div>
            <details><summary>View profile details</summary><dl><div><dt>Preferred name</dt><dd>{person.preferred_name || '—'}</dd></div><div><dt>Mobile</dt><dd>{person.mobile || '—'}</dd></div><div><dt>Date of birth</dt><dd>{person.date_of_birth ? new Date(`${person.date_of_birth}T12:00:00`).toLocaleDateString('en-AU') : '—'}</dd></div><div><dt>Gender</dt><dd>{person.gender || '—'}</dd></div><div><dt>Bookings</dt><dd>{person.confirmed_booking_count} confirmed / {person.booking_count} total</dd></div><div><dt>Next session</dt><dd>{when(person.next_booking_at)}</dd></div><div><dt>Account created</dt><dd>{when(person.account_created_at)}</dd></div><div><dt>Email status</dt><dd>{person.email_confirmed_at ? 'Confirmed' : 'Not confirmed'}</dd></div>{person.listener_name && <div><dt>Listener profile</dt><dd>{person.listener_name}</dd></div>}</dl></details>
          </article>
        })}{!filteredUsers.length && <p className="admin-empty">No users match this filter.</p>}</div>
      </section>}

      {view === 'availability' && <section className="admin-section admin-availability-section"><div className="admin-section-heading"><div><h2>Availability</h2><p>Manage listener appointment windows · {Intl.DateTimeFormat().resolvedOptions().timeZone} time</p></div></div>
        <form className="admin-publish-form" onSubmit={event => save(event, 'slot')}>
          <div className="admin-publish-intro"><span>Quick action</span><h3>Add an appointment window</h3></div>
          <label>Listener<select name="listener" required><option value="">Select listener</option>{listeners.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
          <label>Starts<input name="starts" type="datetime-local" required /></label>
          <label>Ends<input name="ends" type="datetime-local" required /></label>
          <button disabled={busy}>Add time</button>
        </form>
        <AdminAvailabilityCalendar listeners={listeners} slots={slots} busy={busy} setBusy={setBusy} setMessage={setMessage} refresh={() => setRefresh(value => value + 1)} />
      </section>}

      {view === 'management' && <section className="admin-section admin-management-section"><div className="admin-section-heading"><div><h2>Listener management</h2><p>Select a listener to review their public profile and manage their account.</p></div><span>{listeners.length} {listeners.length === 1 ? 'listener' : 'listeners'}</span></div>
        <div className="admin-management-layout">
          <aside className="admin-management-sidebar">
            <div className="admin-management-sidebar-heading"><span>Listener directory</span><strong>Profiles</strong></div>
            <nav aria-label="Choose a listener">{listeners.map(person => <button type="button" key={person.id} className={managementListener?.id === person.id ? 'active' : ''} aria-pressed={managementListener?.id === person.id} onClick={() => setManagementListenerId(person.id)}><span>{person.name}</span><small>{person.focus}</small><i className={person.profile_status === 'published' && person.active !== false ? 'live' : ''}>{person.profile_status === 'published' && person.active !== false ? 'Live' : person.profile_status || 'Draft'}</i></button>)}</nav>
            {!listeners.length && <p className="admin-management-empty">No listener profiles yet.</p>}
            <details className="admin-sidebar-pricing"><summary><span><small>Pricing</small><strong>Session rates</strong></span></summary><form className="admin-form-card" onSubmit={event => save(event, 'default')}><label>Session<select name="code"><option value="intro">Introductory (30 minutes)</option><option value="standard">Standard (50 minutes)</option><option value="extended">Extended (2 hours)</option></select></label><label>Price (AUD)<input name="amount" type="number" min="1" step="0.01" required /></label><button disabled={busy}>Update rate</button></form></details>
          </aside>
          <div className="admin-management-detail">{managementListener ? <article className="admin-listener-detail" key={managementListener.id}>
            <header><div className="admin-user-title"><div className="admin-avatar"><UserRound /></div><div><span>Listener profile</span><h3>{managementListener.name}</h3><p>{managementListener.focus}</p></div></div><div className="admin-listener-state"><span className={managementListener.profile_status === 'published' && managementListener.active !== false ? 'live' : ''}>{managementListener.profile_status || 'draft'}</span>{managementListener.active === false && <span className="inactive">Inactive</span>}</div></header>
            <div className="admin-listener-detail-grid"><section><span>About</span><p>{managementListener.bio || 'This listener has not written a public biography yet.'}</p></section><dl><div><dt>Languages</dt><dd>{managementListener.languages?.join(', ') || 'Not added'}</dd></div><div><dt>Pronouns</dt><dd>{managementListener.pronouns || 'Not added'}</dd></div><div><dt>Gender</dt><dd>{managementListener.gender || 'Not added'}</dd></div><div><dt>Visibility</dt><dd>{managementListener.profile_status === 'published' && managementListener.active !== false ? 'Publicly visible' : 'Not currently public'}</dd></div></dl></div>
            <section className="admin-listener-topics"><span>Supported topics</span><div>{managementListener.matches.map(topic => <small key={topic}>{topic}</small>)}</div></section>
            <div className="admin-listener-detail-actions"><small>{managementListener.profile_status === 'published' && managementListener.active !== false ? 'This profile is live on the listener page.' : 'This profile is hidden from the listener page.'}</small>{managementListener.profile_status === 'suspended' || managementListener.active === false ? <button disabled={busy} onClick={async () => { setBusy(true); try { const { error } = await getSupabase().rpc('admin_set_listener_status', { p_listener: managementListener.id, p_status: 'published' }); if (error) throw error; setMessage(`${managementListener.name}'s profile is active again.`); setRefresh(value => value + 1) } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) } }}>Reactivate</button> : <button disabled={busy} className="admin-secondary" onClick={async () => { setBusy(true); try { const { error } = await getSupabase().rpc('admin_set_listener_status', { p_listener: managementListener.id, p_status: 'suspended' }); if (error) throw error; setMessage(`${managementListener.name}'s profile is suspended.`); setRefresh(value => value + 1) } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) } }}>Suspend</button>}</div>
            <details className="admin-listener-editor"><summary>Edit public profile</summary><form className="admin-form-card" onSubmit={event => void saveListenerProfile(event, managementListener.id)}><label>Display name<input name="name" defaultValue={managementListener.name} maxLength={100} required /></label><label>Role or focus<input name="focus" defaultValue={managementListener.focus} maxLength={200} required /></label><label>About<textarea name="bio" defaultValue={managementListener.bio || ''} maxLength={2000} rows={5} required /></label><label>Gender<select name="gender" defaultValue={managementListener.gender || ''}><option value="">Prefer not to say</option><option>Woman</option><option>Man</option><option>Non-binary or another gender</option></select></label><label>Pronouns<input name="pronouns" defaultValue={managementListener.pronouns || ''} /></label><label>Languages, separated by commas<input name="languages" defaultValue={managementListener.languages?.join(', ') || ''} required /></label><label>Profile image URL<input name="image" type="url" defaultValue={managementListener.profile_image_url || ''} /></label><fieldset className="admin-topic-fieldset"><legend>Supported topics</legend><div>{supportTopics.filter(topic => topic !== 'I’m not sure yet').map(topic => <label key={topic}><input type="checkbox" name="matches" value={topic} defaultChecked={managementListener.matches.includes(topic)} />{topic}</label>)}</div></fieldset><button disabled={busy}>Save profile</button></form></details>
          </article> : <div className="admin-management-placeholder"><UserRound /><h3>Select a listener</h3><p>Choose a name from the directory to view their profile.</p></div>}</div>
        </div>
      </section>}
      {view === 'audit' && <section className="admin-section"><div className="admin-section-heading"><div><h2>Audit history</h2><p>See what changed, who it affected, who made the change and when it happened.</p></div><span>{audit.length} events</span></div><div className="admin-table admin-audit-table"><table><thead><tr><th>Action taken</th><th>On who</th><th>By who</th><th>Time</th></tr></thead><tbody>{audit.map(entry => {
        const target = auditIdentity(entry, 'target')
        const actor = auditIdentity(entry, 'actor')
        const detail = auditDetailSummary(entry.details)
        return <tr key={entry.id}>
          <td><div className="admin-audit-action"><strong>{auditLabel(entry.action)}</strong>{detail && <small>{detail}</small>}<span>{auditLabel(entry.target_type)}</span></div></td>
          <td><div className="admin-audit-identity"><strong>{target.name}</strong><small>{target.detail}</small></div></td>
          <td><div className="admin-audit-identity"><strong>{actor.name}</strong><small>{actor.detail}</small></div></td>
          <td><time className="admin-audit-time" dateTime={entry.created_at}>{when(entry.created_at)}</time></td>
        </tr>
      })}</tbody></table>{!audit.length && <p className="admin-empty">No audited changes yet.</p>}</div></section>}
      </div>
    </div>}
  </section>
}

export default AdminPage
