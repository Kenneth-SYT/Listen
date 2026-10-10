import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import { errorMessage, getSupabase, type Appointment, type Listener } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import './AdminPage.css'
import AdminAuditSection from './AdminAuditSection'
import AdminAvailabilitySection from './AdminAvailabilitySection'
import AdminBookingsSection from './AdminBookingsSection'
import AdminDashboardSidebar from './AdminDashboardSidebar'
import AdminManagementSection from './AdminManagementSection'
import AdminStats from './AdminStats'
import type { AdminSlot, AdminUser, AdminView, AuditEntry, Intake, UserRoleFilter } from './adminTypes'
import { auditLabel, nameFor, shortId } from './adminUtils'
import AdminUsersSection from './AdminUsersSection'

function AdminPage() {
  const { session, loading } = useSession()
  const [allowed, setAllowed] = useState(false)
  const [view, setView] = useState<AdminView>('users')
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

  const setListenerStatus = async (listener: Listener, status: 'published' | 'suspended') => {
    setBusy(true); setMessage('')
    try {
      const { error } = await getSupabase().rpc('admin_set_listener_status', { p_listener: listener.id, p_status: status })
      if (error) throw error
      setMessage(status === 'published' ? `${listener.name}'s profile is active again.` : `${listener.name}'s profile is suspended.`)
      setRefresh(value => value + 1)
    } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) }
  }

  const save = async (event: FormEvent<HTMLFormElement>, kind: 'listener' | 'slot' | 'rate' | 'default'): Promise<boolean> => {
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
      form.reset(); setMessage('Saved successfully.'); setRefresh(value => value + 1); return true
    } catch (error) { setMessage(errorMessage(error)); return false } finally { setBusy(false) }
  }

  if (loading) return <p role="status" className="admin-state">Checking your account…</p>
  if (!session) return <LoginPage />
  return <section className="admin-page">
    <header className="admin-hero"><div><span><ShieldCheck size={17} /> Restricted administrator area</span><h1>Admin dashboard</h1><p>Review customers, consultants, bookings and the context shared before each session.</p></div></header>
    {message && <p role="status" className={'admin-notice' + (!allowed ? ' admin-error' : '')}>{message}</p>}
    {allowed && <div className="admin-dashboard-layout">
      <AdminDashboardSidebar activeView={view} onChange={nextView => { setView(nextView); setSearch(''); setRoleFilter('all') }} />
      <div className="admin-dashboard-main">
      <AdminStats accounts={users.length} bookings={bookings.length} confirmed={confirmed} upcoming={upcoming} />
      {view === 'bookings' && <AdminBookingsSection bookings={filteredBookings} intakes={intakes} listeners={listenerById} users={userById} search={search} onSearch={setSearch} />}

      {view === 'users' && <AdminUsersSection users={filteredUsers} search={search} roleFilter={roleFilter} roleCounts={roleCounts} roleBusy={roleBusy} onSearch={setSearch} onRoleFilter={setRoleFilter} onChangeRole={person => void changeUserRole(person)} />}

      {view === 'availability' && <AdminAvailabilitySection listeners={listeners} slots={slots} busy={busy} onAddWindow={event => save(event, 'slot')} setBusy={setBusy} setMessage={setMessage} refresh={() => setRefresh(value => value + 1)} />}

      {view === 'management' && <AdminManagementSection listeners={listeners} selectedListener={managementListener} busy={busy} onSelect={setManagementListenerId} onSaveRate={event => save(event, 'default')} onSaveProfile={(event, listenerId) => void saveListenerProfile(event, listenerId)} onSetStatus={(listener, status) => void setListenerStatus(listener, status)} />}
      {view === 'audit' && <AdminAuditSection entries={audit} identify={auditIdentity} />}
      </div>
    </div>}
  </section>
}

export default AdminPage
